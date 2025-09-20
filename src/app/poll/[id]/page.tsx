"use client";

import { generateUUID } from "@/lib/uuid";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function PollDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);
  const [role, setRole] = useState<"student" | "admin">("student");
  const [options, setOptions] = useState<{ id: string; label: string; description: string | null }[]>([]);
  const [campaign, setCampaign] = useState<{ title: string; description: string | null; club: string | null; starts_at: string | null; ends_at: string | null } | null>(null);
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [voteMsg, setVoteMsg] = useState<string | null>(null);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaignLoading, setCampaignLoading] = useState(true);

  // Load campaign details immediately with caching
  useEffect(() => {
    (async () => {
      const CACHE_KEY = `campaign-${id}`;
      const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
      
      // Try to load from cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setCampaign(cachedData);
            setCampaignLoading(false);
            return; // Use cached data
          }
        }
      } catch (_) {
        // Cache invalid, continue to fetch
      }

      // Fetch fresh data
      const { data: camp } = await supabase
        .from("campaigns")
        .select("title, description, club, starts_at, ends_at")
        .eq("id", id)
        .maybeSingle();
      
      if (camp) {
        const campaignData = camp as { title: string; description: string | null; club: string | null; starts_at: string | null; ends_at: string | null };
        setCampaign(campaignData);
        // Cache the data
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: campaignData,
            timestamp: Date.now()
          }));
        } catch (_) {
          // Cache failed, but data is still loaded
        }
      }
      setCampaignLoading(false);
    })();
  }, [id]);

  // Load user role, options, and vote status
  useEffect(() => {
    (async () => {
      // Check authentication using localStorage (same as login page)
      let email: string | null = null;
      let storedRole: string | null = null;
      
      try {
        email = typeof window !== "undefined" ? localStorage.getItem("appEmail") : null;
        storedRole = typeof window !== "undefined" ? localStorage.getItem("appRole") : null;
      } catch (_) {
        // localStorage not available
      }
      
      if (!email || !storedRole) {
        // No authentication data, redirect to login
        router.push("/");
        return;
      }
      
      // Verify the user exists in the database
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("role")
        .eq("email", email)
        .eq("role", storedRole)
        .maybeSingle();
        
      if (fetchError || !data) {
        // User not found or error, redirect to login
        router.push("/");
        return;
      }
      
      // Set the role from localStorage (which was validated against DB)
      setRole(storedRole as "student" | "admin");
      
      // Load options for this campaign with caching
      const OPTIONS_CACHE_KEY = `options-${id}`;
      const OPTIONS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      
      // Try to load options from cache first
      try {
        const cachedOptions = localStorage.getItem(OPTIONS_CACHE_KEY);
        if (cachedOptions) {
          const { data: cachedOptData, timestamp } = JSON.parse(cachedOptions);
          if (Date.now() - timestamp < OPTIONS_CACHE_DURATION) {
            setOptions(cachedOptData as { id: string; label: string; description: string | null }[]);
          } else {
            // Cache expired, fetch fresh data
            await fetchAndCacheOptions();
          }
        } else {
          // No cache, fetch fresh data
          await fetchAndCacheOptions();
        }
      } catch (_) {
        // Cache invalid, fetch fresh data
        await fetchAndCacheOptions();
      }

      async function fetchAndCacheOptions() {
        const { data: opt } = await supabase
          .from("campaign_options")
          .select("id, label, description")
          .eq("campaign_id", id)
          .order("label", { ascending: true });
        
        if (Array.isArray(opt)) {
          const optionsData = opt as { id: string; label: string; description: string | null }[];
          setOptions(optionsData);
          // Cache the options
          try {
            localStorage.setItem(OPTIONS_CACHE_KEY, JSON.stringify({
              data: optionsData,
              timestamp: Date.now()
            }));
          } catch (_) {
            // Cache failed, but data is still loaded
          }
        }
      }

      // Check if this voter already voted in this campaign
      const voterId = await getVoterId();
      const { data: existing } = await supabase
        .from("votes_single")
        .select("option_id")
        .eq("campaign_id", id)
        .eq("voter_id", voterId)
        .maybeSingle();
      if (existing?.option_id) setVotedOptionId(existing.option_id as string);
      setLoading(false);
    })();
  }, [id, router]);

  async function getVoterId(): Promise<string> {
    // Prefer Supabase auth user id when available
    try {
      const { data: session } = await supabase.auth.getUser();
      const authId = (session.user?.id as string | undefined) || null;
      if (authId) return authId;
    } catch {}
    // Fallback to a persistent client id
    try {
      const stored = localStorage.getItem("voterId");
      if (stored) return stored;
      const created = generateUUID();
      localStorage.setItem("voterId", created);
      return created;
    } catch {
      return generateUUID();
    }
  }

  const castVote = async (optionId: string) => {
    setVoteMsg(null);
    setSubmitting(optionId);
    try {
      if (votedOptionId) {
        setVoteMsg("You have already voted in this poll.");
        return;
      }
      const voterId = await getVoterId();

      const payload = {
        campaign_id: id,
        option_id: optionId,
        voter_id: voterId,
        created_at: new Date().toISOString(),
      } as const;
      const { error } = await supabase.from("votes_single").insert(payload);
      if (error) throw error;
      setVoteMsg("Vote submitted.");
      setVotedOptionId(optionId);
      
      // Invalidate cache for this campaign's options (in case vote counts are displayed elsewhere)
      try {
        localStorage.removeItem(`options-${id}`);
      } catch (_) {
        // Cache invalidation failed, but vote was successful
      }
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to submit vote';
      setVoteMsg(msg);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-8">
      <h1 className="text-foreground text-2xl font-semibold mb-6">Cast Your Vote</h1>
      
      {campaignLoading ? (
        <>
          <div className="h-6 bg-muted animate-pulse rounded mb-2"></div>
          <div className="h-6 bg-muted animate-pulse rounded mb-2"></div>
          <div className="h-3 bg-muted animate-pulse rounded mb-6"></div>
        </>
      ) : (
        <>
          {campaign?.club && (
            <div className="text-sm text-muted-foreground font-medium">{campaign.club}</div>
          )}
          <h1 className="text-foreground text-lg font-semibold mt-2">
            {campaign?.title || `Poll`}
          </h1>
          {campaign?.description && (
            <div className="text-muted-foreground text-xs mt-1">{campaign.description}</div>
          )}
          <div className="text-muted-foreground text-xs mb-6 mt-1">
            {formatDateRange(campaign?.starts_at, campaign?.ends_at)}
          </div>
        </>
      )}

      {role === "student" ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground mb-4">Choose an option</p>
          <div className="space-y-2">
            {loading ? (
              <>
                <div className="h-10 bg-muted animate-pulse rounded"></div>
                <div className="h-10 bg-muted animate-pulse rounded"></div>
                <div className="h-10 bg-muted animate-pulse rounded"></div>
                <div className="h-10 bg-muted animate-pulse rounded"></div>
              </>
            ) : options.length === 0 ? (
              <div className="text-sm text-muted-foreground">No options available yet.</div>
            ) : (
              <>
                {voteMsg && (
                  <div className="text-xs text-muted-foreground">{voteMsg}</div>
                )}
                {votedOptionId
                  ? options.map((o) => (
                      <div
                        key={o.id}
                        className={`w-full text-left rounded-md px-4 py-2 text-sm border ${
                          o.id === votedOptionId
                            ? "bg-primary/15 border-primary/40"
                            : "bg-card border-border"
                        }`}
                      >
                        <div className="font-medium">
                          {o.label} {o.id === votedOptionId && <span className="text-xs text-muted-foreground">(your vote)</span>}
                        </div>
                        {o.description && <div className="text-xs text-muted-foreground">{o.description}</div>}
                      </div>
                    ))
                  : options.map((o) => (
                      <button
                        key={o.id}
                        disabled={submitting === o.id}
                        onClick={() => castVote(o.id)}
                        className="w-full text-left rounded-md bg-primary/10 hover:bg-primary/20 disabled:opacity-50 text-foreground px-4 py-2 text-sm"
                      >
                        <div className="font-medium">{o.label}</div>
                        {o.description && <div className="text-xs text-muted-foreground">{o.description}</div>}
                      </button>
                    ))}
              </>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              className="rounded-md bg-secondary text-secondary-foreground px-4 py-2 text-sm"
              onClick={() => router.push("/polling-menu")}
            >
              Back to Polling Menu
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground mb-4">Admin view: current votes (placeholder)</p>
          <div className="text-sm">
            <p>Option A: 0</p>
            <p>Option B: 0</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="rounded-md bg-secondary text-secondary-foreground px-3 py-1 text-xs" onClick={() => router.push(`/polls/${id}/options`)}>
              Manage options
            </button>
            <button className="rounded-md bg-primary text-primary-foreground px-3 py-1 text-xs" onClick={() => router.push("/polling-menu")}>
              Back to polling menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateRange(starts?: string | null, ends?: string | null) {
  const fmt = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-GB");
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${date} ${time}`;
  };
  const a = fmt(starts);
  const b = fmt(ends);
  if (a && b) return `Starts: ${a} • Ends: ${b}`;
  if (a) return `Starts: ${a}`;
  if (b) return `Ends: ${b}`;
  return "";
}


