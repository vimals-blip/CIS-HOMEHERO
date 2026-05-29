import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Wallet, Briefcase, Star, TrendingUp, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/provider/")({
  head: () => ({ meta: [{ title: "Provider Dashboard — HomeHero" }] }),
  component: ProviderDashboard,
});

function ProviderDashboard() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) router.navigate({ to: "/auth/login" });
      else if (role && role !== "PROVIDER" && role !== "ADMIN") router.navigate({ to: "/" });
    }
  }, [user, role, loading, router]);

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["provider-dashboard", user?.id],
    queryFn: async () => {
      const [{ data: provider }, { data: wallet }, { data: bookings }] = await Promise.all([
        supabase.from("providers").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("provider_wallet").select("*").eq("provider_id", user!.id).maybeSingle(),
        supabase.from("bookings").select("id, status").eq("provider_id", user!.id),
      ]);
      return { provider, wallet, bookings: bookings ?? [] };
    },
  });

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;

  const active = data?.bookings.filter((b: any) => ["CONFIRMED", "IN_PROGRESS"].includes(b.status)).length ?? 0;
  const completed = data?.bookings.filter((b: any) => b.status === "COMPLETED").length ?? 0;

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
        <Button asChild>
          <Link to="/provider/jobs">View jobs <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
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
        <div className="mt-8 rounded-2xl border bg-amber-500/5 p-6">
          <h3 className="font-semibold">Complete verification</h3>
          <p className="mt-1 text-sm text-muted-foreground">Upload your documents to start receiving bookings.</p>
        </div>
      )}
    </div>
  );
}
