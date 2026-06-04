import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Lock, Check, Camera } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My Account — HomeHero" }] }),
  component: AccountPage,
});

// A small gallery of preset avatars users can pick without uploading.
const PRESETS = [
  "https://randomuser.me/api/portraits/women/32.jpg",
  "https://randomuser.me/api/portraits/women/45.jpg",
  "https://randomuser.me/api/portraits/men/22.jpg",
  "https://randomuser.me/api/portraits/men/41.jpg",
  "https://randomuser.me/api/portraits/women/12.jpg",
  "https://randomuser.me/api/portraits/men/64.jpg",
];

function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState({ name: "", phone: "", city: "", avatar_url: "" });
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });

  useEffect(() => { if (!loading && !user) router.navigate({ to: "/auth/login" }); }, [user, loading, router]);

  const { data: me, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["me"],
    queryFn: () => apiFetch("/me"),
  });

  useEffect(() => {
    if (me) setForm({ name: me.name ?? "", phone: me.phone ?? "", city: me.city ?? "", avatar_url: me.avatar_url ?? "" });
  }, [me]);

  const saveProfile = useMutation({
    mutationFn: () => apiFetch("/me", { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["me"] });
      // Let the navbar refresh its avatar/name.
      window.dispatchEvent(new Event("homehero-auth-changed"));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const changePassword = useMutation({
    mutationFn: () => apiFetch("/me/password", { method: "PATCH", body: JSON.stringify({ current_password: pw.current_password, new_password: pw.new_password }) }),
    onSuccess: () => { toast.success("Password changed"); setPw({ current_password: "", new_password: "", confirm: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">My Account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your profile and password</p>

      {/* Profile card */}
      <div className="mt-8 rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4 text-primary" /> Profile</div>

        <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <Avatar src={form.avatar_url} name={form.name || me?.email} size={88} />
            <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground shadow"><Camera className="h-3.5 w-3.5" /></span>
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Choose an avatar</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p} onClick={() => setForm({ ...form, avatar_url: p })}
                  className={cn("relative h-11 w-11 overflow-hidden rounded-full ring-2 transition-all", form.avatar_url === p ? "ring-primary" : "ring-transparent hover:ring-border")}>
                  <img src={p} alt="" className="h-full w-full object-cover" />
                  {form.avatar_url === p && <span className="absolute inset-0 grid place-items-center bg-primary/40"><Check className="h-4 w-4 text-white" /></span>}
                </button>
              ))}
            </div>
            <Input className="mt-2" placeholder="…or paste an image URL" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div><Label>Full name</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Email</Label><Input className="mt-1" value={me?.email ?? ""} disabled /></div>
          <div><Label>Phone</Label><Input className="mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>City</Label><Input className="mt-1" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
        </div>
        <Button className="mt-5" disabled={saveProfile.isPending} onClick={() => saveProfile.mutate()}>
          {saveProfile.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {/* Password card */}
      <div className="mt-6 rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold"><Lock className="h-4 w-4 text-primary" /> Change password</div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div><Label>Current</Label><Input type="password" className="mt-1" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} autoComplete="current-password" /></div>
          <div><Label>New</Label><Input type="password" className="mt-1" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} autoComplete="new-password" /></div>
          <div><Label>Confirm new</Label><Input type="password" className="mt-1" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" /></div>
        </div>
        <Button className="mt-5" variant="outline" disabled={changePassword.isPending} onClick={() => {
          if (!pw.current_password || !pw.new_password) { toast.error("Fill in both password fields"); return; }
          if (pw.new_password.length < 6) { toast.error("New password must be at least 6 characters"); return; }
          if (pw.new_password !== pw.confirm) { toast.error("New passwords don't match"); return; }
          changePassword.mutate();
        }}>
          {changePassword.isPending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </div>
  );
}
