import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, CheckCheck, ArrowLeft, BookOpen } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — HomeHero" }] }),
  component: NotificationsPage,
});

const TABS = [
  { id: "unread", label: "Unread" },
  { id: "all", label: "All" },
] as const;

function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"unread" | "all">("unread");

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth/login" });
  }, [user, loading, router]);

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["notifications"],
    queryFn: () => apiFetch("/notifications"),
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
  const unread = all.filter((n) => !n.is_read);
  const items = tab === "unread" ? unread : all;

  function handleClick(n: any) {
    if (!n.is_read) markOne.mutate(n.id);
    if (n.booking_id) router.navigate({ to: "/track/$bookingId", params: { bookingId: n.booking_id } });
  }

  if (loading || isLoading) return (
    <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>
  );

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.history.back()} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-muted text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unread.length > 0 && (
            <p className="text-sm text-muted-foreground">{unread.length} unread</p>
          )}
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 rounded-xl border bg-muted/40 p-1 w-fit">
        {TABS.map((t) => {
          const count = t.id === "unread" ? unread.length : all.length;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("rounded-lg px-5 py-1.5 text-sm font-medium transition-colors",
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {t.label}
              {count > 0 && (
                <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
                  t.id === "unread" && tab !== "unread" ? "bg-destructive/20 text-destructive" : "bg-muted")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border bg-muted/20 py-16">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10">
              <Bell className="h-7 w-7 text-primary/60" />
            </div>
            <p className="font-medium">{tab === "unread" ? "You're all caught up!" : "No notifications yet"}</p>
            {tab === "unread" && all.length > 0 && (
              <button onClick={() => setTab("all")} className="text-sm text-primary hover:underline">
                View all {all.length} notifications
              </button>
            )}
          </div>
        ) : (
          items.map((n) => {
            const hasLink = !!n.booking_id;
            return (
              <button key={n.id} onClick={() => handleClick(n)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/30",
                  !n.is_read && "border-primary/30 bg-primary/5",
                )}>
                {/* Dot */}
                <div className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full",
                  n.is_read ? "bg-muted-foreground/30" : "bg-primary")
                } />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn("text-sm font-medium", n.is_read && "text-muted-foreground")}>{n.title}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                  {hasLink && (
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                      <BookOpen className="h-3 w-3" /> View booking
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
