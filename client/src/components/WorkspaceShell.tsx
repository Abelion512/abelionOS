import { useAuth } from "@/_core/hooks/useAuth";
import { Activity, CircleHelp, FolderArchive, LayoutDashboard, Menu, MoreHorizontal, Settings, Sun, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import React, { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";

export const workspaceNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/briefing", label: "Daily Focus", icon: Sun },
  { href: "/storage", label: "Storage", icon: FolderArchive },
  { href: "/activity", label: "Activity", icon: Activity },
] as const;

export const workspaceProfileItems = [
  { href: "/connections", label: "Connections", icon: CircleHelp },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const displayName = user?.name || user?.email || "Local workspace";
  const initials = displayName.slice(0, 2).toUpperCase();
  const isActive = (href: string) => location === href;

  return <div className="desktop-shell">
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
      <div className="brand-lockup"><p className="brand-name">mint<span>desk</span></p><button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
      <nav className="primary-nav" aria-label="Primary navigation">{workspaceNavItems.map((item) => <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? "active" : ""}`} aria-current={isActive(item.href) ? "page" : undefined} onClick={() => setSidebarOpen(false)}><item.icon size={18} /><span>{item.label}</span></Link>)}</nav>
      <div className="sidebar-footer"><DropdownMenu><DropdownMenuTrigger asChild><button className="profile-row profile-trigger" aria-label="Open profile menu"><div className="avatar">{initials}</div><div className="profile-copy"><p className="profile-name">{displayName}</p></div><MoreHorizontal className="profile-more" size={16} aria-hidden="true" /></button></DropdownMenuTrigger><DropdownMenuContent className="profile-menu" side="top" align="start" sideOffset={12}><DropdownMenuLabel className="profile-menu-label"><span className="avatar">{initials}</span><span><strong>{displayName}</strong><small>Account menu</small></span></DropdownMenuLabel><DropdownMenuSeparator />{workspaceProfileItems.map((item) => <DropdownMenuItem key={item.href} asChild><Link href={item.href} onClick={() => setSidebarOpen(false)}><item.icon size={16} /><span>{item.label}</span></Link></DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></div>
    </aside>
    {sidebarOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <button className="icon-button workspace-mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
    {children}
  </div>;
}
