import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Lock, Check, Camera, MapPin, Plus, Trash2, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My Account — HomeHero" }] }),
  component: AccountPage,
});

const PRESETS = [
  "https://randomuser.me/api/portraits/women/32.jpg",
  "https://randomuser.me/api/portraits/women/45.jpg",
  "https://randomuser.me/api/portraits/men/22.jpg",
  "https://randomuser.me/api/portraits/men/41.jpg",
  "https://randomuser.me/api/portraits/women/12.jpg",
  "https://randomuser.me/api/portraits/men/64.jpg",
];

const BLANK_ADDR = { label: "", flat: "", address_line: "", city: "", pincode: "" };

function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState({ name: "", phone: "", city: "", avatar_url: "" });
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [addrForm, setAddrForm] = useState(BLANK_ADDR);

  useEffect(() => { if (!loading && !user) router.navigate({ to: "/auth/login" }); }, [user, loading, router]);

  const { data: me, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["me"],
    queryFn: () => apiFetch("/me"),
  });

  useEffect(() => {
    if (me) setForm({ name: me.name ?? "", phone: me.phone ?? "", city: me.city ?? "", avatar_url: me.avatar_url ?? "" });
  }, [me]);

  const { data: addresses = [] } = useQuery({
    enabled: !!user,
    queryKey: ["addresses"],
    queryFn: () => apiFetch("/addresses"),
  });

  const saveProfile = useMutation({
    mutationFn: () => apiFetch("/me", { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["me"] });
      window.dispatchEvent(new Event("homehero-auth-changed"));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const changePassword = useMutation({
    mutationFn: () => apiFetch("/me/password", { method: "PATCH", body: JSON.stringify({ current_password: pw.current_password, new_password: pw.new_password }) }),
    onSuccess: () => { toast.success("Password changed"); setPw({ current_password: "", new_password: "", confirm: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const addAddress = useMutation({
    mutationFn: () => apiFetch("/addresses", { method: "POST", body: JSON.stringify(addrForm) }),
    onSuccess: () => {
      toast.success("Address saved");
      setAddrForm(BLANK_ADDR);
      setShowAddAddr(false);
      qc.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => apiFetch(`/addresses/${id}/default`, { method: "PATCH" }),
    onSuccess: () => { toast.success("Default address updated"); qc.invalidateQueries({ queryKey: ["addresses"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAddress = useMutation({
    mutationFn: (id: string) => apiFetch(`/addresses/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Address removed"); qc.invalidateQueries({ queryKey: ["addresses"] }); },
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

      {/* Addresses card */}
      <div className="mt-6 rounded-2xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" /> Addresses</div>
          {!showAddAddr && (
            <Button size="sm" variant="outline" onClick={() => setShowAddAddr(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add address
            </Button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {(addresses as any[]).map((a) => (
            <div key={a.id} className={cn(
              "flex items-start justify-between gap-3 rounded-xl border p-4",
              a.is_default ? "border-primary/40 bg-primary/5" : "border-border",
            )}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{a.label || "Address"}</span>
                  {a.is_default && <Badge variant="secondary" className="text-[10px] px-1.5 py-0"><Star className="mr-0.5 h-2.5 w-2.5" />Default</Badge>}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {[a.flat, a.address_line].filter(Boolean).join(", ")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {[a.city, a.pincode].filter(Boolean).join(" — ")}
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {!a.is_default && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={setDefault.isPending}
                    onClick={() => setDefault.mutate(a.id)}>
                    Set default
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7 border-red-200 text-red-600 hover:bg-red-50" disabled={deleteAddress.isPending}
                  onClick={() => deleteAddress.mutate(a.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(addresses as any[]).length === 0 && !showAddAddr && (
            <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
          )}
        </div>

        {showAddAddr && (
          <div className="mt-4 rounded-xl border p-4">
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-3">New address</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Label (optional)</Label>
                <Input className="mt-1" placeholder="Home, Work…" value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} />
              </div>
              <div>
                <Label>Flat / House no.</Label>
                <Input className="mt-1" placeholder="Flat 4B" value={addrForm.flat} onChange={(e) => setAddrForm({ ...addrForm, flat: e.target.value })} />
              </div>
              <div>
                <Label>Address line <span className="text-destructive">*</span></Label>
                <Input className="mt-1" placeholder="Street / Area" value={addrForm.address_line} onChange={(e) => setAddrForm({ ...addrForm, address_line: e.target.value })} />
              </div>
              <div>
                <Label>City <span className="text-destructive">*</span></Label>
                <Input className="mt-1" placeholder="City" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} />
              </div>
              <div>
                <Label>Pincode <span className="text-destructive">*</span></Label>
                <Input className="mt-1" placeholder="110001" value={addrForm.pincode} onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value })} />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button disabled={addAddress.isPending} onClick={() => {
                if (!addrForm.address_line.trim() || !addrForm.city.trim() || !addrForm.pincode.trim()) {
                  toast.error("Address line, city and pincode are required");
                  return;
                }
                addAddress.mutate();
              }}>
                {addAddress.isPending ? "Saving…" : "Save address"}
              </Button>
              <Button variant="outline" onClick={() => { setShowAddAddr(false); setAddrForm(BLANK_ADDR); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
