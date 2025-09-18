"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Step = "email" | "otp" | "studentId";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === "object" && "message" in error) {
      try {
        return String((error as { message?: unknown }).message) || "Unknown error";
      } catch {
        return "Unknown error";
      }
    }
    return "Unknown error";
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined, // Remove redirect to force OTP
        },
      });
      if (signInError) throw signInError;
      setStep("otp");
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });
      if (verifyError) throw verifyError;
      if (!data?.user) throw new Error("No user returned after verification");
      setStep("studentId");
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const saveStudentId = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { studentId },
      });
      if (updateError) throw updateError;
      router.push("/polling-menu");
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to save student ID");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center relative overflow-hidden">
      {/* Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient circles */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-secondary/20 to-transparent rounded-full blur-3xl animate-float-delayed"></div>
        
        {/* Medium shapes */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-gradient-to-tl from-primary/15 to-transparent rounded-full blur-xl animate-float-delayed"></div>
        
        {/* Small accent shapes */}
        <div className="absolute top-1/3 right-1/3 w-16 h-16 bg-gradient-to-br from-chart-1/20 to-transparent rounded-full blur-lg animate-float"></div>
        <div className="absolute bottom-1/3 left-1/3 w-20 h-20 bg-gradient-to-tl from-chart-2/15 to-transparent rounded-full blur-lg animate-float-delayed"></div>
        
        {/* Additional decorative elements */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary/30 rounded-full animate-pulse"></div>
        <div className="absolute top-1/6 right-1/6 w-1 h-1 bg-chart-3/40 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-1/6 left-1/6 w-1.5 h-1.5 bg-chart-4/30 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <header className="w-full px-6 pt-8 pb-6 relative z-10">
        <h1 className="text-foreground text-xl font-semibold">
          {step === "email" && "Welcome"}
          {step === "otp" && "Check your email"}
          {step === "studentId" && "One last step"}
        </h1>
      </header>

      <div className="w-full max-w-xs px-6 relative z-10">
        {error && (
          <div className="mb-4 text-sm text-destructive">{error}</div>
        )}
      </div>

      {step === "email" && (
        <Card className="w-full max-w-xs border-muted/40 bg-card/60 backdrop-blur relative z-10">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Student Email</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={sendOtp} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending..." : "Send code"}
              </Button>
              <p className="text-xs text-muted-foreground">We&apos;ll email you a one-time code.</p>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "otp" && (
        <Card className="w-full max-w-xs border-muted/40 bg-card/60 backdrop-blur relative z-10">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Enter code</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={verifyOtp} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="otp">Code</Label>
                <Input id="otp" inputMode="numeric" pattern="[0-9]*" value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit code" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Verifying..." : "Verify"}
              </Button>
              <p className="text-xs text-muted-foreground">Sent to {email}</p>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "studentId" && (
        <Card className="w-full max-w-xs border-muted/40 bg-card/60 backdrop-blur relative z-10">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Student details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveStudentId} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input id="studentId" type="text" value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g. 12345678" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving..." : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}