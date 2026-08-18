import React, { useMemo, useState } from "react";
import { CalendarPlus, Check, CircleAlert, ClipboardPlus, Inbox, Laptop, Loader2, Server, ShieldAlert, Trash2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import "./dailyFocusActions.css";

type InboxMessage = { id: string; sender: string | null; subject: string | null; receivedAt: string | null };
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

export function DailyFocusActions({ inboxMessages, calendarEvents }: { inboxMessages: InboxMessage[] | null; calendarEvents: CalendarEvent[] | null }) {
  const utils = trpc.useUtils();
  const devices = trpc.companionDevices.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const actions = trpc.dailyFocusActions.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState<"laptop" | "server">("laptop");
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [credential, setCredential] = useState<{ deviceId: string; deviceSecret: string; name: string; deviceType: "laptop" | "server" } | null>(null);
  const [pairingStatus, setPairingStatus] = useState<"idle" | "pairing" | "paired">("idle");
  const [actionKind, setActionKind] = useState<"task.create" | "calendar.create">("task.create");
  const [text, setText] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedInboxIds, setSelectedInboxIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeDevices = devices.data ?? [];
  const selectedDevice = selectedDeviceId || activeDevices.find((device) => device.online)?.deviceId || activeDevices[0]?.deviceId || "";
  const selectedInbox = useMemo(() => (inboxMessages ?? []).filter((message) => selectedInboxIds.includes(message.id)), [inboxMessages, selectedInboxIds]);
  const refresh = () => Promise.all([utils.companionDevices.list.invalidate(), utils.dailyFocusActions.list.invalidate()]);
  const enroll = trpc.companionDevices.enroll.useMutation({ onSuccess: (result) => { setCredential(result); setPairingStatus("idle"); setDeviceName(""); setShowEnrollment(false); void refresh(); }, onError: (error) => setActionError(error.message) });
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

    {credential && <div className="action-credential"><ShieldAlert size={18} /><div><strong>Pair this browser with the local companion.</strong><span>This sends the one-time credential directly to a loopback-only endpoint on this computer. It is not copied to the clipboard or sent back to Mintdesk.</span><Button type="button" variant="outline" className="pairing-copy-button" disabled={pairingStatus === "pairing" || pairingStatus === "paired"} onClick={() => { setPairingStatus("pairing"); setActionError(null); void fetch("http://127.0.0.1:20129/v1/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId: credential.deviceId, deviceSecret: credential.deviceSecret }) }).then(async (response) => { if (!response.ok) throw new Error("Local companion pairing endpoint was unavailable."); setPairingStatus("paired"); setTimeout(() => { setCredential(null); void refresh(); }, 6_000); }).catch(() => { setPairingStatus("idle"); setActionError("Local pairing endpoint is unavailable. Start or update the companion, then try again."); }); }}>{pairingStatus === "pairing" ? <Loader2 className="spin" size={16} /> : <Laptop size={16} />}{pairingStatus === "paired" ? "Paired. Restarting companion…" : pairingStatus === "pairing" ? "Pairing local companion…" : "Pair this browser"}</Button></div><button className="icon-button" aria-label="Dismiss device credential" onClick={() => setCredential(null)}><X size={16} /></button></div>}

    {activeDevices.length > 0 && <>
      <div className="action-device-row"><label htmlFor="action-device">Reasoning device</label><select id="action-device" value={selectedDevice} onChange={(event) => setSelectedDeviceId(event.target.value)}>{activeDevices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.name} · {device.deviceType} · {device.online ? "online" : "last seen offline"}</option>)}</select><span>{activeDevices.find((device) => device.deviceId === selectedDevice)?.online ? "Ready to receive a proposal." : "The proposal remains queued until this device is online."}</span></div>
      <div className="action-compose"><div className="action-kind-toggle" role="group" aria-label="Proposal type"><button type="button" className={actionKind === "task.create" ? "is-selected" : ""} onClick={() => setActionKind("task.create")}><ClipboardPlus size={15} /> Task</button><button type="button" className={actionKind === "calendar.create" ? "is-selected" : ""} onClick={() => setActionKind("calendar.create")}><CalendarPlus size={15} /> Event</button></div><Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={actionKind === "task.create" ? "Paste an intention or task. The companion will create a proposal only." : "Paste a message or schedule. Include date, time, and duration for a reviewable event."} maxLength={5_000} /><Button type="button" onClick={() => requestProposal.mutate({ deviceId: selectedDevice, kind: actionKind, text: text.trim() })} disabled={!text.trim() || requestProposal.isPending}>{requestProposal.isPending ? <Loader2 className="spin" size={16} /> : <Check size={16} />} {requestProposal.isPending ? "Requesting" : "Request proposal"}</Button></div>
    </>}

    {inboxMessages !== null && inboxMessages.length > 0 && <div className="action-evidence-list"><div><strong>Inbox cleanup</strong><span>Select visible metadata only. This moves messages to Trash, not permanent deletion.</span></div><div className="action-select-list">{inboxMessages.map((message) => <label key={message.id}><input type="checkbox" checked={selectedInboxIds.includes(message.id)} onChange={(event) => setSelectedInboxIds((current) => event.target.checked ? [...current, message.id] : current.filter((id) => id !== message.id))} /><span><b>{message.subject || "Subject unavailable"}</b><small>{message.sender || "Sender unavailable"} · {formatDate(message.receivedAt)}</small></span></label>)}</div><Button type="button" variant="outline" onClick={() => prepareTrash.mutate({ messages: selectedInbox })} disabled={!selectedInbox.length || prepareTrash.isPending}>{prepareTrash.isPending ? <Loader2 className="spin" size={16} /> : <Inbox size={16} />} Review move to Trash</Button></div>}

    {calendarEvents !== null && calendarEvents.some((event) => event.organizerSelf) && <div className="action-evidence-list"><div><strong>Calendar deletion</strong><span>Only events organized by your connected Google account can be prepared here.</span></div><div className="action-select-list">{calendarEvents.filter((event) => event.organizerSelf).map((event) => <div className="action-record" key={event.id}><span><b>{event.summary}</b><small>{formatDate(event.start)}</small></span><Button type="button" variant="outline" onClick={() => prepareDelete.mutate({ calendarId: "primary", eventId: event.id, title: event.summary, start: new Date(event.start).toISOString(), organizerSelf: true })} disabled={prepareDelete.isPending}><Trash2 size={15} /> Review deletion</Button></div>)}</div></div>}

    {(actions.data ?? []).length > 0 && <div className="action-history"><strong>Action review</strong>{actions.data?.map((action) => <article key={action.id} className={`action-history-record status-${action.status}`}><div><span className="action-status">{action.status}</span><p>{proposalCopy(action.proposalPayload)}</p><small>{action.errorCode ? actionErrorCopy(action.errorCode) : `Expires ${formatDate(action.expiresAt)}`}</small></div>{action.status === "ready" && <div className="action-history-buttons"><AlertDialog><AlertDialogTrigger asChild><Button type="button"><Check size={15} /> Confirm</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm this Google change?</AlertDialogTitle><AlertDialogDescription>{proposalCopy(action.proposalPayload)}. Mintdesk will execute only this reviewed action.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => confirm.mutate({ actionId: action.id })}>Confirm change</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><Button type="button" variant="outline" onClick={() => reject.mutate({ actionId: action.id })}><X size={15} /> Reject</Button></div>}</article>)}</div>}
  </section>;
}
