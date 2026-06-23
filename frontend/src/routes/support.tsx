import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  LifeBuoy, Plus, Send, ArrowLeft, ChevronLeft, ChevronRight, 
  MessageSquare, ShieldAlert, CheckCircle, FileText
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { playUISound } from "@/lib/sound-ui";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support — HomeHero" }] }),
  component: SupportPage,
});

const STATUS_PILL: Record<string, string> = {
  OPEN: "bg-amber-500/12 text-amber-700 border-amber-500/20",
  IN_PROGRESS: "bg-blue-500/12 text-blue-700 border-blue-500/20",
  RESOLVED: "bg-emerald-500/12 text-emerald-700 border-emerald-500/20",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_FILTERS = [
  { id: "ALL", label: "All Tickets" },
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
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => { 
    if (!loading && !user) router.navigate({ to: "/auth/login" }); 
  }, [user, loading, router]);

  const { data: tickets = [], isLoading } = useQuery({
    enabled: !!user, 
    queryKey: ["tickets"], 
    queryFn: () => apiFetch("/support/tickets"),
  });

  const { data: thread } = useQuery({
    enabled: !!openId, 
    queryKey: ["ticket", openId], 
    queryFn: () => apiFetch(`/support/tickets/${openId}`),
    refetchInterval: openId ? 8000 : false,
  });

  const createTicket = useMutation({
    mutationFn: () => apiFetch("/support/tickets", { 
      method: "POST", 
      body: JSON.stringify({ subject: form.subject, message: form.message, category: "GENERAL" }) 
    }),
    onSuccess: () => { 
      playUISound("success");
      toast.success("Support ticket created!"); 
      setCreating(false); 
      setForm({ subject: "", message: "" }); 
      qc.invalidateQueries({ queryKey: ["tickets"] }); 
    },
    onError: (e: any) => {
      playUISound("warning");
      toast.error(e.message ?? "Failed to create ticket");
    },
  });

  const sendReply = useMutation({
    mutationFn: () => apiFetch(`/support/tickets/${openId}/messages`, { 
      method: "POST", 
      body: JSON.stringify({ body: reply }) 
    }),
    onSuccess: () => { 
      playUISound("click");
      setReply(""); 
      qc.invalidateQueries({ queryKey: ["ticket", openId] }); 
      qc.invalidateQueries({ queryKey: ["tickets"] }); 
    },
    onError: (e: any) => {
      playUISound("warning");
      toast.error(e.message ?? "Failed to send message");
    },
  });

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;

  // ── Thread view (High-fidelity chat UI) ──────────────────────────────────────
  if (openId && thread) {
    return (
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <button 
          onClick={() => setOpenId(null)} 
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> All tickets
        </button>
        
        {/* Ticket Header card */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Ticket #{thread.id.slice(-6).toUpperCase()}
            </span>
            <h1 className="text-xl font-extrabold text-foreground mt-3 tracking-tight">{thread.subject}</h1>
            <p className="text-xs text-muted-foreground mt-1.5">
              Opened on {new Date(thread.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <span className={cn("rounded-full border px-3 py-1 text-xs font-bold shrink-0 shadow-sm", STATUS_PILL[thread.status])}>
            {thread.status}
          </span>
        </div>

        {/* Message Thread view */}
        <div className="mt-8 space-y-4 min-h-[250px]">
          {(thread.messages ?? []).map((m: any) => {
            const isStaff = m.is_staff;
            return (
              <div 
                key={m.id} 
                className={cn("flex items-end gap-3 max-w-[85%] mt-4", isStaff ? "justify-start" : "justify-end ml-auto")}
              >
                {isStaff && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20 shadow-sm">
                    <LifeBuoy className="h-4.5 w-4.5" />
                  </div>
                )}
                
                <div className="flex flex-col gap-1.5">
                  <div className={cn(
                    "rounded-3xl px-4 py-3 text-sm shadow-sm leading-relaxed break-words",
                    isStaff 
                      ? "rounded-bl-none bg-muted/60 text-foreground border border-border/40" 
                      : "rounded-br-none bg-primary text-primary-foreground"
                  )}>
                    <div className="mb-1 text-[9px] font-bold opacity-60 uppercase tracking-wider">
                      {isStaff ? "HomeHero Support" : "You"}
                    </div>
                    {m.body}
                  </div>
                  
                  {/* Timestamp */}
                  <span className={cn(
                    "text-[9px] text-muted-foreground font-semibold px-1",
                    isStaff ? "text-left" : "text-right"
                  )}>
                    {new Date(m.created_at).toLocaleTimeString("en-IN", { 
                      hour: "2-digit", 
                      minute: "2-digit" 
                    })}
                  </span>
                </div>

                {!isStaff && (
                  <Avatar 
                    src={user?.avatar_url} 
                    name={user?.name || "Customer"} 
                    size={32} 
                    className="shrink-0 border border-primary/20" 
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Reply Message Input Bar */}
        {!["RESOLVED", "CLOSED"].includes(thread.status) ? (
          <div className="mt-8 flex gap-2 border-t pt-6">
            <Input 
              value={reply} 
              onChange={(e) => setReply(e.target.value)} 
              placeholder="Type a message to support specialist…"
              className="rounded-2xl h-12 border-border focus:border-primary"
              onKeyDown={(e) => { 
                if (e.key === "Enter" && reply.trim()) sendReply.mutate(); 
              }} 
            />
            <Button 
              disabled={sendReply.isPending || !reply.trim()} 
              onClick={() => sendReply.mutate()}
              className="rounded-2xl h-12 w-12 p-0 shrink-0 bg-primary hover:bg-primary/95 shadow-md"
            >
              <Send className="h-4.5 w-4.5" />
            </Button>
          </div>
        ) : (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-muted/30 border border-dashed p-4 text-xs font-semibold text-muted-foreground leading-relaxed">
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            This ticket has been marked as {thread.status.toLowerCase()}. Raise a new ticket if you need further help.
          </div>
        )}
      </div>
    );
  }

  // ── List + Create View ───────────────────────────────────────────────────────
  const allTickets = tickets as any[];
  const filtered = statusFilter === "ALL" ? allTickets : allTickets.filter((t) => t.status === statusFilter);
  
  const counts = STATUS_FILTERS.reduce((acc, f) => {
    acc[f.id] = f.id === "ALL" ? allTickets.length : allTickets.filter((t) => t.status === f.id).length;
    return acc;
  }, {} as Record<string, number>);

  // Paginated tickets list
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedTickets = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (filter: StatusFilter) => {
    playUISound("click");
    setStatusFilter(filter);
    setPage(1);
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between gap-3 border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Support</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Raise ticket issues or chat with support experts</p>
        </div>
        <Button 
          onClick={() => setCreating((v) => !v)}
          className="rounded-xl bg-primary hover:bg-primary/95 shadow-sm font-bold"
        >
          <Plus className="mr-1.5 h-4 w-4 shrink-0" /> New Ticket
        </Button>
      </div>

      {creating && (
        <div className="mt-6 space-y-4 rounded-3xl border bg-card p-6 shadow-md transition-all">
          <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Create support ticket</h3>
          
          <div className="space-y-3">
            <div>
              <Label className="font-bold text-xs">Subject</Label>
              <Input 
                className="mt-1 rounded-xl h-11 border-border" 
                value={form.subject} 
                onChange={(e) => setForm({ ...form, subject: e.target.value })} 
                placeholder="Brief summary of the issue..." 
              />
            </div>
            
            <div>
              <Label className="font-bold text-xs">Message</Label>
              <Textarea 
                className="mt-1 rounded-xl border-border" 
                rows={4} 
                value={form.message} 
                onChange={(e) => setForm({ ...form, message: e.target.value })} 
                placeholder="Explain the problem in detail..."
              />
            </div>
          </div>
          
          <Button 
            disabled={createTicket.isPending} 
            onClick={() => {
              if (form.subject.trim().length < 3) { toast.error("Enter a valid subject (min 3 characters)"); return; }
              if (form.message.trim().length < 10) { toast.error("Please explain the issue in detail (min 10 characters)"); return; }
              createTicket.mutate();
            }}
            className="rounded-xl w-full sm:w-auto px-6 font-bold"
          >
            {createTicket.isPending ? "Submitting..." : "Submit Ticket"}
          </Button>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="mt-8 flex gap-1 overflow-x-auto rounded-2xl border bg-muted/40 p-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => handleFilterChange(f.id)}
            className={cn(
              "flex-shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              statusFilter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            {counts[f.id] > 0 && (
              <span className={cn(
                "ml-2 rounded-full px-1.5 py-0.5 text-[10px]",
                statusFilter === f.id ? "bg-muted text-muted-foreground" : "bg-muted/60 text-muted-foreground"
              )}>
                {counts[f.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Ticket List Grid */}
      <div className="mt-6 space-y-3">
        {paginatedTickets.length === 0 ? (
          <EmptyState 
            icon={LifeBuoy}
            title={statusFilter === "ALL" ? "No support tickets yet" : `No ${statusFilter.toLowerCase().replace("_", " ")} tickets`}
            description={statusFilter === "ALL" ? "Raise a ticket and our support team will resolve it." : "Try selecting a different filter."} 
          />
        ) : (
          paginatedTickets.map((t) => (
            <button 
              key={t.id} 
              onClick={() => setOpenId(t.id)} 
              className="flex w-full items-center justify-between rounded-2xl border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-sm group"
            >
              <div className="min-w-0 pr-4">
                <div className="truncate font-bold text-foreground group-hover:text-primary transition-colors text-sm sm:text-base">{t.subject}</div>
                <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                  <span>{t.message_count} message{t.message_count === 1 ? "" : "s"}</span>
                  <span className="text-muted-foreground/30">•</span>
                  <span>{new Date(t.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
              </div>
              <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold shadow-sm", STATUS_PILL[t.status])}>
                {t.status}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground font-medium">
            Showing <span className="font-bold text-foreground">{startIndex + 1}</span> to <span className="font-bold text-foreground">{Math.min(startIndex + itemsPerPage, filtered.length)}</span> of <span className="font-bold text-foreground">{filtered.length}</span> tickets
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage((p) => Math.max(p - 1, 1))} 
              disabled={page === 1}
              className="h-8 px-3 rounded-xl gap-1 text-xs"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground font-bold px-2">
              Page {page} of {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))} 
              disabled={page === totalPages}
              className="h-8 px-3 rounded-xl gap-1 text-xs"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
