import React, { useMemo, useState } from "react";
import { CalendarPlus, Check, CircleAlert, ClipboardPlus, Inbox, Laptop, Loader2, Server, ShieldAlert, Trash2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import "./dailyFocusActions.css";

type InboxMessage = { id: string; sender: string | null; subject: string | null; receivedAt: string | null; isRead: boolean; bodyExcerpt: string | null };
type CalendarEvent = { id: string; summary: string; start: string; organizerSelf: boolean };

function formatDate(value: string | Date | null) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Unavailable";
}

function proposalCopy(raw: string | null) {
  if (!raw) return null;
  try {
    const proposal = JSON.parse(raw) as { kind?: string; title?: string; messages?: Array<unknown>; start?: string; end?: string; due?: string | null };
    if (proposal.kind === "gmail.trash") return `Move ${proposal.messages?.length ?? 0} selected message(s) to Trash`;
    if (proposal.kind === "task.create") return `Create task: ${proposal.title || "Untitled"}${proposal.due ? ` · due ${formatDate(proposal.due)}` : ""}`;
    if (proposal.kind === "calendar.create") return `Create event: ${proposal.title || "Untitled"} · ${formatDate(proposal.start || null)} to ${formatDate(proposal.end || null)}`;
    if (proposal.kind === "calendar.delete") return `Delete event: ${proposal.title || "Untitled"} · ${formatDate(proposal.start || null)}`;
  } catch {
    return "Proposal could not be rendered.";
  }
  return "Proposal is ready for review.";
}

function actionErrorCopy(code: string) {
  if (code === "reasoner_provider_limited") return "The selected local provider has no available quota. Select a provider or model with available access; no Google change was proposed.";
  if (code === "proposal_needs_clarification") return "The proposal needs clearer details before it can be reviewed. No Google change was proposed.";
  if (code === "reasoner_unavailable") return "Local reasoning is unavailable. No Google change was proposed.";
  return `Reason: ${code}`;
}

