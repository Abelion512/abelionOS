import { Link } from "wouter";
import { ArrowLeft, Activity, ShieldCheck } from "lucide-react";
import { ProcessPanel } from "@/components/ProcessPanel";

export default function Processes() {
  return <div className="feature-page">
    <header className="feature-header"><div><p className="eyebrow"><span className="eyebrow-line" /> Linux bridge</p><h1>Processes</h1><p>Processes are read from the local companion. Termination is limited to the explicit allowlist and requires confirmation.</p></div><Link href="/" className="back-link"><ArrowLeft size={15} /> Overview</Link></header>
    <div className="feature-notice"><ShieldCheck size={18} /><span>No root access. The bridge only inspects processes owned by the current user and records accepted SIGTERM actions locally.</span></div>
    <ProcessPanel />
    <div className="feature-footer"><Activity size={15} /> Source: `http://127.0.0.1:18765/v1/processes` through the configured local bridge.</div>
  </div>;
}
