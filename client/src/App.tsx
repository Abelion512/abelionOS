/* Mint Atelier: dashboard shell with a single workspace navigation across every operational route. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { WorkspaceShell } from "./components/WorkspaceShell";
import { ThemeProvider } from "./contexts/ThemeContext";
import Activity from "./pages/Activity";
import Connections from "./pages/Connections";
import Home from "./pages/Home";
import MorningBriefing from "./pages/MorningBriefing";
import NotFound from "./pages/NotFound";
import Processes from "./pages/Processes";
import Settings from "./pages/Settings";
import Storage from "./pages/Storage";

function FeatureCanvas({ children }: { children: React.ReactNode }) {
  return <main className="main-canvas">{children}</main>;
}

function Router() {
  return <Switch>
    <Route path="/">{() => <WorkspaceShell><Home /></WorkspaceShell>}</Route>
    <Route path="/processes">{() => <WorkspaceShell><FeatureCanvas><Processes /></FeatureCanvas></WorkspaceShell>}</Route>
    <Route path="/activity">{() => <WorkspaceShell><FeatureCanvas><Activity /></FeatureCanvas></WorkspaceShell>}</Route>
    <Route path="/storage">{() => <WorkspaceShell><FeatureCanvas><Storage /></FeatureCanvas></WorkspaceShell>}</Route>
    <Route path="/connections">{() => <WorkspaceShell><FeatureCanvas><Connections /></FeatureCanvas></WorkspaceShell>}</Route>
    <Route path="/settings">{() => <WorkspaceShell><FeatureCanvas><Settings /></FeatureCanvas></WorkspaceShell>}</Route>
    <Route path="/briefing">{() => <WorkspaceShell><FeatureCanvas><MorningBriefing /></FeatureCanvas></WorkspaceShell>}</Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster position="bottom-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
