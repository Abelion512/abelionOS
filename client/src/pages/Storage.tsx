import { ArrowLeft, Database, Folder, HardDrive, Loader2, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { bridgeApi, type BridgeWorkdirStorage } from "@/lib/bridge";

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

  return <div className="feature-page storage-page">
    <header className="feature-header"><div><p className="eyebrow"><span className="eyebrow-line" /> Local workdir observer</p><h1>Storage</h1><p>Metadata-only view of the explicit Linux workdir. Mintdesk cannot upload, download, edit, or browse beyond this configured directory.</p></div><div className="header-actions"><button className="power-button" aria-label="Refresh storage" onClick={() => void refresh()} disabled={loading}>{loading ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />} <span>Refresh storage</span></button><Link href="/" className="back-link"><ArrowLeft size={15} /> Dashboard</Link></div></header>
    {!storage && <article className="panel storage-empty"><HardDrive size={25} /><div><p className="panel-kicker">Observer state</p><h2>Workdir unavailable</h2><p>{error || "Checking Linux companion…"}</p><code>MINTDESK_WORKDIR=/media/abelion/Isaf/ican/project</code></div></article>}
    {storage && <>
      <section className="storage-summary-grid"><article className="panel storage-metric"><HardDrive size={20} /><p>Mount capacity</p><strong>{storage.capacity.usedPercent ?? "—"}%</strong><span>{formatBytes(storage.capacity.usedBytes)} used of {formatBytes(storage.capacity.totalBytes)}</span></article><article className="panel storage-metric"><Folder size={20} /><p>Observed entries</p><strong>{storage.totalEntryCount}</strong><span>Showing up to {storage.entryLimit} non-hidden entries</span></article><article className="panel storage-metric"><Database size={20} /><p>Free space</p><strong>{formatBytes(storage.capacity.freeBytes)}</strong><span>Scanned {new Date(storage.scannedAt).toLocaleString()}</span></article></section>
      <article className="panel storage-workdir"><div className="section-header"><div><p className="panel-kicker">Allowed directory only</p><h2>{storage.workdir}</h2></div><span className="connection-pill connected">metadata only</span></div><div className="storage-entry-list">{storage.entries.map((entry) => <div className="storage-entry" key={entry.name}><Folder size={16} /><div><strong>{entry.name}</strong><span>{entry.kind} · {entry.sizeBytes === null ? "size unavailable" : formatBytes(entry.sizeBytes)}</span></div><time>{new Date(entry.modifiedAt).toLocaleString()}</time></div>)}</div></article>
    </>}
  </div>;
}
