import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Users, ShieldCheck, Briefcase, IndianRupee, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — HomeHero" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading) {
      if (!user) router.navigate({ to: "/auth/login" });
      else if (role && role !== "ADMIN") router.navigate({ to: "/" });
    }
  }, [user, role, loading, router]);

  const { data, isLoading } = useQuery({
    enabled: role === "ADMIN",
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [{ count: bookings }, { count: providers }, { data: pending }, { data: revenue }] = await Promise.all([
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("providers").select("*", { count: "exact", head: true }),
        supabase
          .from("providers")
          .select("id, bio, hourly_rate, is_verified, profiles!inner(name, city)")
          .eq("is_verified", false)
          .limit(20),
        supabase.from("bookings").select("platform_fee").eq("status", "COMPLETED"),
      ]);
      const totalRevenue = (revenue ?? []).reduce((s: number, r: any) => s + Number(r.platform_fee || 0), 0);
      return { bookings: bookings ?? 0, providers: providers ?? 0, pending: pending ?? [], totalRevenue };
    },
  });

  const verify = useMutation({
    mutationFn: async ({ id, is_verified }: { id: string; is_verified: boolean }) => {
      const { error } = await supabase.from("providers").update({ is_verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provider updated");
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;

  const stats = [
    { icon: Briefcase, label: "Total bookings", value: data?.bookings ?? 0 },
    { icon: Users, label: "Providers", value: data?.providers ?? 0 },
    { icon: ShieldCheck, label: "Pending KYC", value: data?.pending.length ?? 0 },
    { icon: IndianRupee, label: "Revenue", value: `₹${Number(data?.totalRevenue ?? 0).toFixed(0)}` },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Admin overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">Platform health and provider verification</p>

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

      <section className="mt-10">
        <h2 className="text-xl font-bold">Provider verification queue</h2>
        <div className="mt-4 space-y-3">
          {(data?.pending ?? []).length === 0 ? (
            <div className="rounded-2xl border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
              No providers awaiting verification.
            </div>
          ) : (
            data!.pending.map((p: any) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{p.profiles?.name ?? "Provider"}</h3>
                    <Badge variant="secondary">{p.profiles?.city ?? "—"}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{p.bio || "No bio yet"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => verify.mutate({ id: p.id, is_verified: false })}>
                    <XCircle className="mr-1 h-4 w-4" /> Reject
                  </Button>
                  <Button size="sm" onClick={() => verify.mutate({ id: p.id, is_verified: true })}>
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
