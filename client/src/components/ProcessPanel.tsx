import { useCallback, useEffect, useState } from "react";
import { CircleStop, Cpu } from "lucide-react";
import { toast } from "sonner";
import { bridgeApi, canRequestProcessTermination, type BridgeProcess } from "@/lib/bridge";

export function ProcessPanel() {
  const [processes, setProcesses] = useState<BridgeProcess[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await bridgeApi.processes();
      setProcesses(result.processes);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Linux companion unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refreshOnVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", refreshOnVisible);
    return () => document.removeEventListener("visibilitychange", refreshOnVisible);
  }, [load]);

  const terminate = async (process: BridgeProcess) => {
    if (!canRequestProcessTermination(process)) return;
    if (!window.confirm(`Terminate ${process.command} (PID ${process.pid}) with SIGTERM?`)) return;
    try {
      await bridgeApi.terminate(process.pid);
      toast(`SIGTERM sent to ${process.command} (${process.pid})`);
      await load();
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : "Process termination failed");
    }
  };

  return <article className="process-card panel">
    <div className="section-header"><div><p className="panel-kicker">Processes</p><h2>Controlled processes</h2></div></div>
    {loading && <div className="connection-empty process-empty"><strong>Reading the process table…</strong><span>Waiting for the local companion.</span></div>}
    {!loading && error && <div className="connection-empty process-empty"><strong>Process list unavailable.</strong><span>{error}</span></div>}
    {!loading && !error && processes.length === 0 && <div className="connection-empty process-empty"><strong>No user processes returned.</strong><span>The bridge returned an empty process list.</span></div>}
    {!loading && !error && processes.length > 0 && <div className="process-list">{processes.slice(0, 8).map((process) => <div className="process-row" key={process.pid}><span className="process-glyph"><Cpu size={15} /></span><div className="process-copy"><strong>{process.command}</strong><span>PID {process.pid} · CPU {process.cpuPercent}% · MEM {process.memoryPercent}%</span></div><button className="kill-button" disabled={!canRequestProcessTermination(process)} aria-label={`Terminate ${process.command}`} onClick={() => void terminate(process)}><CircleStop size={15} /></button></div>)}</div>}
  </article>;
}
