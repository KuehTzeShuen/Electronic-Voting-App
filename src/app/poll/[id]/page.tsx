"use client";

import { generateUUID } from "@/lib/uuid";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PreferentialPoll from "@/components/PreferentialPoll";

export default function PollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [role, setRole] = useState<"student" | "admin">("student");
  const [options, setOptions] = useState<{ id: string; label: string; description: string | null }[]>([]);
  const [campaign, setCampaign] = useState<{
    title: string;
    description: string | null;
    club: string | null;
    starts_at: string | null;
    ends_at: string | null;
    vote_type?: "single" | "preferential";
  } | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [voteMsg, setVoteMsg] = useState<string | null>(null);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignLoading, setCampaignLoading] = useState(true);

  // 🧠 Load campaign details with caching
  useEffect(() => {
    (async () => {
      const CACHE_KEY = `campaign-${id}`;
      const CACHE_DURATION = 10 * 60 * 1000; // 10 mins

      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setCampaign(data);
            setCampaignLoading(false);
            return;
          }
        }
      } catch {}

      const { data: camp } = await supabase
        .from("campaigns")
        .select("title, description, club, starts_at, ends_at, vote_type")
        .eq("id", id)
        .maybeSingle();

      if (camp) {
        setCampaign(camp);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: camp, timestamp: Date.now() }));
      }
      setCampaignLoading(false);
    })();
  }, [id]);

  // ⚙️ Load user, role, options, and vote status
  useEffect(() => {
    (async () => {
      const email = localStorage.getItem("appEmail");
      const storedRole = localStorage.getItem("appRole");

      if (!email || !storedRole) {
        router.push("/");
        return;
      }

      const { data: user } = await supabase
        .from("users")
        .select("role")
        .eq("email", email)
        .eq("role", storedRole)
        .maybeSingle();

      if (!user) {
        router.push("/");
        return;
      }

      setRole(storedRole as "student" | "admin");

      // 🧩 Load and randomise options
      const OPTIONS_CACHE_KEY = `options-${id}`;
      const OPTIONS_CACHE_DURATION = 5 * 60 * 1000;

      async function fetchAndCacheOptions() {
        const { data: opt } = await supabase
          .from("campaign_options")
          .select("id, label, description")
          .eq("campaign_id", id)
          .order("label", { ascending: true });

        if (opt) {
          const shuffled = opt.sort(() => Math.random() - 0.5);
          setOptions(shuffled);
          localStorage.setItem(OPTIONS_CACHE_KEY, JSON.stringify({ data: shuffled, timestamp: Date.now() }));
        }
      }

      try {
        const cachedOptions = localStorage.getItem(OPTIONS_CACHE_KEY);
        if (cachedOptions) {
          const { data, timestamp } = JSON.parse(cachedOptions);
          if (Date.now() - timestamp < OPTIONS_CACHE_DURATION) {
            setOptions(data);
          } else {
            await fetchAndCacheOptions();
          }
        } else {
          await fetchAndCacheOptions();
        }
      } catch {
        await fetchAndCacheOptions();
      }

      // 🗳️ Check vote status
      const voterId = await getVoterId();
      const { data: existing } = await supabase
        .from("votes_single")
        .select("option_id")
        .eq("campaign_id", id)
        .eq("voter_id", voterId)
        .maybeSingle();

      if (existing?.option_id) setVotedOptionId(existing.option_id);

      setLoading(false);
    })();
  }, [id, router]);

  // 🆔 Get or generate unique voter ID
  async function getVoterId(): Promise<string> {
    const { data: session } = await supabase.auth.getUser();
    const authId = session?.user?.id;
    if (authId) return authId;

    const stored = localStorage.getItem("voterId");
    if (stored) return stored;

    const newId = generateUUID();
    localStorage.setItem("voterId", newId);
    return newId;
  }

  // 🗳️ Vote selection
  const toggleCandidate = (optionId: string) => {
    setVoteMsg(null);
    if (campaign?.vote_type === "preferential") {
      setSelectedOptionIds((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    } else {
      setSelectedOptionIds([optionId]);
    }
  };

  // 🗳️ Cast vote
  const castVote = async () => {
    if (selectedOptionIds.length === 0) {
      setVoteMsg("Please select at least one candidate.");
      return;
    }

    setSubmitting("yes");
    const voterId = await getVoterId();

    try {
      if (votedOptionId) {
        setVoteMsg("You have already voted in this poll.");
        return;
      }

      if (campaign?.vote_type === "single") {
        await supabase.from("votes_single").insert({
          campaign_id: id,
          option_id: selectedOptionIds[0],
          voter_id: voterId,
          created_at: new Date().toISOString(),
        });
      } else {
        const maxPoints = selectedOptionIds.length;
        const payloads = selectedOptionIds.map((optId, i) => ({
          campaign_id: id,
          option_id: optId,
          voter_id: voterId,
          rank: i + 1,
          points: maxPoints - i,
          created_at: new Date().toISOString(),
        }));
        await supabase.from("votes_preferential").insert(payloads);
      }

      setVoteMsg("Vote submitted successfully!");
      setVotedOptionId(selectedOptionIds[0]);
      setSelectedOptionIds([]);
      localStorage.removeItem(`options-${id}`);
    } catch (e) {
      setVoteMsg("Failed to submit vote");
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
          {votedOptionId ? (
            // Already voted - show results
            <>
              <p className="text-sm text-muted-foreground mb-4">Your vote has been submitted</p>
              <div className="space-y-2">
                {options.map((o) => (
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
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedOptionIds.length > 0 ? "Confirm your selection" : "Choose your candidates"}
              </p>

              {campaign?.vote_type === "preferential" ? (
                <PreferentialPoll
                  options={options.map(o => o.label)}
                  onChange={(ranking) =>
                    setSelectedOptionIds(
                      options
                        .filter(o => ranking.includes(o.label))
                        .map(o => o.id)
                    )
                  }
                />
              ) : (
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
                        <div className={`text-xs ${voteMsg.includes("successfully") ? "text-green-600" : "text-red-600"}`}>
                          {voteMsg}
                        </div>
                      )}
                      {options.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => toggleCandidate(o.id)}
                          className={`w-full text-left rounded-md px-4 py-2 text-sm border transition-colors ${
                            selectedOptionIds.includes(o.id)
                              ? "bg-primary/20 border-primary/60 ring-2 ring-primary/30"
                              : "bg-card border-border hover:bg-muted/50"
                          }`}
                        >
                          <div className="font-medium">{o.label}</div>
                          {o.description && <div className="text-xs text-muted-foreground">{o.description}</div>}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-4 flex justify-end gap-3">
            {/* Submit button appears only when a candidate is selected */}
            {selectedOptionIds.length > 0 && (
              <button
                onClick={castVote}
                disabled={submitting !== null}
                className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? "Submitting..."
                  : campaign?.vote_type === "preferential"
                  ? "Submit Preferences"
                  : "Submit Vote"}
              </button>
            )}

            <button
              className="rounded-md bg-secondary text-secondary-foreground px-4 py-2 text-sm"
              onClick={() => router.push("/polling-menu")}
            >
              Back to Polling Menu
            </button>
          </div>
        </div>
      ) : (
        // Admin view
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
    return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  };
  const a = fmt(starts);
  const b = fmt(ends);
  if (a && b) return `Starts: ${a} • Ends: ${b}`;
  if (a) return `Starts: ${a}`;
  if (b) return `Ends: ${b}`;
  return "";
}
