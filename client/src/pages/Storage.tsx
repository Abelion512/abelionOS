import { Database, Folder, HardDrive, Loader2, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { bridgeApi, type BridgeWorkdirStorage } from "@/lib/bridge";
import { OnDemandDetail } from "@/components/OnDemandDetail";

const STORAGE_MODAL_PAGE_SIZE = 8;

function formatBytes(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
}

export default function Storage() {
  const [storage, setStorage] = useState<BridgeWorkdirStorage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [entryPage, setEntryPage] = useState(0);

  const refresh = async () => {
    setLoading(true);
    try {
      const next = await bridgeApi.workdirStorage();
      setStorage(next);
      setError(null);
    } catch (reason) {
      setStorage(null);
      setError(reason instanceof Error ? reason.message : "Storage observer is unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);
  const totalModalPages = storage ? Math.max(1, Math.ceil(storage.entries.length / STORAGE_MODAL_PAGE_SIZE)) : 1;
  const currentModalPage = Math.min(entryPage, totalModalPages - 1);
  const entryStart = currentModalPage * STORAGE_MODAL_PAGE_SIZE;
  const modalEntries = storage?.entries.slice(entryStart, entryStart + STORAGE_MODAL_PAGE_SIZE) ?? [];

  return <main className="feature-page storage-page operational-page">
    <header className="operational-header"><h1>Storage</h1><button className="power-button" aria-label="Refresh storage" onClick={() => void refresh()} disabled={loading}>{loading ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />} <span>Refresh</span></button></header>
    {!storage && <article className="panel storage-empty"><HardDrive size={25} /><div><h2>Unavailable</h2><p>{error || "Checking companion"}</p><code>/media/abelion/Isaf/ican/project</code></div></article>}
    {storage && <>
      <section className="storage-summary-grid"><article className="panel storage-metric"><HardDrive size={20} /><p>Mount capacity</p><strong>{storage.capacity.usedPercent ?? "—"}%</strong><span>{formatBytes(storage.capacity.usedBytes)} used of {formatBytes(storage.capacity.totalBytes)}</span></article><article className="panel storage-metric"><Folder size={20} /><p>Observed entries</p><strong>{storage.totalEntryCount}</strong><span>Showing up to {storage.entryLimit} non-hidden entries</span></article><article className="panel storage-metric"><Database size={20} /><p>Free space</p><strong>{formatBytes(storage.capacity.freeBytes)}</strong><span>Scanned {new Date(storage.scannedAt).toLocaleString()}</span></article></section>
      <article className="panel storage-workdir"><div className="section-header"><div><p className="panel-kicker">Allowed directory only</p><h2>{storage.workdir}</h2></div><span className="connection-pill connected">metadata only</span></div><div className="storage-workdir-preview"><div><strong>{storage.totalEntryCount} entries observed</strong><span>{storage.entryLimit} maximum non-hidden entries per scan</span><small>Scanned {new Date(storage.scannedAt).toLocaleString()}</small></div><OnDemandDetail title="Workdir metadata" description={`${storage.workdir} · metadata only`} triggerLabel="Browse entries"><div className="storage-modal-summary"><strong>Showing {storage.entries.length === 0 ? 0 : entryStart + 1}–{Math.min(entryStart + STORAGE_MODAL_PAGE_SIZE, storage.entries.length)} of {storage.entries.length} returned entries</strong><span>{storage.totalEntryCount} entries observed by companion</span></div><div className="storage-entry-list">{modalEntries.map((entry) => <div className="storage-entry" key={entry.name}><Folder size={16} /><div><strong>{entry.name}</strong><span>{entry.kind} · {entry.sizeBytes === null ? "size unavailable" : formatBytes(entry.sizeBytes)}</span></div><time>{new Date(entry.modifiedAt).toLocaleString()}</time></div>)}</div>{storage.entries.length === 0 ? <p className="briefing-empty">No metadata entries returned.</p> : <div className="storage-pagination"><button type="button" onClick={() => setEntryPage((page) => Math.max(0, page - 1))} disabled={currentModalPage === 0}>Previous</button><span>Page {currentModalPage + 1} of {totalModalPages}</span><button type="button" onClick={() => setEntryPage((page) => Math.min(totalModalPages - 1, page + 1))} disabled={currentModalPage === totalModalPages - 1}>Next</button></div>}</OnDemandDetail></div></article>
    </>}
  </main>;
}
