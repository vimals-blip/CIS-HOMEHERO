import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  User as UserIcon, Lock, Check, Camera, MapPin, Plus, 
  Trash2, Star, Shield, ArrowRight
} from "lucide-react";
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
type SettingsTab = "profile" | "password" | "addresses";

function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [form, setForm] = useState({ name: "", phone: "", city: "", avatar_url: "" });
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [addrForm, setAddrForm] = useState(BLANK_ADDR);

  useEffect(() => { 
    if (!loading && !user) router.navigate({ to: "/auth/login" }); 
  }, [user, loading, router]);

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
      toast.success("Profile updated successfully!");
      qc.invalidateQueries({ queryKey: ["me"] });
      window.dispatchEvent(new Event("homehero-auth-changed"));
    },
    onError: (e: any) => toast.error(e.message ?? "Profile update failed"),
  });

  const changePassword = useMutation({
    mutationFn: () => apiFetch("/me/password", { 
      method: "PATCH", 
      body: JSON.stringify({ current_password: pw.current_password, new_password: pw.new_password }) 
    }),
    onSuccess: () => { 
      toast.success("Password changed successfully!"); 
      setPw({ current_password: "", new_password: "", confirm: "" }); 
    },
    onError: (e: any) => toast.error(e.message ?? "Password update failed"),
  });

  const addAddress = useMutation({
    mutationFn: () => apiFetch("/addresses", { method: "POST", body: JSON.stringify(addrForm) }),
    onSuccess: () => {
      toast.success("Address saved successfully!");
      setAddrForm(BLANK_ADDR);
      setShowAddAddr(false);
      qc.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save address"),
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => apiFetch(`/addresses/${id}/default`, { method: "PATCH" }),
    onSuccess: () => { 
      toast.success("Default address updated!"); 
      qc.invalidateQueries({ queryKey: ["addresses"] }); 
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update default address"),
  });

  const deleteAddress = useMutation({
    mutationFn: (id: string) => apiFetch(`/addresses/${id}`, { method: "DELETE" }),
    onSuccess: () => { 
      toast.success("Address removed successfully!"); 
      qc.invalidateQueries({ queryKey: ["addresses"] }); 
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete address"),
  });

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">My Account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Manage your settings, password, and addresses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        
        {/* Left Column - User Profile Card & Navigation Tabs Menu */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-3xl border bg-card p-6 shadow-sm flex flex-col items-center text-center">
            
            {/* User Avatar Summary Header */}
            <div className="relative group">
              <Avatar src={form.avatar_url} name={form.name || me?.email} size={96} className="border-2 border-primary/20" />
              <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md">
                <Camera className="h-4 w-4" />
              </span>
            </div>
            
            <h2 className="mt-4 font-extrabold text-foreground text-lg tracking-tight">
              {form.name || "HomeHero Member"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 break-all w-full px-2">{me?.email}</p>
            
            <Badge variant="secondary" className="mt-3.5 bg-primary/10 text-primary border-primary/10 font-bold px-3 py-1 text-[10px] uppercase tracking-wider">
              Customer Account
            </Badge>

            {/* Separator */}
            <div className="w-full border-t border-border mt-6 pt-6 flex flex-col gap-1 text-left">
              {[
                { id: "profile", label: "Personal Info", icon: UserIcon },
                { id: "password", label: "Password & Security", icon: Lock },
                { id: "addresses", label: "Saved Addresses", icon: MapPin },
              ].map((tabItem) => {
                const TabIcon = tabItem.icon;
                const isSelected = activeTab === tabItem.id;
                return (
                  <button
                    key={tabItem.id}
                    onClick={() => setActiveTab(tabItem.id as SettingsTab)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left",
                      isSelected 
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" 
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <TabIcon className="h-4.5 w-4.5 shrink-0" />
                      {tabItem.label}
                    </span>
                    <ArrowRight className={cn("h-4 w-4 shrink-0 opacity-0 transition-all", isSelected && "opacity-100 translate-x-0.5")} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Selected Settings Tab Panel */}
        <div className="lg:col-span-8">
          
          {/* PERSONAL INFO PANEL */}
          {activeTab === "profile" && (
            <div className="rounded-3xl border bg-card p-6 md:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-foreground mb-1">Personal Info</h2>
              <p className="text-xs text-muted-foreground mb-6">Update your public details and pick an avatar profile image</p>

              <div className="flex flex-col gap-6">
                
                {/* Avatar Picker Presets */}
                <div>
                  <Label className="text-xs font-bold text-foreground">Choose Avatar Profile</Label>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {PRESETS.map((p) => (
                      <button 
                        key={p} 
                        type="button"
                        onClick={() => setForm({ ...form, avatar_url: p })}
                        className={cn(
                          "relative h-14 w-14 overflow-hidden rounded-full ring-2 transition-all shadow-sm", 
                          form.avatar_url === p ? "ring-primary ring-offset-2 scale-105" : "ring-transparent hover:ring-border"
                        )}
                      >
                        <img src={p} alt="" className="h-full w-full object-cover" />
                        {form.avatar_url === p && (
                          <span className="absolute inset-0 grid place-items-center bg-primary/40">
                            <Check className="h-5 w-5 text-white" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Custom Image Link</Label>
                    <Input 
                      className="mt-1 rounded-xl h-11 border-border" 
                      placeholder="Paste your image URL path..." 
                      value={form.avatar_url} 
                      onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} 
                    />
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="font-bold text-xs">Full Name</Label>
                    <Input 
                      className="mt-1 rounded-xl h-11 border-border" 
                      value={form.name} 
                      onChange={(e) => setForm({ ...form, name: e.target.value })} 
                    />
                  </div>
                  <div>
                    <Label className="font-bold text-xs">Email Address (Read Only)</Label>
                    <Input 
                      className="mt-1 rounded-xl h-11 border-border bg-muted/30" 
                      value={me?.email ?? ""} 
                      disabled 
                    />
                  </div>
                  <div>
                    <Label className="font-bold text-xs">Phone Number</Label>
                    <Input 
                      className="mt-1 rounded-xl h-11 border-border" 
                      value={form.phone} 
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                    />
                  </div>
                  <div>
                    <Label className="font-bold text-xs">Serving City</Label>
                    <Input 
                      className="mt-1 rounded-xl h-11 border-border" 
                      value={form.city} 
                      onChange={(e) => setForm({ ...form, city: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="border-t pt-5 mt-2">
                  <Button 
                    disabled={saveProfile.isPending} 
                    onClick={() => saveProfile.mutate()}
                    className="rounded-xl px-6 font-bold"
                  >
                    {saveProfile.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* PASSWORD SECURITY PANEL */}
          {activeTab === "password" && (
            <div className="rounded-3xl border bg-card p-6 md:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-foreground mb-1">Password & Security</h2>
              <p className="text-xs text-muted-foreground mb-6 font-sans">Change your login credentials to protect your account access</p>

              <div className="space-y-4">
                <div>
                  <Label className="font-bold text-xs">Current Password</Label>
                  <Input 
                    type="password" 
                    className="mt-1 rounded-xl h-11 border-border" 
                    value={pw.current_password} 
                    onChange={(e) => setPw({ ...pw, current_password: e.target.value })} 
                    autoComplete="current-password" 
                  />
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="font-bold text-xs">New Password</Label>
                    <Input 
                      type="password" 
                      className="mt-1 rounded-xl h-11 border-border" 
                      value={pw.new_password} 
                      onChange={(e) => setPw({ ...pw, new_password: e.target.value })} 
                      autoComplete="new-password" 
                    />
                  </div>
                  <div>
                    <Label className="font-bold text-xs">Confirm New Password</Label>
                    <Input 
                      type="password" 
                      className="mt-1 rounded-xl h-11 border-border" 
                      value={pw.confirm} 
                      onChange={(e) => setPw({ ...pw, confirm: e.target.value })} 
                      autoComplete="new-password" 
                    />
                  </div>
                </div>

                <div className="border-t pt-5 mt-4">
                  <Button 
                    disabled={changePassword.isPending} 
                    onClick={() => {
                      if (!pw.current_password || !pw.new_password) { toast.error("Please fill in both current and new password fields"); return; }
                      if (pw.new_password.length < 6) { toast.error("New password must be at least 6 characters long"); return; }
                      if (pw.new_password !== pw.confirm) { toast.error("New passwords do not match"); return; }
                      changePassword.mutate();
                    }}
                    className="rounded-xl px-6 font-bold"
                  >
                    {changePassword.isPending ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* SAVED ADDRESSES PANEL */}
          {activeTab === "addresses" && (
            <div className="rounded-3xl border bg-card p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold text-foreground">Saved Addresses</h2>
                {!showAddAddr && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowAddAddr(true)}
                    className="rounded-xl font-bold h-9 px-4 gap-1.5"
                  >
                    <Plus className="h-4 w-4 shrink-0" /> Add Address
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-6">Manage service delivery address points for your orders</p>

              {showAddAddr && (
                <div className="rounded-2xl border bg-muted/10 p-5 shadow-sm mb-6 transition-all duration-300">
                  <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Add New Address</div>
                  
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label className="font-bold text-xs">Label (optional)</Label>
                      <Input className="mt-1 rounded-xl h-10 border-border" placeholder="e.g. Home, Office, Parents" value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} />
                    </div>
                    <div>
                      <Label className="font-bold text-xs">Flat / House no. <span className="text-destructive">*</span></Label>
                      <Input className="mt-1 rounded-xl h-10 border-border" placeholder="e.g. Flat 4B, 12th Block" value={addrForm.flat} onChange={(e) => setAddrForm({ ...addrForm, flat: e.target.value })} />
                    </div>
                    <div>
                      <Label className="font-bold text-xs">Address Line <span className="text-destructive">*</span></Label>
                      <Input className="mt-1 rounded-xl h-10 border-border" placeholder="e.g. Street name, Area locality" value={addrForm.address_line} onChange={(e) => setAddrForm({ ...addrForm, address_line: e.target.value })} />
                    </div>
                    <div>
                      <Label className="font-bold text-xs">City <span className="text-destructive">*</span></Label>
                      <Input className="mt-1 rounded-xl h-10 border-border" placeholder="City" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} />
                    </div>
                    <div>
                      <Label className="font-bold text-xs">Pincode <span className="text-destructive">*</span></Label>
                      <Input className="mt-1 rounded-xl h-10 border-border" placeholder="Pincode" value={addrForm.pincode} onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value })} />
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2 border-t pt-4">
                    <Button 
                      disabled={addAddress.isPending} 
                      onClick={() => {
                        if (!addrForm.flat.trim() || !addrForm.address_line.trim() || !addrForm.city.trim() || !addrForm.pincode.trim()) {
                          toast.error("House number, address line, city, and pincode are required");
                          return;
                        }
                        addAddress.mutate();
                      }}
                      className="rounded-xl px-5 font-bold h-10"
                    >
                      {addAddress.isPending ? "Saving..." : "Save Address"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => { setShowAddAddr(false); setAddrForm(BLANK_ADDR); }}
                      className="rounded-xl px-4 h-10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Address list */}
              <div className="space-y-3">
                {(addresses as any[]).map((a) => (
                  <div 
                    key={a.id} 
                    className={cn(
                      "flex items-start justify-between gap-4 rounded-2xl border p-4.5 transition-all",
                      a.is_default ? "border-primary/30 bg-primary/[0.02] shadow-sm" : "border-border bg-card"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{a.label || "Address Point"}</span>
                        {a.is_default && (
                          <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0.5 text-primary bg-primary/10 border-primary/10 select-none">
                            <Star className="mr-0.5 h-2.5 w-2.5 fill-primary text-primary" /> Default
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1.5 text-xs text-muted-foreground font-medium">
                        {[a.flat, a.address_line].filter(Boolean).join(", ")}
                      </div>
                      <div className="text-xs text-muted-foreground/85 mt-0.5">
                        {[a.city, a.pincode].filter(Boolean).join(" — ")}
                      </div>
                    </div>
                    
                    <div className="flex shrink-0 gap-1.5 items-center">
                      {!a.is_default && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          disabled={setDefault.isPending}
                          onClick={() => setDefault.mutate(a.id)}
                          className="h-8 text-xs font-bold rounded-xl"
                        >
                          Set Default
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        disabled={deleteAddress.isPending}
                        onClick={() => deleteAddress.mutate(a.id)}
                        className="h-8 w-8 p-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-xl"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(addresses as any[]).length === 0 && !showAddAddr && (
                  <EmptyState 
                    icon={MapPin} 
                    title="No addresses saved yet" 
                    description="Save service delivery address points for faster checkout." 
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
