"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  vote_type: "single" | "preferential";
  starts_at: string | null;
  ends_at: string | null;
  is_published: boolean | null;
  club: string | null;
};

export default function CompletedPollsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [completedCampaigns, setCompletedCampaigns] = useState<Campaign[]>([]);
  const [roleLoading, setRoleLoading] = useState(true);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const router = useRouter();

  const initialRole = ((): "student" | "admin" | null => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("appRole");
      return stored === "admin" || stored === "student" ? stored : null;
    } catch {
      return null;
    }
  })();

  const [role] = useState<"student" | "admin" | null>(initialRole);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<{ email: string; role: "student" | "admin"; first_name?: string; last_name?: string; student_id?: string; gender?: string; ug_pg?: string; dob?: string; discipline?: string; location?: string; grade?: string } | null>(null);

  // Load profile on mount
  React.useEffect(() => {
    (async () => {
      setRoleLoading(true);
      try {
        const stored = localStorage.getItem("appRole");
        const storedEmail = localStorage.getItem("appEmail");
        if (stored === "admin" || stored === "student") {
          // Load detailed profile information immediately
          if (storedEmail) {
            try {
              const { data: userData } = await supabase
                .from("users")
                .select("first_name, last_name, student_id, gender, ug_pg, dob, discipline, location, grade")
                .eq("email", storedEmail)
                .single();
              
              setProfile({ 
                email: storedEmail, 
                role: stored as "student" | "admin",
                ...userData
              });
            } catch {
              // Fallback to basic profile if detailed fetch fails
              setProfile({ email: storedEmail, role: stored as "student" | "admin" });
            }
          }
        }
      } finally {
        setRoleLoading(false);
      }
    })();
  }, []);

  // Load campaigns without caching
  React.useEffect(() => {
    (async () => {
      setCampaignsLoading(true);
      try {
        // Fetch fresh data from database
        const { data } = await supabase
          .from("campaigns")
          .select("id, title, description, vote_type, starts_at, ends_at, is_published, club")
          .order("starts_at", { ascending: false })
          .limit(100);
        
        if (Array.isArray(data)) {
          const allCampaigns = data as Campaign[];
          setCampaigns(allCampaigns);
          
          // Filter for completed polls
          const now = new Date().toISOString();
          const completed = allCampaigns.filter(c => 
            c.ends_at && new Date(c.ends_at).toISOString() <= now
          );
          
          setCompletedCampaigns(completed);
        }
      } finally {
        setCampaignsLoading(false);
      }
    })();
  }, []);

  async function toggleProfile() {
    setProfileOpen(!profileOpen);
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!role) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background Shapes (match ongoing polls) */}
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

      <header className="w-full px-6 pt-8 pb-4 flex items-center justify-between relative z-10">
        <h1 className="text-foreground text-2xl font-semibold">Completed Polls</h1>
      </header>

      {/* Profile modal moved to global navbar */}

      <main className="w-full px-4 pt-6 pb-10 space-y-6 relative z-10">
        {(roleLoading || campaignsLoading) && (
          <div className="w-full max-w-2xl mx-auto">
            {Array.from({ length: campaigns.length > 0 ? campaigns.length : 3 }).map((_, index) => (
              <div key={index} className="h-32 rounded-xl bg-muted animate-pulse mb-3" />
            ))}
          </div>
        )}
        
        {!roleLoading && !campaignsLoading && (
          <div className="w-full max-w-2xl mx-auto">
            {completedCampaigns.length > 0 ? (
              <div className="space-y-4">
                {completedCampaigns.map((c) => (
                  <div
                    key={c.id}
                    className="relative group rounded-xl border border-border bg-background/50 p-4 overflow-hidden opacity-80"
                    onMouseMove={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      const rect = el.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      el.style.setProperty('--x', `${x}px`);
                      el.style.setProperty('--y', `${y}px`);
                      const base = Math.min(rect.width, rect.height);
                      const r = Math.max(260, Math.min(560, base * 0.8));
                      el.style.setProperty('--r', `${r}px`);
                    }}
                  >
                    {/* Role-aware style glow (dynamic circular, more subtle) */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[radial-gradient(var(--r)_var(--r)_at_var(--x)_var(--y),rgba(99,102,241,0.08)_0%,rgba(99,102,241,0.04)_40%,transparent_85%)]" />
                    <div className="relative">
                      {c.club && <div className="text-sm text-muted-foreground font-medium">{c.club}</div>}
                      <div className="text-foreground text-lg font-semibold mt-1 tracking-tight">{c.title}</div>
                      {c.description && <div className="text-muted-foreground text-xs mt-1">{c.description}</div>}
                      {c.ends_at && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Ended: {new Date(c.ends_at).toLocaleDateString()} at {new Date(c.ends_at).toLocaleTimeString()}
                        </div>
                      )}
                      {role === "admin" && (
                        <div className="flex items-center gap-2 mt-4">
                          <Button size="sm" variant="secondary" className="hover:bg-white/10" onClick={() => router.push(`/poll/${c.id}/results`)}>
                            View Results
                          </Button>
                          <Button size="sm" variant="secondary" className="hover:bg-white/10" onClick={() => router.push(`/poll/${c.id}/summary`)}>
                            View Summary
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No completed polls yet.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
