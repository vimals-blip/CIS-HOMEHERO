import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { playNotificationSound } from "@/lib/sound";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function notifLink(n: any): string | null {
  if (n.booking_id) return `/track/${n.booking_id}`;
  return null;
}

export function NotificationBell() {
  const qc = useQueryClient();
  const router = useRouter();
  const prevUnread = useRef(0);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch("/notifications"),
    refetchInterval: 60000,
  });

  const markAll = useMutation({
    mutationFn: () => apiFetch("/notifications/read-all", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markOne = useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const all = (data?.notifications ?? []) as any[];
  const unread = Number(data?.unread ?? 0);
  // Only show unread in the dropdown
  const unreadItems = all.filter((n) => !n.is_read);

  // Play sound when a new notification arrives (unread count increases).
  useEffect(() => {
    if (unread > prevUnread.current) playNotificationSound();
    prevUnread.current = unread;
  }, [unread]);

  // Live: refetch + play sound when socket pushes a notification.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onPush = () => qc.invalidateQueries({ queryKey: ["notifications"] });
    socket.on("notification_received", onPush);
    return () => { socket.off("notification_received", onPush); };
  }, [qc]);

  function handleClick(n: any) {
    if (!n.is_read) markOne.mutate(n.id);
    const link = notifLink(n);
    if (link) {
      // Open booking/detail in a new tab so the current page is not disrupted.
      window.open(link, "_blank");
    }
  }

  function handleOpenChange(open: boolean) {
    // Auto-mark all read a moment after the panel opens so bell count clears.
    if (open && unread > 0) {
      setTimeout(() => markAll.mutate(), 1200);
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className={cn("h-4 w-4", unread > 0 && "animate-[wiggle_0.5s_ease-in-out]")} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">
            Notifications {unread > 0 && <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>}
          </span>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate()}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-auto">
          {unreadItems.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No new notifications
            </p>
          ) : (
            unreadItems.map((n) => {
              const hasLink = !!notifLink(n);
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 border-b px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                    "bg-primary/5",
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  </div>
                  {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                  <div className="flex w-full items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {hasLink && <span className="text-[10px] font-medium text-primary">View →</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {all.length > unreadItems.length && (
          <div className="border-t px-3 py-2 text-center">
            <button
              onClick={() => router.navigate({ to: "/notifications" } as any)}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {all.length - unreadItems.length} read notification{all.length - unreadItems.length !== 1 ? "s" : ""} — view history
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
