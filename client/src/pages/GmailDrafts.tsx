import React, { useEffect, useState } from "react";
import { ArrowLeft, FilePenLine, Loader2, Pencil, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { joinRecipientList, parseRecipientList } from "@/lib/draftComposer";

type EditorState = { id: string | null; to: string; cc: string; bcc: string; subject: string; body: string };
const blankEditor: EditorState = { id: null, to: "", cc: "", bcc: "", subject: "", body: "" };

export default function GmailDrafts() {
  const utils = trpc.useUtils();
  const drafts = trpc.gmailDrafts.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const detail = trpc.gmailDrafts.get.useQuery({ draftId: selectedDraftId ?? "placeholder" }, { enabled: Boolean(selectedDraftId), refetchOnWindowFocus: false });
  const createDraft = trpc.gmailDrafts.create.useMutation({ onSuccess: () => void utils.gmailDrafts.list.invalidate() });
  const updateDraft = trpc.gmailDrafts.update.useMutation({ onSuccess: () => void utils.gmailDrafts.list.invalidate() });
  const deleteDraft = trpc.gmailDrafts.delete.useMutation({ onSuccess: () => void utils.gmailDrafts.list.invalidate() });
  const [editor, setEditor] = useState<EditorState>(blankEditor);
  const [editorError, setEditorError] = useState<string | null>(null);
  const isMutating = createDraft.isPending || updateDraft.isPending || deleteDraft.isPending;

  const update = (field: keyof EditorState, value: string) => setEditor((current) => ({ ...current, [field]: value }));
  const input = () => ({ to: parseRecipientList(editor.to), cc: parseRecipientList(editor.cc), bcc: parseRecipientList(editor.bcc), subject: editor.subject, body: editor.body, confirmed: true as const });
  const resetEditor = () => { setSelectedDraftId(null); setEditor(blankEditor); setEditorError(null); };

  useEffect(() => {
    if (!detail.data) return;
    setEditor({ id: detail.data.id, to: joinRecipientList(detail.data.to), cc: joinRecipientList(detail.data.cc), bcc: joinRecipientList(detail.data.bcc), subject: detail.data.subject || "", body: detail.data.body || "" });
  }, [detail.data]);

  const save = async () => {
    if (!window.confirm(editor.id ? "Replace this Gmail draft with the current content?" : "Create this Gmail draft?")) return;
    setEditorError(null);
    try {
      if (editor.id) await updateDraft.mutateAsync({ draftId: editor.id, ...input() });
      else await createDraft.mutateAsync(input());
      resetEditor();
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : "The Gmail draft could not be saved.");
    }
  };

  const edit = (draftId: string) => {
    setEditorError(null);
    setSelectedDraftId(draftId);
  };

  const remove = async (draftId: string) => {
    if (!window.confirm("Permanently delete this Gmail draft? This action cannot be undone.")) return;
    try { await deleteDraft.mutateAsync({ draftId, confirmed: true }); } catch (error) { setEditorError(error instanceof Error ? error.message : "The Gmail draft could not be deleted."); }
  };

  return <main className="feature-page drafts-page">
    <header className="feature-header briefing-header"><div><p className="eyebrow"><span className="eyebrow-line" /> Server-backed capability</p><h1>Gmail Drafts</h1><p>Create and manage Gmail drafts through the connected account. Sending is not enabled in Mintdesk.</p></div><div className="briefing-actions"><Link href="/briefing" className="back-link"><ArrowLeft size={15} /> Briefing</Link><button className="power-button" onClick={() => void drafts.refetch()} disabled={drafts.isFetching}><RefreshCw size={16} className={drafts.isFetching ? "spin" : ""} /><span>Refresh</span></button></div></header>

    <section className="drafts-security panel"><ShieldCheck size={19} /><div><strong>Draft lifecycle only.</strong><span>Mintdesk does not expose a send action. Create, replace, and delete each require a local confirmation and write an audit event without storing message content.</span></div></section>
    <section className="drafts-grid">
      <article className="panel drafts-list"><div className="briefing-card-header"><div><p className="panel-kicker">Connected Gmail</p><h2>Existing drafts</h2></div><span className="drafts-count">{drafts.data?.length ?? "—"}</span></div>{drafts.isLoading ? <p className="briefing-empty">Checking Gmail Drafts permission…</p> : drafts.error ? <div className="drafts-error"><strong>Drafts unavailable.</strong><span>{drafts.error.message}</span><Link href="/connections">Reconnect Google Workspace</Link></div> : drafts.data?.length === 0 ? <p className="briefing-empty">No drafts were returned by Gmail.</p> : <div className="drafts-items">{drafts.data?.map((draft) => <article key={draft.id} className="drafts-item"><div><strong>{draft.subject || "Subject unavailable"}</strong><span>To: {draft.to.join(", ") || "Unavailable"}</span></div><div className="drafts-item-actions"><button className="icon-button" aria-label={`Edit ${draft.subject || "draft"}`} onClick={() => edit(draft.id)} disabled={isMutating}><Pencil size={15} /></button><button className="icon-button drafts-delete" aria-label={`Delete ${draft.subject || "draft"}`} onClick={() => void remove(draft.id)} disabled={isMutating}><Trash2 size={15} /></button></div></article>)}</div>}</article>

      <article className="panel drafts-editor"><div className="briefing-card-header"><div><p className="panel-kicker">{editor.id ? "Replace selected draft" : "Create draft"}</p><h2>{editor.id ? "Edit Gmail draft" : "New Gmail draft"}</h2></div><FilePenLine size={20} /></div><p className="briefing-provenance">Recipients and body are sent only to Gmail to create or replace the selected draft. They are not saved in Mintdesk.</p><label>To<input value={editor.to} onChange={(event) => update("to", event.target.value)} placeholder="recipient@example.com" autoComplete="email" /></label><div className="drafts-fields"><label>Cc<input value={editor.cc} onChange={(event) => update("cc", event.target.value)} placeholder="Optional" /></label><label>Bcc<input value={editor.bcc} onChange={(event) => update("bcc", event.target.value)} placeholder="Optional" /></label></div><label>Subject<input value={editor.subject} onChange={(event) => update("subject", event.target.value)} placeholder="Draft subject" /></label><label>Body<textarea value={editor.body} onChange={(event) => update("body", event.target.value)} placeholder="Write the draft body" rows={9} /></label>{editorError && <p className="drafts-error"><strong>Action not completed.</strong><span>{editorError}</span></p>}<div className="drafts-editor-actions"><button className="bare-button" onClick={resetEditor} disabled={isMutating}>Clear</button><button className="power-button" onClick={() => void save()} disabled={isMutating || !editor.to.trim()}>{isMutating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}<span>{editor.id ? "Replace draft" : "Create draft"}</span></button></div></article>
    </section>
  </main>;
}
