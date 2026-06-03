import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth/signup-provider")({
  head: () => ({ meta: [{ title: "Become a pro — HomeHero" }] }),
  component: SignupProvider,
});

const step1Schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  phone: z.string().trim().min(7).max(20),
  city: z.string().trim().min(2).max(80),
  password: z.string().min(6),
});

function SignupProvider() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState({ name: "", email: "", phone: "", city: "", password: "", bio: "", experience: 0, hourlyRate: 300 });
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [docNotes, setDocNotes] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-active"],
    queryFn: async () => {
      return await apiFetch('/categories');
    },
  });

  const next = () => {
    if (step === 1) {
      const p = step1Schema.safeParse(info);
      if (!p.success) { toast.error(p.error.issues[0].message); return; }
    }
    if (step === 2 && selectedCats.length === 0) {
      toast.error("Select at least one service category"); return;
    }
    setStep(step + 1);
  };

  const submit = async () => {
    setLoading(true);
    try {
      await apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          name: info.name,
          email: info.email,
          phone: info.phone,
          password: info.password,
          city: info.city,
          role: 'PROVIDER',
          bio: info.bio,
          experience_years: info.experience,
          hourly_rate: info.hourlyRate,
          category_ids: selectedCats,
        }),
      });
      toast.success('Welcome! Your KYC will be reviewed shortly.');
      navigate({ to: '/' });
    } catch (error: any) {
      toast.error(error.message ?? 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleCat = (id: string) => {
    setSelectedCats((s) => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Join as a service pro</h1>
        <p className="mt-1 text-sm text-muted-foreground">Start earning in 3 quick steps</p>
      </div>

      {/* Stepper */}
      <div className="mt-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-semibold",
              step === s && "border-primary bg-primary text-primary-foreground",
              step > s && "border-primary bg-primary/10 text-primary",
              step < s && "border-border text-muted-foreground"
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
                <Textarea value={info.bio} onChange={(e) => setInfo({ ...info, bio: e.target.value })} placeholder="What do you specialize in?" rows={3} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Services & rate</h2>
            <p className="text-sm text-muted-foreground">Pick the services you offer</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categories.map((c: any) => {
                const checked = selectedCats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCat(c.id)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-sm font-medium transition-all",
                      checked ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40"
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Years of experience</Label>
                <Input type="number" min={0} value={info.experience} onChange={(e) => setInfo({ ...info, experience: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Hourly rate (₹)</Label>
                <Input type="number" min={0} value={info.hourlyRate} onChange={(e) => setInfo({ ...info, hourlyRate: Number(e.target.value) })} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">KYC verification</h2>
            <p className="text-sm text-muted-foreground">
              We'll request your Aadhaar, PAN and bank details after you sign up so you can start receiving payouts.
            </p>
            <div className="rounded-xl border-2 border-dashed bg-muted/30 p-8 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Document upload happens in your dashboard</p>
              <p className="mt-1 text-xs text-muted-foreground">You'll be guided through it after signup</p>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="terms" required />
              <Label htmlFor="terms" className="text-sm font-normal leading-relaxed">
                I agree to HomeHero's Terms and Pro Code of Conduct
              </Label>
            </div>
            <Textarea value={docNotes} onChange={(e) => setDocNotes(e.target.value)} placeholder="Anything we should know? (optional)" rows={2} />
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 1}>Back</Button>
          {step < 3 ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <Button onClick={submit} disabled={loading}>
              {loading ? "Creating…" : "Create account"}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already a pro? <Link to="/auth/login" className="font-medium text-primary hover:underline">Log in</Link>
      </div>
    </div>
  );
}
