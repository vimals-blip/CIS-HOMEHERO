import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LifeBuoy, Plus, Send, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support — HomeHero" }] }),
  component: SupportPage,
});

const STATUS_PILL: Record<string, string> = {
  OPEN: "bg-amber-500/12 text-amber-700",
  IN_PROGRESS: "bg-blue-500/12 text-blue-700",
  RESOLVED: "bg-emerald-500/12 text-emerald-700",
  CLOSED: "bg-slate-200 text-slate-600",
};

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "OPEN", label: "Open" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "CLOSED", label: "Closed" },
] as const;
type StatusFilter = typeof STATUS_FILTERS[number]["id"];

function SupportPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "" });
  const [reply, setReply] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  useEffect(() => { if (!loading && !user) router.navigate({ to: "/auth/login" }); }, [user, loading, router]);

  const { data: tickets = [], isLoading } = useQuery({
    enabled: !!user, queryKey: ["tickets"], queryFn: () => apiFetch("/support/tickets"),
  });

  const { data: thread } = useQuery({
    enabled: !!openId, queryKey: ["ticket", openId], queryFn: () => apiFetch(`/support/tickets/${openId}`),
    refetchInterval: openId ? 8000 : false,
  });

  const createTicket = useMutation({
    mutationFn: () => apiFetch("/support/tickets", { method: "POST", body: JSON.stringify({ subject: form.subject, message: form.message, category: "GENERAL" }) }),
    onSuccess: () => { toast.success("Ticket created"); setCreating(false); setForm({ subject: "", message: "" }); qc.invalidateQueries({ queryKey: ["tickets"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const sendReply = useMutation({
    mutationFn: () => apiFetch(`/support/tickets/${openId}/messages`, { method: "POST", body: JSON.stringify({ body: reply }) }),
    onSuccess: () => { setReply(""); qc.invalidateQueries({ queryKey: ["ticket", openId] }); qc.invalidateQueries({ queryKey: ["tickets"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;

  // ── Thread view ────────────────────────────────────────────────────────────
  if (openId && thread) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <button onClick={() => setOpenId(null)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All tickets
        </button>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold">{thread.subject}</h1>
          <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", STATUS_PILL[thread.status])}>{thread.status}</span>
        </div>

        <div className="mt-6 space-y-3">
          {(thread.messages ?? []).map((m: any) => (
            <div key={m.id} className={cn("flex", m.is_staff ? "justify-start" : "justify-end")}>
              <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm", m.is_staff ? "bg-muted" : "bg-primary text-primary-foreground")}>
                <div className="mb-0.5 text-[10px] opacity-70">{m.is_staff ? "Support" : "You"}</div>
                {m.body}
              </div>
            </div>
          ))}
        </div>

        {!["RESOLVED", "CLOSED"].includes(thread.status) && (
          <div className="mt-6 flex gap-2">
            <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type a message…"
              onKeyDown={(e) => { if (e.key === "Enter" && reply.trim()) sendReply.mutate(); }} />
            <Button disabled={sendReply.isPending || !reply.trim()} onClick={() => sendReply.mutate()}><Send className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
    );
  }

  // ── List + create ────────────────────────────────────────────────────────────
  const allTickets = tickets as any[];
  const filtered = statusFilter === "ALL" ? allTickets : allTickets.filter((t) => t.status === statusFilter);
  const counts = STATUS_FILTERS.reduce((acc, f) => {
    acc[f.id] = f.id === "ALL" ? allTickets.length : allTickets.filter((t) => t.status === f.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Support</h1>
          <p className="mt-1 text-sm text-muted-foreground">We're here to help</p>
        </div>
        <Button onClick={() => setCreating((v) => !v)}><Plus className="mr-1 h-4 w-4" /> New ticket</Button>
      </div>

      {creating && (
        <div className="mt-6 space-y-3 rounded-2xl border bg-card p-5">
          <div><Label>Subject</Label><Input className="mt-1" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="What's the issue?" /></div>
          <div><Label>Message</Label><Textarea className="mt-1" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <Button disabled={createTicket.isPending} onClick={() => {
            if (form.subject.trim().length < 3) { toast.error("Enter a subject"); return; }
            createTicket.mutate();
          }}>{createTicket.isPending ? "Creating…" : "Create ticket"}</Button>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl border bg-muted/40 p-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className={cn(
              "flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              statusFilter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            {counts[f.id] > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{counts[f.id]}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState icon={LifeBuoy}
            title={statusFilter === "ALL" ? "No tickets yet" : `No ${statusFilter.toLowerCase().replace("_", " ")} tickets`}
            description={statusFilter === "ALL" ? "Raise a ticket and our team will get back to you." : "Try a different filter."} />
        ) : (
          filtered.map((t) => (
            <button key={t.id} onClick={() => setOpenId(t.id)} className="flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary/40">
              <div className="min-w-0">
                <div className="truncate font-medium">{t.subject}</div>
                <div className="text-xs text-muted-foreground">{t.message_count} message{t.message_count === 1 ? "" : "s"} · {new Date(t.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold", STATUS_PILL[t.status])}>{t.status}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
