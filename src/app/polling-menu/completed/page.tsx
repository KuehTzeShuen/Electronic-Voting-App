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
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20"></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <header className="w-full px-6 pt-8 pb-4 flex items-center justify-between relative z-10">
        <h1 className="text-foreground text-2xl font-semibold">Completed Polls</h1>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => router.push("/polling-menu")}
          >
            Back to Ongoing
          </Button>
          <Button size="sm" variant="secondary" onClick={toggleProfile}>Profile</Button>
        </div>
      </header>

      {profileOpen && (
        <>
          <div className="fixed inset-0 z-[999] bg-black/40" onClick={toggleProfile} />
          <div className="fixed right-6 top-20 z-[1000] w-64 rounded-md border border-border bg-card p-3 shadow-lg">
            <div className="text-sm font-medium text-foreground mb-2">Profile</div>
            <div className="text-xs text-muted-foreground space-y-1 max-h-80 overflow-y-auto">
              <div><span className="font-medium text-foreground">Email:</span> {profile?.email ?? "-"}</div>
              <div><span className="font-medium text-foreground">Name:</span> {(profile?.first_name ?? "-") + " " + (profile?.last_name ?? "")}</div>
              <div><span className="font-medium text-foreground">Student ID:</span> {profile?.student_id ?? "-"}</div>
              <div><span className="font-medium text-foreground">Gender:</span> {profile?.gender ?? "-"}</div>
              <div><span className="font-medium text-foreground">Level:</span> {profile?.ug_pg ?? "-"}</div>
              <div><span className="font-medium text-foreground">Date of Birth:</span> {profile?.dob ? new Date(profile.dob).toLocaleDateString() : "-"}</div>
              <div><span className="font-medium text-foreground">Discipline:</span> {profile?.discipline ?? "-"}</div>
              <div><span className="font-medium text-foreground">Location:</span> {profile?.location ?? "-"}</div>
              <div><span className="font-medium text-foreground">Grade:</span> {profile?.grade ?? "-"}</div>
              <div><span className="font-medium text-foreground">Role:</span> {profile?.role ?? "-"}</div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button className="rounded-md bg-secondary text-secondary-foreground px-3 py-1 text-xs" onClick={toggleProfile}>Close</button>
              <button className="rounded-md bg-destructive text-destructive-foreground px-3 py-1 text-xs" onClick={() => {
                try {
                  localStorage.removeItem("appEmail");
                  localStorage.removeItem("appRole");
                } catch {
                  // localStorage not available
                }
                router.push("/");
              }}>Logout</button>
            </div>
          </div>
        </>
      )}

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
                  <Card key={c.id} className="w-full border-muted/40 bg-card/60 backdrop-blur opacity-75">
                    <CardHeader className="pb-0"></CardHeader>
                    <CardContent>
                      {c.club && <div className="text-sm text-muted-foreground font-medium">{c.club}</div>}
                      <div className="text-foreground text-lg font-semibold mt-1">{c.title}</div>
                      {c.description && <div className="text-muted-foreground text-xs mt-1">{c.description}</div>}
                      {c.ends_at && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Ended: {new Date(c.ends_at).toLocaleDateString()} at {new Date(c.ends_at).toLocaleTimeString()}
                        </div>
                      )}
                      {role === "admin" && (
                        <div className="flex items-center gap-2 mt-4">
                          <Button size="sm" variant="secondary" onClick={() => router.push(`/poll/${c.id}/results`)}>
                            View Results
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => router.push(`/poll/${c.id}/summary`)}>
                            View Summary
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
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
