import { useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, FileText, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

export default function Files() {
  const inputRef = useRef<HTMLInputElement>(null);
  const files = trpc.files.list.useQuery({ limit: 100 });
  const utils = trpc.useUtils();
  const upload = trpc.files.upload.useMutation({
    onSuccess: async () => { await utils.files.list.invalidate(); toast.success("File uploaded"); },
    onError: (error) => toast.error(error.message),
  });
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 8_000_000) { toast.error("File exceeds the 8 MB limit"); return; }
    try {
      const base64 = await readAsBase64(file);
      upload.mutate({ fileName: file.name, mimeType: file.type || "application/octet-stream", base64, sizeBytes: file.size });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to read file"); }
  };

  return <div className="feature-page">
    <header className="feature-header"><div><p className="eyebrow"><span className="eyebrow-line" /> S3 file storage</p><h1>Files</h1><p>Files are uploaded to object storage and only their metadata is stored in the database. The list is scoped to the authenticated user.</p></div><Link href="/" className="back-link"><ArrowLeft size={15} /> Overview</Link></header>
    <article className={`panel upload-dropzone ${dragging ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFile(event.dataTransfer.files[0]); }}>
      <UploadCloud size={24} />
      <strong>{upload.isPending ? "Uploading…" : "Drop a file here or choose one"}</strong>
      <span>Maximum 8 MB. Upload uses the configured S3 storage helper.</span>
      <button className="power-button" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>{upload.isPending ? <Loader2 className="spin" size={15} /> : <UploadCloud size={15} />} Select file</button>
      <input ref={inputRef} hidden type="file" onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
    </article>
    <article className="panel activity-page-card">
      <div className="section-header"><div><p className="panel-kicker">Database metadata</p><h2>Your files</h2></div><FileText size={19} className="calendar-symbol" /></div>
      {files.isLoading && <div className="connection-empty process-empty"><Loader2 className="spin" size={17} /><strong>Loading file metadata…</strong></div>}
      {files.error && <div className="connection-empty process-empty"><strong>File list unavailable.</strong><span>{files.error.message}</span></div>}
      {!files.isLoading && !files.error && files.data?.length === 0 && <div className="connection-empty process-empty"><strong>No files stored.</strong><span>Uploaded files will appear here after the storage and metadata write both succeed.</span></div>}
      {!files.isLoading && !files.error && !!files.data?.length && <div className="activity-list">{files.data.map((file) => <div className="activity-row" key={file.id}><span className="activity-icon mint"><FileText size={15} /></span><div className="activity-copy"><strong>{file.fileName}</strong><span>{file.mimeType} · {Math.round(file.sizeBytes / 1024)} KB</span></div><a className="back-link" href={file.objectUrl} target="_blank" rel="noreferrer">Open</a></div>)}</div>}
    </article>
  </div>;
}
