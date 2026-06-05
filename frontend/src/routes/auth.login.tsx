import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Sparkles, Smartphone, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, setTokens } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Log in — HomeHero" }] }),
  component: Login,
});

const passwordSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});

type Mode = "otp" | "password";

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("otp");

  // Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onLogin = (result: any) => {
    if (!result?.accessToken) throw new Error("Login failed: invalid server response.");
    setTokens(result.accessToken, result.refreshToken);
    toast.success("Welcome back!");
    navigate({ to: "/" });
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const parsed = passwordSchema.safeParse({ email, password });
    if (!parsed.success) { setErr(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      onLogin(await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }));
    } catch (error: any) {
      setErr(error.message ?? "Login failed");
      toast.error(error.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (phone.replace(/\D/g, "").length < 10) { setErr("Enter a valid 10-digit mobile number"); return; }
    setLoading(true);
    try {
      const res = await apiFetch("/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) });
      setOtpSent(true);
      // In dev the API returns the OTP so it can be tested without SMS.
      if (res.dev_otp) toast.info(`Dev OTP: ${res.dev_otp}`);
      else toast.success("OTP sent to your phone");
    } catch (error: any) {
      setErr(error.message ?? "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (otp.length < 4) { setErr("Enter the OTP"); return; }
    setLoading(true);
    try {
      onLogin(await apiFetch("/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone, otp }) }));
    } catch (error: any) {
      setErr(error.message ?? "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Welcome to HomeHero</h1>
        <p className="mt-1 text-sm text-muted-foreground">Log in to book or manage services</p>
      </div>

      {/* Mode toggle */}
      <div className="mt-8 flex gap-1 rounded-xl border bg-muted/40 p-1">
        <button onClick={() => { setMode("otp"); setErr(null); }} className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
          mode === "otp" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}>
          <Smartphone className="h-4 w-4" /> Mobile OTP
        </button>
        <button onClick={() => { setMode("password"); setErr(null); }} className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
          mode === "password" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}>
          <Mail className="h-4 w-4" /> Email
        </button>
      </div>

      {mode === "otp" ? (
        <div className="mt-4 rounded-2xl border bg-card p-6">
          {!otpSent ? (
            <form onSubmit={requestOtp} className="space-y-4">
              <div>
                <Label htmlFor="phone">Mobile number</Label>
                <Input id="phone" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number" autoComplete="tel" />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending…" : "Send OTP"}</Button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <button type="button" onClick={() => { setOtpSent(false); setOtp(""); setErr(null); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Change number
              </button>
              <div>
                <Label htmlFor="otp">Enter OTP sent to {phone}</Label>
                <Input id="otp" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  maxLength={6} placeholder="6-digit code" className="text-center text-lg tracking-[0.3em]" autoFocus />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Verifying…" : "Verify & continue"}</Button>
              <button type="button" onClick={requestOtp} className="w-full text-center text-xs text-primary hover:underline">Resend OTP</button>
            </form>
          )}
        </div>
      ) : (
        <form onSubmit={submitPassword} className="mt-4 space-y-4 rounded-2xl border bg-card p-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Log in"}</Button>
        </form>
      )}

      <div className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/auth/signup-customer" className="font-medium text-primary hover:underline">Create an account</Link>
        {" · "}
        <Link to="/auth/signup-expert" className="font-medium text-primary hover:underline">Become an expert</Link>
      </div>
    </div>
  );
}
