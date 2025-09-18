"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function NewPollPage() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "admin" | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [club, setClub] = useState("");
  const [title, setTitle] = useState("");
  const [extra, setExtra] = useState("");
  const [code, setCode] = useState("");
  const [votingType, setVotingType] = useState<"single" | "preferential">("single");
  const [startsAt, setStartsAt] = useState<string>("");
  const [endsAt, setEndsAt] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) Prefer role chosen at login
        try {
          const stored = typeof window !== "undefined" ? localStorage.getItem("appRole") : null;
          if (stored === "admin" || stored === "student") setRole(stored);
        } catch {}

        // 2) Validate against profile, scoped to chosen role if available
        const { data: session } = await supabase.auth.getUser();
        const email = session.user?.email;
        if (!email) return;
        const chosen = (typeof window !== "undefined" ? localStorage.getItem("appRole") : null) as
          | "admin"
          | "student"
          | null;
        const base = supabase.from("users").select("role").eq("email", email).limit(1);
        const { data } = chosen
          ? await base.eq("role", chosen).maybeSingle()
          : await base.maybeSingle();
        if (data?.role === "admin" || data?.role === "student") {
          if (!chosen) setRole(data.role);
        }
      } finally {
        setRoleLoading(false);
      }
    })();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (role !== "admin") throw new Error("Only admins can create polls");
      // Basic validation for dates
      if (!startsAt || !endsAt) throw new Error("Please select start and end date/time");
      if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
        throw new Error("End time must be after start time");
      }
      // Create campaign record
      const id = crypto.randomUUID();
      const hostId = crypto.randomUUID();
      if (!code || code.trim().length === 0) {
        throw new Error("A poll access code is required");
      }
      const payload = {
        id,
        title,
        description: extra,
        club,
        code: code.trim(),
        vote_type: votingType,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        host_id: hostId,
        is_published: false,
      };
      const { error } = await supabase.from("campaigns").insert(payload);
      if (error) throw error;
      router.push(`/polls/${id}/options`);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : 'Failed to create poll';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground px-6 py-8">
        <div className="h-20 rounded-xl bg-muted animate-pulse mb-3" />
        <div className="h-20 rounded-xl bg-muted animate-pulse mb-3" />
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="min-h-screen bg-background text-foreground px-6 py-8">
        <p className="text-sm text-muted-foreground">Only admins can add polls.</p>
        <Button className="mt-4" onClick={() => router.push("/polling-menu")}>Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-8">
      <Card className="w-full max-w-xl mx-auto border-muted/40 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Create a new poll</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-3 text-sm text-destructive">{error}</div>}
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm mb-1">Club</label>
              <Input value={club} onChange={e => setClub(e.target.value)} placeholder="Club name" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Poll title" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Extra info (optional)</label>
              <Input value={extra} onChange={e => setExtra(e.target.value)} placeholder="e.g. Notes or perks" />
            </div>
            <div>
              <label className="block text-sm mb-1">Code</label>
              <Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. ABC123" />
            </div>
            <div>
              <label className="block text-sm mb-1">Voting type</label>
              <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                <span className="text-sm text-muted-foreground">{votingType === "single" ? "Single vote" : "Preferential voting"}</span>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  onClick={() => setVotingType(prev => (prev === "single" ? "preferential" : "single"))}
                >
                  Toggle
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Starts at</label>
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={e => setStartsAt(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Ends at</label>
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={e => setEndsAt(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create poll"}</Button>
              <Button type="button" variant="secondary" onClick={() => router.push("/polling-menu")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


