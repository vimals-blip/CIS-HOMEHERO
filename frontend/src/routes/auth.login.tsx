import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Sparkles, Smartphone, Mail, ArrowLeft, Eye, EyeOff, AlertCircle } from "lucide-react";
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
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type Mode = "otp" | "password";

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("otp");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string }>({});

  const onLogin = (result: any) => {
    if (!result?.accessToken) throw new Error("Login failed: invalid server response.");
    setTokens(result.accessToken, result.refreshToken);
    toast.success("Welcome back!");
    const role = result.user?.role;
    const dest = role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin" : role === "EXPERT" ? "/expert" : "/";
    navigate({ to: dest });
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setFieldErr({});

    const parsed = passwordSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { if (i.path[0]) errs[i.path[0] as string] = i.message; });
      setFieldErr(errs);
      return;
    }

    setLoading(true);
    try {
      onLogin(await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }));
    } catch (error: any) {
      const msg = error.message ?? "Login failed";
      // Highlight the password field specifically for credential errors
      if (msg.toLowerCase().includes("invalid email or password") || msg.toLowerCase().includes("credentials")) {
        setFieldErr({ password: "Invalid email or password — please try again" });
      } else {
        setErr(msg);
      }
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
        <button onClick={() => { setMode("otp"); setErr(null); setFieldErr({}); }} className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
          mode === "otp" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}>
          <Smartphone className="h-4 w-4" /> Mobile OTP
        </button>
        <button onClick={() => { setMode("password"); setErr(null); setFieldErr({}); }} className={cn(
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
              {err && <ErrorBox message={err} />}
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
              {err && <ErrorBox message={err} />}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Verifying…" : "Verify & continue"}</Button>
              <button type="button" onClick={requestOtp} className="w-full text-center text-xs text-primary hover:underline">Resend OTP</button>
            </form>
          )}
        </div>
      ) : (
        <form onSubmit={submitPassword} className="mt-4 space-y-4 rounded-2xl border bg-card p-6">
          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email" type="email" value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErr((f) => ({ ...f, email: undefined })); }}
              required autoComplete="email"
              className={cn(fieldErr.email && "border-destructive focus-visible:ring-destructive")}
            />
            {fieldErr.email && <FieldError message={fieldErr.email} />}
          </div>

          {/* Password with show/hide toggle */}
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErr((f) => ({ ...f, password: undefined })); }}
                required autoComplete="current-password"
                className={cn("pr-10", fieldErr.password && "border-destructive focus-visible:ring-destructive")}
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErr.password && <FieldError message={fieldErr.password} />}
          </div>

          {err && <ErrorBox message={err} />}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Log in"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Forgot your password?{" "}
            <Link to="/support" className="text-primary hover:underline">Contact support</Link>
          </p>
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

function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 shrink-0" /> {message}
    </p>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
