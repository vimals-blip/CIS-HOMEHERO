import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth/signup-expert")({
  head: () => ({ meta: [{ title: "Become an expert — HomeHero" }] }),
  component: SignupExpert,
});

const step1Schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  phone: z.string().trim().min(7).max(20),
  city: z.string().trim().min(2).max(80),
  password: z.string().min(6),
});

const GENDERS = ["FEMALE", "MALE", "OTHER"] as const;

function SignupExpert() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState({ name: "", email: "", phone: "", city: "", password: "", bio: "", gender: "FEMALE", experience: 0 });
  const [selected, setSelected] = useState<string[]>([]);

  const { data: services = [] } = useQuery({ queryKey: ["services"], queryFn: () => apiFetch("/services") });

  const next = () => {
    if (step === 1) {
      const p = step1Schema.safeParse(info);
      if (!p.success) { toast.error(p.error.issues[0].message); return; }
    }
    if (step === 2 && selected.length === 0) { toast.error("Select at least one service"); return; }
    setStep(step + 1);
  };

  const submit = async () => {
    setLoading(true);
    try {
      await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: info.name, email: info.email, phone: info.phone, password: info.password, city: info.city,
          role: "EXPERT", gender: info.gender, bio: info.bio, experience_years: info.experience, service_ids: selected,
        }),
      });
      toast.success("Welcome! Your profile will be verified by our team shortly.");
      navigate({ to: "/auth/login" });
    } catch (e: any) {
      toast.error(e.message ?? "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Sparkles className="h-5 w-5" /></div>
        <h1 className="mt-4 text-2xl font-bold">Become a home expert</h1>
        <p className="mt-1 text-sm text-muted-foreground">Flexible hours, steady bookings — sign up in 3 steps</p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-semibold",
              step === s && "border-primary bg-primary text-primary-foreground",
              step > s && "border-primary bg-primary/10 text-primary",
              step < s && "border-border text-muted-foreground",
            )}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className={cn("h-0.5 w-10", step > s ? "bg-primary" : "bg-border")} />}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border bg-card p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Personal info</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Full name</Label><Input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} /></div>
              <div><Label>City</Label><Input value={info.city} onChange={(e) => setInfo({ ...info, city: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Password</Label><Input type="password" value={info.password} onChange={(e) => setInfo({ ...info, password: e.target.value })} /></div>
              <div className="sm:col-span-2">
                <Label>Short bio</Label>
                <Textarea value={info.bio} onChange={(e) => setInfo({ ...info, bio: e.target.value })} placeholder="Tell families about yourself" rows={3} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Services you offer</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(services as any[]).map((s) => (
                <button key={s.id} type="button" onClick={() => toggle(s.id)} className={cn(
                  "rounded-xl border px-3 py-3 text-sm font-medium transition-all",
                  selected.includes(s.id) ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40",
                )}>
                  {s.name}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Years of experience</Label>
                <Input type="number" min={0} value={info.experience} onChange={(e) => setInfo({ ...info, experience: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Gender</Label>
                <div className="mt-1 flex gap-2">
                  {GENDERS.map((g) => (
                    <button key={g} type="button" onClick={() => setInfo({ ...info, gender: g })} className={cn(
                      "flex-1 rounded-xl border px-2 py-2 text-xs font-medium capitalize transition-all",
                      info.gender === g ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40",
                    )}>
                      {g.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Verification</h2>
            <p className="text-sm text-muted-foreground">
              We'll verify your Aadhaar & PAN and provide professional training before you start receiving bookings.
              Your account stays in review until our team approves it.
            </p>
            <div className="rounded-xl border-2 border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              Document verification is handled by our onboarding team after signup.
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 1}>Back</Button>
          {step < 3 ? <Button onClick={next}>Continue</Button> : (
            <Button onClick={submit} disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
          )}
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/auth/login" className="font-medium text-primary hover:underline">Log in</Link>
      </div>
    </div>
  );
}
