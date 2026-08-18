import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Bell, CheckCheck, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function relativeTime(value: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - value.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function NotificationSeverityIcon({ severity }: { severity: "info" | "success" | "warning" | "error" }) {
  const iconProps = { size: 16, "aria-hidden": true };
  if (severity === "success") return <CircleCheck {...iconProps} />;
  if (severity === "warning") return <TriangleAlert {...iconProps} />;
  if (severity === "error") return <CircleAlert {...iconProps} />;
  return <Info {...iconProps} />;
}

export function NotificationCenter() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const itemsQuery = trpc.notifications.list.useQuery(undefined, { enabled: isAuthenticated, refetchOnWindowFocus: true });
  const preferencesQuery = trpc.notifications.preferences.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const knownIds = useRef<Set<number> | null>(null);
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => void utils.notifications.list.invalidate(),
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => void utils.notifications.list.invalidate(),
  });
  const observeCompanionStatus = trpc.companionDevices.observeStatus.useMutation({
    onSuccess: () => void utils.notifications.list.invalidate(),
  });

  useEffect(() => {
    if (!itemsQuery.data) return;
    const currentIds = new Set(itemsQuery.data.items.map(item => item.id));
    if (!knownIds.current) {
      knownIds.current = currentIds;
      return;
    }
    const incoming = itemsQuery.data.items.filter(item => !knownIds.current?.has(item.id));
    knownIds.current = currentIds;
    if (!preferencesQuery.data?.browserEnabled || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
    incoming.forEach(item => new Notification(item.title, { body: item.body, tag: `mintdesk-${item.id}` }));
  }, [itemsQuery.data, preferencesQuery.data?.browserEnabled]);

  useEffect(() => {
    if (!isAuthenticated || typeof window === "undefined") return;
    const refreshOnFocus = () => void itemsQuery.refetch();
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [isAuthenticated, itemsQuery.refetch]);

  const unreadCount = itemsQuery.data?.unreadCount ?? 0;
  const markItemRead = (id: number, readAt: Date | null) => {
    if (!readAt && !markRead.isPending) markRead.mutate({ notificationId: id });
  };
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && isAuthenticated) observeCompanionStatus.mutate();
  };

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogTrigger asChild>
      <button className="notification-center-trigger" type="button" aria-label={unreadCount ? `Open notifications, ${unreadCount} unread` : "Open notifications"}>
        <span className="notification-center-icon"><Bell size={17} />{unreadCount > 0 && <i>{unreadCount > 9 ? "9+" : unreadCount}</i>}</span>
        <span className="notification-center-copy"><strong>Notifications</strong><small>{unreadCount ? `${unreadCount} unread` : "All caught up"}</small></span>
      </button>
    </DialogTrigger>
    <DialogContent className="detail-dialog notification-dialog">
      <DialogHeader>
        <DialogTitle>Notifications</DialogTitle>
        <DialogDescription>Operational updates only. Email content, credentials, and raw AI output are never included.</DialogDescription>
      </DialogHeader>
      <div className="notification-dialog-toolbar">
        <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} disabled={unreadCount === 0 || markAllRead.isPending}><CheckCheck size={14} /><span>Mark all read</span></Button>
      </div>
      <div className="notification-list" aria-live="polite">
        {!isAuthenticated && <p className="notification-empty">Sign in to view your notification history.</p>}
        {isAuthenticated && itemsQuery.isLoading && <p className="notification-empty">Loading notifications…</p>}
        {isAuthenticated && itemsQuery.isError && <p className="notification-empty notification-error">Notification history is unavailable right now.</p>}
        {isAuthenticated && !itemsQuery.isLoading && !itemsQuery.isError && itemsQuery.data?.items.length === 0 && <p className="notification-empty">No notifications yet. Mintdesk will add an entry only when a real operational event occurs.</p>}
        {itemsQuery.data?.items.map(item => <button key={item.id} type="button" className={`notification-item ${item.readAt ? "is-read" : "is-unread"} severity-${item.severity}`} onClick={() => markItemRead(item.id, item.readAt)}>
          <span className="notification-item-icon"><NotificationSeverityIcon severity={item.severity} /></span>
          <span className="notification-item-copy"><strong>{item.title}</strong><span>{item.body}</span><time dateTime={item.createdAt.toISOString()}>{relativeTime(item.createdAt)}</time></span>
        </button>)}
      </div>
      {markRead.isError && <p className="notification-error">The read state could not be saved. Try again.</p>}
    </DialogContent>
  </Dialog>;
}