export function DailyFocusActions({ readInboxMessages = null, calendarEvents }: { readInboxMessages?: InboxMessage[] | null; calendarEvents: CalendarEvent[] | null }) {
  const utils = trpc.useUtils();
  const devices = trpc.companionDevices.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const actions = trpc.dailyFocusActions.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState<"laptop" | "server">("laptop");
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [pairingStatus, setPairingStatus] = useState<"idle" | "pairing" | "paired">("idle");
  const [pairingDeviceId, setPairingDeviceId] = useState<string | null>(null);
  const [actionKind, setActionKind] = useState<"task.create" | "calendar.create">("task.create");
  const [text, setText] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedInboxIds, setSelectedInboxIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeDevices = (devices.data ?? []).filter((device) => device.isDefaultReasoner !== false || device.pendingPairing);
  const selectedDevice = selectedDeviceId || activeDevices.find((device) => device.online)?.deviceId || activeDevices[0]?.deviceId || "";
  const selectedInbox = useMemo(() => (readInboxMessages ?? []).filter((message) => selectedInboxIds.includes(message.id)), [readInboxMessages, selectedInboxIds]);
  const pendingPairingDevices = activeDevices.filter((device) => device.pendingPairing);
  const refresh = () => Promise.all([utils.companionDevices.list.invalidate(), utils.dailyFocusActions.list.invalidate()]);
  const sendPairingToLoopback = (credential: { deviceId: string; deviceSecret: string }) => {
    setPairingStatus("pairing");
    setActionError(null);
    void (async () => {
      const permissions = navigator.permissions as unknown as { query?: (descriptor: { name: "loopback-network" }) => Promise<PermissionStatus> };
      const permission = await permissions.query?.({ name: "loopback-network" }).catch(() => null);
      if (permission?.state === "denied") throw new Error("Browser permission for local network access is denied. Allow it for Mintdesk, then try again.");
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6_000);
      try {
        const init = { method: "POST", mode: "cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credential), signal: controller.signal, targetAddressSpace: "loopback" } as RequestInit & { targetAddressSpace: "loopback" };
        const response = await fetch("http://127.0.0.1:20129/v1/pair", init);
        if (!response.ok) throw new Error("Local companion pairing endpoint was unavailable.");
        setPairingStatus("paired");
        setTimeout(() => { setPairingDeviceId(null); void refresh(); }, 6_000);
      } catch (error) {
        const message = error instanceof DOMException && error.name === "AbortError"
          ? "Local pairing did not reply within six seconds. Check the companion status, then try again."
          : error instanceof Error ? error.message : "Local pairing could not be completed.";
        setPairingStatus("idle");
        setActionError(message);
      } finally {
        window.clearTimeout(timeout);
      }
    })().catch((error) => {
      setPairingStatus("idle");
      setActionError(error instanceof Error ? error.message : "Local pairing could not be completed.");
    });
  };
  const enroll = trpc.companionDevices.enroll.useMutation({ onSuccess: (result) => { setPairingDeviceId(result.deviceId); setPairingStatus("idle"); setDeviceName(""); setShowEnrollment(false); void refresh(); }, onError: (error) => setActionError(error.message) });
  const resumePairing = trpc.companionDevices.resumePairing.useMutation({ onSuccess: sendPairingToLoopback, onError: (error) => { setPairingStatus("idle"); setActionError(error.message); } });
  const requestProposal = trpc.dailyFocusActions.requestProposal.useMutation({ onSuccess: () => { setText(""); setActionError(null); void refresh(); }, onError: (error) => setActionError(error.message) });
  const prepareTrash = trpc.dailyFocusActions.prepareGmailTrash.useMutation({ onSuccess: () => { setSelectedInboxIds([]); setActionError(null); void refresh(); }, onError: (error) => setActionError(error.message) });
  const prepareDelete = trpc.dailyFocusActions.prepareCalendarDelete.useMutation({ onSuccess: () => { setActionError(null); void refresh(); }, onError: (error) => setActionError(error.message) });
  const confirm = trpc.dailyFocusActions.confirm.useMutation({ onSuccess: () => { setActionError(null); void refresh(); }, onError: (error) => { setActionError(error.message); void refresh(); } });
  const reject = trpc.dailyFocusActions.reject.useMutation({ onSuccess: () => { setActionError(null); void refresh(); }, onError: (error) => setActionError(error.message) });

  return <section className="daily-action-panel panel" aria-label="Daily Focus actions">
    <div className="daily-action-heading">
      <div><p className="panel-kicker">Actions, on confirmation</p><h2>Turn intention into a reviewed change</h2><p>Only Daily Focus can create a proposal. No Google change occurs until you confirm its preview.</p></div>
    </div>

    {actionError && <div className="daily-focus-error"><CircleAlert size={18} /><span>{actionError}</span></div>}

    {activeDevices.length > 0 && !showEnrollment && <Button type="button" variant="outline" className="add-device-button" onClick={() => setShowEnrollment(true)}><Laptop size={16} /> Add device</Button>}

    {(activeDevices.length === 0 || showEnrollment) && <div className="action-enrollment">
      <div><strong>{activeDevices.length === 0 ? "Add a reasoning device" : "Add another reasoning device"}</strong><span>Register a Linux laptop or server once. The device secret stays local and is shown only now.</span></div>
      <div className="action-enrollment-controls"><Input value={deviceName} onChange={(event) => setDeviceName(event.target.value)} placeholder="e.g. Mint laptop" maxLength={120} /><select value={deviceType} onChange={(event) => setDeviceType(event.target.value as "laptop" | "server")} aria-label="Device type"><option value="laptop">Linux laptop</option><option value="server">Linux server</option></select><Button type="button" onClick={() => enroll.mutate({ name: deviceName.trim(), deviceType })} disabled={!deviceName.trim() || enroll.isPending}>{enroll.isPending ? <Loader2 className="spin" size={16} /> : deviceType === "server" ? <Server size={16} /> : <Laptop size={16} />} Register</Button>{activeDevices.length > 0 && <Button type="button" variant="outline" onClick={() => { setShowEnrollment(false); setDeviceName(""); }}>Cancel</Button>}</div>
    </div>}

    {pendingPairingDevices.map((device) => <div className="action-credential" key={device.deviceId}><ShieldAlert size={18} /><div><strong>Finish pairing {device.name}.</strong><span>Pairing stays available for ten minutes, even after a reload. The credential is encrypted on the server and is never shown or copied.</span><Button type="button" variant="outline" className="pairing-copy-button" disabled={pairingStatus === "pairing" || pairingStatus === "paired"} onClick={() => { setPairingDeviceId(device.deviceId); resumePairing.mutate({ deviceId: device.deviceId }); }}>{pairingStatus === "pairing" && pairingDeviceId === device.deviceId ? <Loader2 className="spin" size={16} /> : <Laptop size={16} />}{pairingStatus === "paired" && pairingDeviceId === device.deviceId ? "Paired. Restarting companion…" : pairingStatus === "pairing" && pairingDeviceId === device.deviceId ? "Pairing local companion…" : "Pair this browser"}</Button></div></div>)}

    {activeDevices.length > 0 && <>
      <div className="action-device-row"><label htmlFor={activeDevices.length > 1 ? "action-device" : undefined}>Reasoning device</label>{activeDevices.length > 1 ? <select id="action-device" value={selectedDevice} onChange={(event) => setSelectedDeviceId(event.target.value)}>{activeDevices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.name} · {device.deviceType} · {device.online ? "online" : "last seen offline"}</option>)}</select> : <strong className="action-device-static">{activeDevices[0]?.name} · {activeDevices[0]?.deviceType} · {activeDevices[0]?.online ? "online" : "last seen offline"}</strong>}<span>{activeDevices.find((device) => device.deviceId === selectedDevice)?.online ? "Ready to receive a proposal." : "The proposal remains queued until this device is online."}</span></div>
      <div className="action-compose"><div className="action-kind-toggle" role="group" aria-label="Proposal type"><button type="button" className={actionKind === "task.create" ? "is-selected" : ""} onClick={() => setActionKind("task.create")}><ClipboardPlus size={15} /> Task</button><button type="button" className={actionKind === "calendar.create" ? "is-selected" : ""} onClick={() => setActionKind("calendar.create")}><CalendarPlus size={15} /> Event</button></div><Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={actionKind === "task.create" ? "Paste an intention or task. The companion will create a proposal only." : "Paste a message or schedule. Include date, time, and duration for a reviewable event."} maxLength={5_000} /><Button type="button" onClick={() => requestProposal.mutate({ deviceId: selectedDevice, kind: actionKind, text: text.trim() })} disabled={!text.trim() || requestProposal.isPending}>{requestProposal.isPending ? <Loader2 className="spin" size={16} /> : <Check size={16} />} {requestProposal.isPending ? "Requesting" : "Request proposal"}</Button></div>
    </>}

    {readInboxMessages !== null && readInboxMessages.length > 0 && <div className="action-evidence-list"><div><strong>Read inbox cleanup</strong><span>Select read messages for review. This moves messages to Trash, not permanent deletion.</span></div><div className="action-select-list">{readInboxMessages.map((message) => <label key={message.id}><input type="checkbox" checked={selectedInboxIds.includes(message.id)} onChange={(event) => setSelectedInboxIds((current) => event.target.checked ? [...current, message.id] : current.filter((id) => id !== message.id))} /><span><b>{message.subject || "Subject unavailable"}</b><small>{message.sender || "Sender unavailable"} · {formatDate(message.receivedAt)}</small></span></label>)}</div><Button type="button" variant="outline" onClick={() => prepareTrash.mutate({ messages: selectedInbox })} disabled={!selectedInbox.length || prepareTrash.isPending}>{prepareTrash.isPending ? <Loader2 className="spin" size={16} /> : <Inbox size={16} />} Review move to Trash</Button></div>}

    {calendarEvents !== null && calendarEvents.some((event) => event.organizerSelf) && <div className="action-evidence-list"><div><strong>Calendar deletion</strong><span>Only events organized by your connected Google account can be prepared here.</span></div><div className="action-select-list">{calendarEvents.filter((event) => event.organizerSelf).map((event) => <div className="action-record" key={event.id}><span><b>{event.summary}</b><small>{formatDate(event.start)}</small></span><Button type="button" variant="outline" onClick={() => prepareDelete.mutate({ calendarId: "primary", eventId: event.id, title: event.summary, start: new Date(event.start).toISOString(), organizerSelf: true })} disabled={prepareDelete.isPending}><Trash2 size={15} /> Review deletion</Button></div>)}</div></div>}

    {(actions.data ?? []).length > 0 && <div className="action-history"><strong>Action review</strong>{actions.data?.map((action) => <article key={action.id} className={`action-history-record status-${action.status}`}><div><span className="action-status">{action.status}</span><p>{proposalCopy(action.proposalPayload)}</p><small>{action.errorCode ? actionErrorCopy(action.errorCode) : `Expires ${formatDate(action.expiresAt)}`}</small></div>{action.status === "ready" && <div className="action-history-buttons"><AlertDialog><AlertDialogTrigger asChild><Button type="button"><Check size={15} /> Confirm</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm this Google change?</AlertDialogTitle><AlertDialogDescription>{proposalCopy(action.proposalPayload)}. Mintdesk will execute only this reviewed action.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => confirm.mutate({ actionId: action.id })}>Confirm change</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><Button type="button" variant="outline" onClick={() => reject.mutate({ actionId: action.id })}><X size={15} /> Reject</Button></div>}</article>)}</div>}
  </section>;
}
