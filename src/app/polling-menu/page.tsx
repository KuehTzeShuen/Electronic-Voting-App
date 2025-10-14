"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import React from "react";

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  vote_type: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_published: boolean | null;
  club: string | null;
};

export default function OngoingPollsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ongoingCampaigns, setOngoingCampaigns] = useState<Campaign[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
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
  const [roleLoading] = useState(true);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const router = useRouter();

  const formatTimeRemaining = (iso?: string | null): string | null => {
    if (!iso) return null;
    const endMs = new Date(iso).getTime();
    const nowMs = Date.now();
    const diffMs = endMs - nowMs;
    if (isNaN(endMs)) return null;
    if (diffMs <= 0) return "Ended";
    const totalMinutes = Math.floor(diffMs / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    if (totalDays >= 1) {
      const days = totalDays + (totalHours % 24 > 0 || totalMinutes % 60 > 0 ? 1 : 0); // round up partial days
      return `Ending in ${days} day${days !== 1 ? 's' : ''}`;
    }
    if (totalHours >= 1) {
      return `Ending in ${totalHours} hour${totalHours !== 1 ? 's' : ''}`;
    }
    const mins = Math.max(1, totalMinutes); // show at least 1 minute
    return `Ending in ${mins} minute${mins !== 1 ? 's' : ''}`;
  };

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
          
          // Filter for ongoing polls
          const now = new Date().toISOString();
          const ongoing = allCampaigns.filter(c => 
            c.starts_at && new Date(c.starts_at).toISOString() <= now &&
            c.ends_at && new Date(c.ends_at).toISOString() > now
          );
          
          setOngoingCampaigns(ongoing);
        }
      } finally {
        setCampaignsLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
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

      <header className="w-full px-6 pt-8 pb-4 flex items-center justify-between relative z-10">
        <h1 className="text-foreground text-2xl font-semibold">Polls</h1>
      </header>

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
            {ongoingCampaigns.length > 0 ? (
              <div className="space-y-4">
                {ongoingCampaigns.map((c) => (
                  <div
                    key={c.id}
                    className="relative group rounded-xl border border-border bg-background/50 p-4 overflow-hidden"
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
                    <div className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[radial-gradient(var(--r)_var(--r)_at_var(--x)_var(--y),rgba(99,102,241,0.08)_0%,rgba(99,102,241,0.04)_40%,transparent_85%)]" />
                    <div className="relative z-10">
                      {c.club && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                          <span>{c.club}</span>
                          {c.ends_at && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium bg-red-500/15 text-red-400 border-red-500/30">
                              {formatTimeRemaining(c.ends_at) ?? 'Ending soon'}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-foreground text-xl font-semibold mt-1 tracking-tight">{c.title}</div>
                      {c.description && <div className="text-muted-foreground text-xs mt-2">{c.description}</div>}
                      {c.ends_at && null}
                      {role === "student" ? (
                        <div className="flex items-center gap-2 mt-4">
                          <Input
                            type="text"
                            placeholder="Enter code"
                            value={codes[c.id] || ""}
                            onChange={e => handleCodeChange(c.id, e.target.value)}
                          />
                          <Button size="sm" className="shadow-[0_0_18px_rgba(99,102,241,0.25)]" onClick={() => handleJoin(c.id)} disabled={(codes[c.id] || "").trim() === ""}>
                            Join
                          </Button>
                        </div>
                      ) : (
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
                No ongoing polls at the moment.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );

  function handleCodeChange(campaignId: string, value: string) {
    setCodes(prev => ({ ...prev, [campaignId]: value }));
  }

  async function handleJoin(campaignId: string) {
    const code = codes[campaignId];
    if (!code || code.trim().length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("code")
        .eq("id", campaignId)
        .single();
      
      if (error) throw error;
      
      if (data.code === code.trim()) {
        router.push(`/poll/${campaignId}`);
      } else {
        alert("Invalid access code");
      }
    } catch (error) {
      console.error("Error joining campaign:", error);
      alert("Failed to join campaign");
    }
  }
}