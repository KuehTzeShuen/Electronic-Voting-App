"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [role, setRole] = useState<"student" | "admin">("student");
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

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Check user exists by email + student_id
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("student_id")
        .eq("email", email)
        .eq("student_id", studentId)
        .eq("role", role)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!data) throw new Error("No account found for this email and student ID");
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("appRole", role);
          localStorage.setItem("appEmail", email);
        }
      } catch {}
      router.push(role === "admin" ? "/polling-menu" : "/polling-menu");
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Login failed");
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
          Login
        </h1>
      </header>

      <div className="w-full max-w-xs px-6 relative z-10">
        {error && (
          <div className="mb-4 text-sm text-destructive">{error}</div>
        )}
      </div>

      <Card className="w-full max-w-xs border-muted/40 bg-card/60 backdrop-blur relative z-10">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={login} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="studentId">Student ID</Label>
              <Input id="studentId" type="text" value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g. 12345678" required />
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
              {loading ? "Checking..." : "Login"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account? <a href="/signup" className="underline">Sign up</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}