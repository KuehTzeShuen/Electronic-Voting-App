"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Row = { option_id: string; count: number; label: string };

export default function PollResultsPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);
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
  const [role, setRole] = useState<"student" | "admin" | null>(initialRole);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Prefer role chosen at login
        try {
          const stored = typeof window !== "undefined" ? localStorage.getItem("appRole") : null;
          if (stored === "admin" || stored === "student") setRole(stored);
        } catch {}

        // Validate role from profile, but don't downgrade an explicit admin selection
        const { data: session } = await supabase.auth.getUser();
        const email = session.user?.email;
        if (email) {
          const { data: roleRow } = await supabase
            .from("users")
            .select("role")
            .eq("email", email)
            .limit(1)
            .maybeSingle();
          if (roleRow?.role === "admin") setRole("admin");
          else if (role == null && roleRow?.role === "student") setRole("student");
        }

        // Load vote counts joined with option labels
        const { data: opts } = await supabase
          .from("campaign_options")
          .select("id, label")
          .eq("campaign_id", id);
        const { data: votes } = await supabase
          .from("votes_single")
          .select("option_id")
          .eq("campaign_id", id);
        const labelById = new Map<string, string>((opts || []).map((o: any) => [o.id, o.label]));
        const counts = new Map<string, number>();
        (votes || []).forEach((v: any) => {
          counts.set(v.option_id, (counts.get(v.option_id) || 0) + 1);
        });
        const rows: Row[] = Array.from(labelById.entries()).map(([option_id, label]) => ({
          option_id,
          label,
          count: counts.get(option_id) || 0,
        }));
        setRows(rows);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground px-6 py-8">
        <div className="h-20 rounded-xl bg-muted animate-pulse mb-3" />
        <div className="h-20 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="min-h-screen bg-background text-foreground px-6 py-8">
        <p className="text-sm text-muted-foreground">Only admins can view results.</p>
        <button className="mt-4 rounded-md bg-secondary text-secondary-foreground px-3 py-1 text-xs" onClick={() => router.push(`/poll/${id}`)}>
          Back
        </button>
      </div>
    );
  }

  const total = rows.reduce((a, r) => a + r.count, 0) || 1;

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-8">
      <h1 className="text-lg font-semibold mb-4">Current votes</h1>
      <div className="space-y-3 max-w-xl mx-auto">
        {rows.map((r) => {
          const pct = Math.round((r.count / total) * 100);
          return (
            <div key={r.option_id} className="w-full">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{r.label}</span>
                <span className="text-muted-foreground">{r.count} ({pct}%)</span>
              </div>
              <div className="h-2 w-full rounded bg-muted overflow-hidden">
                <div className="h-2 bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


