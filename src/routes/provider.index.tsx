import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Wallet, Briefcase, Star, TrendingUp, ArrowRight, Wifi, WifiOff } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/provider/")({
  head: () => ({ meta: [{ title: "Provider Dashboard — HomeHero" }] }),
  component: ProviderDashboard,
});

function ProviderDashboard() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading) {
      if (!user) router.navigate({ to: "/auth/login" });
      else if (role && role !== "PROVIDER" && role !== "ADMIN") router.navigate({ to: "/" });
    }
  }, [user, role, loading, router]);

  const { data, isLoading, isError } = useQuery({
    enabled: !!user && role === "PROVIDER",
    queryKey: ["provider-dashboard", user?.id],
    queryFn: async () => {
      const [provider, wallet, bookings] = await Promise.all([
        apiFetch(`/provider/${user!.id}`),
        apiFetch(`/provider-wallet/${user!.id}`),
        apiFetch(`/bookings?provider_id=${user!.id}`),
      ]);
      return { provider, wallet, bookings: bookings ?? [] };
    },
    retry: false,
  });

  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  // Sync local state once provider data arrives
  useEffect(() => {
    if (data?.provider && isOnline === null) {
      setIsOnline(data.provider.status === "ONLINE");
    }
  }, [data?.provider, isOnline]);

  const toggleStatus = useMutation({
    mutationFn: (newStatus: string) =>
      apiFetch(`/providers/${user!.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      }),
    onSuccess: (_d, newStatus) => {
      setIsOnline(newStatus === "ONLINE");
      toast.success(newStatus === "ONLINE" ? "You are now online" : "You are now offline");
      qc.invalidateQueries({ queryKey: ["provider-dashboard", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || (isLoading && role === "PROVIDER")) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;
  if (isError) return (
    <div className="container mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-muted-foreground">Could not load your provider profile. Please contact support.</p>
    </div>
  );

  const active = data?.bookings.filter((b: any) => ["CONFIRMED", "IN_PROGRESS"].includes(b.status)).length ?? 0;
  const completed = data?.bookings.filter((b: any) => b.status === "COMPLETED").length ?? 0;
  const currentOnline = isOnline ?? (data?.provider?.status === "ONLINE");

  const stats = [
    { icon: Wallet, label: "Available", value: `₹${Number(data?.wallet?.available_balance ?? 0).toFixed(0)}` },
    { icon: TrendingUp, label: "Total earned", value: `₹${Number(data?.wallet?.total_earned ?? 0).toFixed(0)}` },
    { icon: Briefcase, label: "Active jobs", value: active },
    { icon: Star, label: "Rating", value: Number(data?.provider?.avg_rating ?? 0).toFixed(1) },
  ];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.provider?.is_verified ? "Verified provider" : "Verification pending"} · {completed} jobs completed
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => toggleStatus.mutate(currentOnline ? "OFFLINE" : "ONLINE")}
            disabled={toggleStatus.isPending}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all",
              currentOnline
                ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {currentOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {currentOnline ? "Online" : "Offline"}
          </button>
          <Button asChild>
            <Link to="/provider/jobs">View jobs <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {!data?.provider?.is_verified && (
        <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          <h3 className="font-semibold">Complete verification</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your documents to start receiving bookings. An admin will review your KYC.
          </p>
        </div>
      )}

      {/* Recent jobs summary */}
      {data?.bookings && data.bookings.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Recent jobs</h2>
          <div className="mt-3 space-y-2">
            {data.bookings.slice(0, 3).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl border bg-card p-4">
                <div>
                  <div className="font-medium">{b.category_name ?? "Service"}</div>
                  <div className="text-xs text-muted-foreground">{b.scheduled_date} · {b.address}</div>
                </div>
                <Badge variant="secondary">{b.status}</Badge>
              </div>
            ))}
          </div>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/provider/jobs">View all jobs <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
      )}
    </div>
  );
}
