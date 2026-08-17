import { useRef, useState } from "react";
import { Link } from "wouter";
import { AlertCircle, ArrowLeft, CheckCircle2, FileText, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { completedUpload, finalizingUpload, getUploadError, initialUploadState, preparingUpload, uploadFailure, uploadProgress } from "@/lib/fileUploadState";
import { runFileUploadWorkflow } from "@/lib/fileUploadWorkflow";

function uploadWithProgress(uploadUrl: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl, true);
    request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("Network error while uploading to object storage"));
    request.onabort = () => reject(new Error("Upload cancelled"));
    request.onload = () => request.status >= 200 && request.status < 300
      ? resolve()
      : reject(new Error(`Object storage rejected upload (${request.status})`));
    request.send(file);
  });
}

export default function Files() {
  const inputRef = useRef<HTMLInputElement>(null);
  const files = trpc.files.list.useQuery({ limit: 100 });
  const utils = trpc.useUtils();
  const prepareUpload = trpc.files.prepareUpload.useMutation();
  const completeUpload = trpc.files.completeUpload.useMutation();
  const [dragging, setDragging] = useState(false);
  const [uploadState, setUploadState] = useState(initialUploadState);
  const isUploading = ["preparing", "uploading", "finalizing"].includes(uploadState.stage);

  const handleFile = async (file: File | undefined) => {
    if (!file || isUploading) return;
    if (file.size > 8_000_000) {
      const error = "File exceeds the 8 MB limit.";
      setUploadState(uploadFailure(file.name, error));
      toast.error(error);
      return;
    }

    try {
      await runFileUploadWorkflow({
        file,
        prepare: () => prepareUpload.mutateAsync({ fileName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size }),
        transfer: (prepared) => uploadWithProgress(prepared.uploadUrl, file, (progress) => setUploadState(uploadProgress(file.name, progress))),
        complete: async (prepared) => { await completeUpload.mutateAsync({ objectKey: prepared.key, objectUrl: prepared.objectUrl, fileName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size }); },
        onPreparing: () => setUploadState(preparingUpload(file.name)),
        onUploading: () => setUploadState(uploadProgress(file.name, 0)),
        onFinalizing: () => setUploadState(finalizingUpload(file.name)),
      });
      await utils.files.list.invalidate();
      setUploadState(completedUpload(file.name));
      toast.success("File uploaded and recorded");
    } catch (error) {
      const message = getUploadError(error);
      setUploadState(uploadFailure(file.name, message));
      toast.error(message);
    }
  };

  const uploadLabel = uploadState.stage === "preparing" ? "Preparing secure upload…"
    : uploadState.stage === "uploading" ? `Uploading ${uploadState.progress}%`
      : uploadState.stage === "finalizing" ? "Saving file metadata…"
        : "Drop a file here or choose one";

  return <div className="feature-page">
    <header className="feature-header"><div><p className="eyebrow"><span className="eyebrow-line" /> S3 file storage</p><h1>Files</h1><p>Files transfer directly to object storage after the server grants a one-time upload URL. Only metadata is persisted in the database.</p></div><Link href="/" className="back-link"><ArrowLeft size={15} /> Overview</Link></header>
    <article className={`panel upload-dropzone ${dragging ? "is-dragging" : ""} ${uploadState.stage === "error" ? "has-error" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFile(event.dataTransfer.files[0]); }}>
      {uploadState.stage === "success" ? <CheckCircle2 size={24} /> : uploadState.stage === "error" ? <AlertCircle size={24} /> : <UploadCloud size={24} />}
      <strong>{uploadLabel}</strong>
      <span>{uploadState.fileName || "Maximum 8 MB. Authentication is required."}</span>
      {isUploading && <div className="upload-progress" aria-label={`Upload ${uploadState.progress}%`}><i style={{ width: `${uploadState.progress}%` }} /></div>}
      {uploadState.stage === "error" && <div className="upload-error"><strong>Upload failed.</strong><span>{uploadState.error}</span><button className="bare-button" onClick={() => { setUploadState(initialUploadState); inputRef.current?.click(); }}>Choose another file</button></div>}
      {uploadState.stage !== "error" && <button className="power-button" disabled={isUploading} onClick={() => inputRef.current?.click()}>{isUploading ? <Loader2 className="spin" size={15} /> : <UploadCloud size={15} />} Select file</button>}
      <input ref={inputRef} hidden type="file" onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
    </article>
    <article className="panel activity-page-card">
      <div className="section-header"><div><p className="panel-kicker">Database metadata</p><h2>Your files</h2></div><FileText size={19} className="calendar-symbol" /></div>
      {files.isLoading && <div className="connection-empty process-empty"><Loader2 className="spin" size={17} /><strong>Loading file metadata…</strong></div>}
      {files.error && <div className="connection-empty process-empty"><strong>File list unavailable.</strong><span>{getUploadError(files.error)}</span></div>}
      {!files.isLoading && !files.error && files.data?.length === 0 && <div className="connection-empty process-empty"><strong>No files stored.</strong><span>Uploaded files appear only after both object transfer and metadata completion succeed.</span></div>}
      {!files.isLoading && !files.error && !!files.data?.length && <div className="activity-list">{files.data.map((file) => <div className="activity-row" key={file.id}><span className="activity-icon mint"><FileText size={15} /></span><div className="activity-copy"><strong>{file.fileName}</strong><span>{file.mimeType} · {Math.round(file.sizeBytes / 1024)} KB</span></div><a className="back-link" href={file.objectUrl} target="_blank" rel="noreferrer">Open</a></div>)}</div>}
    </article>
  </div>;
}
