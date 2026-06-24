import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  Wallet as WalletIcon, Plus, ArrowDownLeft, ArrowUpRight,
  ChevronLeft, ChevronRight, CirclePercent, ShieldCheck, ChevronDown
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { playUISound } from "@/lib/sound-ui";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Wallet — HomeHero" }] }),
  component: WalletPage,
});

const QUICK = [200, 500, 1000, 2000];
const TXN_FILTERS = [
  { id: "ALL", label: "All Activity" },
  { id: "CREDIT", label: "Inflows (Credits)" },
  { id: "DEBIT", label: "Outflows (Debits)" },
] as const;
type TxnFilter = typeof TXN_FILTERS[number]["id"];

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

async function topUpFlow(amount: number): Promise<any> {
  const order = await apiFetch("/payments/order", {
    method: "POST",
    body: JSON.stringify({ amount, purpose: "WALLET_TOPUP" }),
  });

  // Mock mode — auto-verify
  if (order.mock) {
    return apiFetch("/payments/verify", {
      method: "POST",
      body: JSON.stringify({ order_id: order.order_id, payment_id: "pay_mock", signature: "mock_signature" }),
    });
  }

  // Stripe — redirect to hosted checkout page
  if (order.provider === "STRIPE" && order.checkout_url) {
    window.location.href = order.checkout_url;
    return new Promise(() => {}); // never resolves; page navigates away
  }

  // Razorpay — popup modal
  const ok = await loadRazorpay();
  if (!ok) throw new Error("Could not load payment gateway");
  return new Promise((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key:         order.key_id,
      order_id:    order.order_id,
      amount:      order.amount,
      currency:    order.currency,
      name:        "HomeHero Wallet",
      description: "Wallet top-up",
      handler: async (resp: any) => {
        try {
          resolve(await apiFetch("/payments/verify", {
            method: "POST",
            body: JSON.stringify({
              order_id:   resp.razorpay_order_id,
              payment_id: resp.razorpay_payment_id,
              signature:  resp.razorpay_signature,
            }),
          }));
        } catch (e) { reject(e); }
      },
      modal: { ondismiss: () => reject(new Error("cancelled")) },
    });
    rzp.open();
  });
}

function WalletPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [txnFilter, setTxnFilter] = useState<TxnFilter>("ALL");
  const [page, setPage] = useState(1);
  const [expandedTxnId, setExpandedTxnId] = useState<string | null>(null);
  const itemsPerPage = 5;

  useEffect(() => { 
    if (!loading && !user) router.navigate({ to: "/auth/login" }); 
  }, [user, loading, router]);

  // Handle Stripe return: ?stripe_done=SESSION_ID or ?stripe_cancel=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("stripe_done");
    const cancelled = params.get("stripe_cancel");

    if (sessionId && user) {
      // Clean URL first
      window.history.replaceState({}, "", window.location.pathname);
      apiFetch("/payments/verify", {
        method: "POST",
        body: JSON.stringify({ order_id: sessionId, payment_id: sessionId, signature: "stripe" }),
      })
        .then(() => {
          toast.success("Wallet topped up successfully!");
          qc.invalidateQueries({ queryKey: ["wallet"] });
        })
        .catch((e: any) => toast.error(e.message ?? "Payment verification failed"));
    }

    if (cancelled) {
      window.history.replaceState({}, "", window.location.pathname);
      toast.error("Payment cancelled");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["wallet", user?.id],
    queryFn:  () => apiFetch("/wallet"),
  });

  const topUp = useMutation({
    mutationFn: (amt: number) => topUpFlow(amt),
    onSuccess: () => {
      playUISound("success");
      toast.success("Wallet topped up successfully!");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: any) => { 
      if (e?.message !== "cancelled") {
        playUISound("warning");
        toast.error(e.message ?? "Top-up failed"); 
      }
    },
  });

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;

  const txns = (data?.transactions ?? []) as any[];

  // Filter transactions
  const filteredTxns = txns.filter((t) => {
    if (txnFilter === "ALL") return true;
    return t.type === txnFilter;
  });

  // Paginated transactions
  const totalPages = Math.ceil(filteredTxns.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedTxns = filteredTxns.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (filter: TxnFilter) => {
    playUISound("click");
    setTxnFilter(filter);
    setExpandedTxnId(null);
    setPage(1);
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add money and pay for bookings instantly</p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">

      {/* Balance Card - Premium Digital Credit Card */}
      <div className="space-y-8">
      <div id="tour-wallet-balance" className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-accent via-primary to-primary-glow p-8 text-accent-foreground shadow-xl border border-white/5">
        {/* Glow overlay elements */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-1/4 bottom-0 h-32 w-32 rounded-full bg-white/5 blur-xl pointer-events-none" />
        
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 inline-flex items-center gap-1.5">
              <WalletIcon className="h-3.5 w-3.5 text-primary-glow" /> Available Balance
            </span>
            <span className="text-4xl font-extrabold text-white tracking-tight mt-1">
              <AnimatedCounter value={Number(data?.balance ?? 0)} decimals={2} prefix="₹" />
            </span>
          </div>
          
          {/* Virtual SIM chip layout */}
          <div className="w-12 h-9 rounded-lg border border-white/20 bg-white/10 flex items-center justify-center backdrop-blur-md shadow-inner shrink-0">
            <div className="w-8 h-6 rounded border border-white/10 flex flex-wrap gap-0.5 p-0.5">
              <div className="w-2 h-2 border-r border-b border-white/25" />
              <div className="w-2 h-2 border-l border-b border-white/25" />
              <div className="w-2 h-2 border-r border-t border-white/25" />
              <div className="w-2 h-2 border-l border-t border-white/25" />
            </div>
          </div>
        </div>

        {/* Mock card number representing user ID context */}
        <div className="mt-8">
          <div className="text-xs font-mono tracking-[0.25em] text-white/70">
            •••• •••• •••• {user?.phone ? user.phone.slice(-4) : "7428"}
          </div>
          <div className="mt-2.5 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-white/50">
            <span>{user?.name || "HomeHero Premium Member"}</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-400" /> Active Card</span>
          </div>
        </div>

        {/* Dynamic transaction summaries inside card */}
        <div className="mt-8 border-t border-white/10 pt-4 grid grid-cols-2 gap-4 text-xs text-white/70">
          <div>
            <span className="text-[9px] uppercase tracking-wider block text-white/40 font-bold">Total Added</span>
            <span className="font-bold text-white mt-0.5 block">
              <AnimatedCounter value={Number(data?.total_added ?? 0)} decimals={0} prefix="₹" />
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider block text-white/40 font-bold font-sans">Total Spent</span>
            <span className="font-bold text-white mt-0.5 block">
              <AnimatedCounter value={Number(data?.total_spent ?? 0)} decimals={0} prefix="₹" />
            </span>
          </div>
        </div>
      </div>

      {/* Top up section */}
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <h3 className="font-bold text-foreground text-base">Add money to wallet</h3>
        
        {/* Quick select buttons */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {QUICK.map((q) => (
            <button 
              key={q} 
              type="button"
              onClick={() => { playUISound("click"); setAmount(String(q)); }} 
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                amount === String(q) 
                  ? "border-primary bg-primary/10 text-primary shadow-sm" 
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              +₹{q}
            </button>
          ))}
        </div>
        
        {/* Custom Input controls */}
        <div className="mt-4 flex gap-2">
          <Input 
            type="number" 
            min={1} 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            placeholder="Enter custom amount" 
            className="rounded-xl h-11 border-border focus:border-primary"
          />
          <Button 
            disabled={topUp.isPending || !amount} 
            onClick={() => {
              playUISound("click");
              const amt = Number(amount);
              if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
              topUp.mutate(amt);
            }}
            className="rounded-xl h-11 px-6 bg-primary hover:bg-primary/95 shadow-sm font-bold shrink-0"
          >
            <Plus className="mr-1.5 h-4 w-4 shrink-0" /> 
            {topUp.isPending ? "Adding…" : "Add Funds"}
          </Button>
        </div>
        
        <p className="mt-3 text-xs text-muted-foreground inline-flex items-start gap-1.5 leading-relaxed">
          <CirclePercent className="h-4 w-4 text-primary shrink-0 mt-0.5" /> 
          Wallet credits can be used for any booking. Add money once and experience one-click instant checkouts every time.
        </p>
      </div>
      </div>

      {/* Transaction History Section — right column on desktop */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Transaction History</h2>
        
        {/* Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-2xl border bg-muted/40 p-1">
          {TXN_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => handleFilterChange(f.id)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                txnFilter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List Grid */}
        <div className="mt-6 space-y-3">
          {paginatedTxns.length === 0 ? (
            <EmptyState 
              icon={WalletIcon} 
              title="No transactions found" 
              description={txnFilter === "ALL" ? "Add money or make a booking to see records here." : "Try a different filter."} 
            />
          ) : (
            paginatedTxns.map((t) => {
              const credit = t.type === "CREDIT";
              const isExpanded = expandedTxnId === t.id;
              return (
                <div 
                  key={t.id} 
                  onClick={() => {
                    playUISound("click");
                    setExpandedTxnId(isExpanded ? null : t.id);
                  }}
                  className={cn(
                    "group flex flex-col rounded-2xl border bg-card p-4 transition-all cursor-pointer hover:border-primary/25 hover:shadow-sm",
                    isExpanded && "border-primary/45 shadow-sm"
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className={cn(
                        "grid h-10 w-10 place-items-center rounded-xl shrink-0 border", 
                        credit 
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/10" 
                          : "bg-rose-500/10 text-rose-600 border-rose-500/10"
                      )}>
                        {credit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{t.description ?? (credit ? "Credits Added" : "Booking Debit")}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(t.created_at).toLocaleDateString("en-IN", { 
                            day: "numeric", 
                            month: "short"
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={cn("font-extrabold text-base shrink-0", credit ? "text-emerald-600 animate-pulse" : "text-foreground")}>
                        {credit ? "+" : "−"}₹{Number(t.amount).toLocaleString("en-IN")}
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", isExpanded && "rotate-180 text-primary")} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3.5 border-t border-dashed border-border pt-3.5 text-xs space-y-2 text-muted-foreground transition-all duration-300 animate-in fade-in slide-in-from-top-1">
                      <div className="flex justify-between">
                        <span>Transaction ID:</span>
                        <span className="font-mono text-foreground font-semibold select-all">{t.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="font-bold text-emerald-600 uppercase tracking-wide">SUCCESSFUL</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Timestamp:</span>
                        <span className="font-semibold text-foreground">
                          {new Date(t.created_at).toLocaleString("en-IN", { 
                            day: "numeric", 
                            month: "long",
                            year: "numeric",
                            hour: "2-digit", 
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gateway:</span>
                        <span className="font-semibold text-foreground">{credit ? "NetBanking / Cards / UPI" : "Internal Escrow Wallet"}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground font-medium">
              Showing <span className="font-bold text-foreground">{startIndex + 1}</span> to <span className="font-bold text-foreground">{Math.min(startIndex + itemsPerPage, filteredTxns.length)}</span> of <span className="font-bold text-foreground">{filteredTxns.length}</span> transactions
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
      </div> {/* end lg:grid-cols-2 */}
    </div>
  );
}
