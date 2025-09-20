"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [studentId, setStudentId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"student" | "admin">("student");
  const [step, setStep] = useState<"email" | "otp" | "details">("email");
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
      // If an account already exists for this email, prompt to login instead
      const { data: existing, error: existingErr } = await supabase
        .from("users")
        .select("student_id")
        .eq("email", email)
        .eq("role", role)
        .limit(1)
        .maybeSingle();
      if (existingErr) throw existingErr;
      if (existing) {
        setError("An account with this email already exists. Please login instead.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
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
      setStep("details");
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: insertError } = await supabase.from("users").insert({
        student_id: studentId,
        first_name: firstName,
        last_name: lastName,
        email,
        role,
        created_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;
      router.push("/polling-menu");
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to save details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center relative overflow-hidden">
      <header className="w-full px-6 pt-8 pb-6 relative z-10">
        <h1 className="text-foreground text-2xl font-semibold">Sign up</h1>
      </header>

      <div className="w-full max-w-xs px-6 relative z-10">
        {error && <div className="mb-4 text-sm text-destructive">{error}</div>}
      </div>

      {step === "email" && (
        <Card className="w-full max-w-xs border-muted/40 bg-card/60 backdrop-blur relative z-10">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Sign up using your student email</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={sendOtp} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu" required />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                  <span className="text-sm text-muted-foreground">{role === "student" ? "Student" : "Admin"}</span>
                  <button
                    type="button"
                    onClick={() => setRole(prev => (prev === "student" ? "admin" : "student"))}
                    className="rounded-md bg-secondary text-secondary-foreground px-3 py-1 text-xs"
                  >
                    Toggle
                  </button>
                </div>
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

      {step === "details" && (
        <Card className="w-full max-w-xs border-muted/40 bg-card/60 backdrop-blur relative z-10">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Student details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveDetails} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Alex" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Tan" required />
              </div>
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


