import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet as WalletIcon, Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Wallet — HomeHero" }] }),
  component: WalletPage,
});

const QUICK = [200, 500, 1000, 2000];

// Load the Razorpay checkout script once (only needed in real mode).
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

// Full top-up: create a gateway order, then verify. Mock mode auto-verifies;
// real mode opens Razorpay checkout and verifies the signed response.
async function topUpFlow(amount: number) {
  const order = await apiFetch("/payments/order", { method: "POST", body: JSON.stringify({ amount, purpose: "WALLET_TOPUP" }) });

  if (order.mock) {
    return apiFetch("/payments/verify", {
      method: "POST",
      body: JSON.stringify({ order_id: order.order_id, payment_id: "pay_mock", signature: "mock_signature" }),
    });
  }

  const ok = await loadRazorpay();
  if (!ok) throw new Error("Could not load payment gateway");
  return new Promise((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: "HomeHero Wallet",
      description: "Wallet top-up",
      handler: async (resp: any) => {
        try {
          resolve(await apiFetch("/payments/verify", {
            method: "POST",
            body: JSON.stringify({
              order_id: resp.razorpay_order_id,
              payment_id: resp.razorpay_payment_id,
              signature: resp.razorpay_signature,
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

  useEffect(() => { if (!loading && !user) router.navigate({ to: "/auth/login" }); }, [user, loading, router]);

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["wallet", user?.id],
    queryFn: () => apiFetch("/wallet"),
  });

  const topUp = useMutation({
    mutationFn: (amt: number) => topUpFlow(amt),
    onSuccess: () => {
      toast.success("Wallet topped up");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: any) => { if (e?.message !== "cancelled") toast.error(e.message ?? "Top-up failed"); },
  });

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;

  const txns = (data?.transactions ?? []) as any[];

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">Wallet</h1>
      <p className="mt-1 text-sm text-muted-foreground">Add money and pay for bookings instantly</p>

      {/* Balance card */}
      <div className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-[oklch(0.28_0.06_270)] p-6 text-accent-foreground shadow-lg">
        <div className="flex items-center gap-2 text-sm text-white/70"><WalletIcon className="h-4 w-4" /> Available balance</div>
        <div className="mt-2 text-4xl font-bold">₹{Number(data?.balance ?? 0).toLocaleString("en-IN")}</div>
        <div className="mt-4 flex gap-6 text-xs text-white/70">
          <span>Added ₹{Number(data?.total_added ?? 0).toLocaleString("en-IN")}</span>
          <span>Spent ₹{Number(data?.total_spent ?? 0).toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Top up */}
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h3 className="font-semibold">Add money</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button key={q} onClick={() => setAmount(String(q))} className={cn(
              "rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors",
              amount === String(q) ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40",
            )}>₹{q}</button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Custom amount" />
          <Button disabled={topUp.isPending || !amount} onClick={() => {
            const amt = Number(amount);
            if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
            topUp.mutate(amt);
          }}>
            <Plus className="mr-1 h-4 w-4" /> {topUp.isPending ? "Adding…" : "Add"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Demo top-up credits instantly. Real Razorpay checkout arrives in a later update.</p>
      </div>

      {/* Transactions */}
      <h2 className="mt-8 text-lg font-semibold">Transaction history</h2>
      <div className="mt-3 space-y-2">
        {txns.length === 0 ? (
          <EmptyState icon={WalletIcon} title="No transactions yet" description="Add money or pay for a booking to see activity here." />
        ) : (
          txns.map((t) => {
            const credit = t.type === "CREDIT";
            return (
              <div key={t.id} className="flex items-center justify-between rounded-xl border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-full", credit ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>
                    {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.description ?? (credit ? "Credit" : "Debit")}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
                <div className={cn("font-semibold", credit ? "text-emerald-600" : "text-foreground")}>
                  {credit ? "+" : "−"}₹{t.amount}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
