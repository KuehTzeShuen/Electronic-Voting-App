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
  const [gender, setGender] = useState<"male" | "female">("male");
  const [ugPg, setUgPg] = useState<"UG" | "PG">("UG");
  const [dob, setDob] = useState("");
  const [discipline, setDiscipline] = useState<number>(1);
  const [location, setLocation] = useState<number>(1);
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
      // Get the current authenticated user from Supabase auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("No authenticated user found. Please complete email verification first.");

      const { error: insertError } = await supabase.from("users").insert({
        auth_id: user.id, // Use Supabase auth ID
        student_id: studentId,
        first_name: firstName,
        last_name: lastName,
        email,
        gender,
        ug_pg: ugPg,
        dob,
        discipline,
        location,
        role,
        created_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;
      
      // Store auth session info for the app
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("appRole", role);
          localStorage.setItem("appEmail", email);
        }
      } catch {}
      
      router.push("/polling-menu");
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to save details");
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
        <Card className="w-full max-w-md border-muted/40 bg-card/60 backdrop-blur relative z-10">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Student details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveDetails} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Alex" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Tan" required />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input id="studentId" type="text" value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g. 12345678" required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select 
                    id="gender" 
                    value={gender} 
                    onChange={e => setGender(e.target.value as "male" | "female")}
                    className="w-full rounded-md px-3 py-2 bg-card text-foreground border border-border"
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ugPg">Level</Label>
                  <select 
                    id="ugPg" 
                    value={ugPg} 
                    onChange={e => setUgPg(e.target.value as "UG" | "PG")}
                    className="w-full rounded-md px-3 py-2 bg-card text-foreground border border-border"
                    required
                  >
                    <option value="UG">Undergraduate (UG)</option>
                    <option value="PG">Postgraduate (PG)</option>
                  </select>
                </div>
              </div>
              
      <div className="grid gap-2">
        <Label htmlFor="dob">Date of Birth</Label>
        <Input 
          id="dob" 
          type="date" 
          value={dob} 
          onChange={e => setDob(e.target.value)} 
          required 
          className="[&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
        />
      </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="discipline">Discipline</Label>
                  <select 
                    id="discipline" 
                    value={discipline} 
                    onChange={e => setDiscipline(parseInt(e.target.value))}
                    className="w-full rounded-md px-3 py-2 bg-card text-foreground border border-border"
                    required
                  >
                    <option value={1}>Arts, Design and Architecture</option>
                    <option value={2}>Arts</option>
                    <option value={3}>Business and Economics</option>
                    <option value={4}>Education</option>
                    <option value={5}>Engineering</option>
                    <option value={6}>Information Technology</option>
                    <option value={7}>Law</option>
                    <option value={8}>Medicine, Nursing and Health Sciences</option>
                    <option value={9}>Pharmacy and Pharmaceutical Sciences</option>
                    <option value={10}>Science</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <select 
                    id="location" 
                    value={location} 
                    onChange={e => setLocation(parseInt(e.target.value))}
                    className="w-full rounded-md px-3 py-2 bg-card text-foreground border border-border"
                    required
                  >
                    <option value={1}>Clayton</option>
                    <option value={2}>Caulfield</option>
                    <option value={3}>Peninsula</option>
                    <option value={4}>Parkville</option>
                    <option value={5}>Malaysia</option>
                    <option value={6}>Other</option>
                  </select>
                </div>
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


