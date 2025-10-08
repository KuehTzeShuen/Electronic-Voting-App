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
  const [campaign, setCampaign] = useState<{ title: string; description: string | null; club: string | null; starts_at: string | null; ends_at: string | null; vote_type?: "single" | "preferential"; } | null>(null);
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [voteMsg, setVoteMsg] = useState<string | null>(null);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [votedOptions, setVotedOptions] = useState<{id: string, label: string, rank?: number}[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [showReward, setShowReward] = useState(false);

  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);


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
      } catch {
        // Cache invalid, continue to fetch
      }

      // Fetch fresh data
      const { data: camp } = await supabase
        .from("campaigns")
        .select("title, description, club, starts_at, ends_at, vote_type")
        .eq("id", id)
        .maybeSingle();
      
      if (camp) {
        const campaignData = camp as { title: string; description: string | null; club: string | null; starts_at: string | null; ends_at: string | null; vote_type?: "single" | "preferential" };
        setCampaign(campaignData);
        // Cache the data
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: campaignData,
            timestamp: Date.now()
          }));
        } catch {
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
      } catch {
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
      } catch {
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
          } catch {
            // Cache failed, but data is still loaded
          }
        }
      }

      // Check if this voter already voted in this campaign
      let voterId: string;
      try {
        voterId = await getVoterId();
      } catch (error) {
        console.error("Authentication error:", error);
        setLoading(false);
        return;
      }
      
      // Check for existing vote based on campaign type
      if (campaign?.vote_type === "single") {
        const { data: existing } = await supabase
          .from("votes_single")
          .select("option_id")
          .eq("campaign_id", id)
          .eq("voter_id", voterId)
          .maybeSingle();
        
        if (existing?.option_id) {
          setVotedOptionId(existing.option_id as string);
          // Find the option details for display
          const option = options.find(o => o.id === existing.option_id);
          if (option) {
            setVotedOptions([{id: option.id, label: option.label}]);
          }
        }
      } else {
        // Check for preferential votes
        const { data: existing } = await supabase
          .from("votes_preferential")
          .select("option_id, rank")
          .eq("campaign_id", id)
          .eq("voter_id", voterId)
          .order("rank", { ascending: true });
        
        if (existing && existing.length > 0) {
          setVotedOptionId("done");
          // Map the votes to option details with ranks
          const votedOptionsWithDetails = existing.map(vote => {
            const option = options.find(o => o.id === vote.option_id);
            return {
              id: vote.option_id,
              label: option?.label || vote.option_id,
              rank: vote.rank
            };
          });
          setVotedOptions(votedOptionsWithDetails);
        }
      }
      setLoading(false);
    })();
  }, [id, router, campaign?.vote_type, options]);

  async function getVoterId(): Promise<string> {
    // Get the authenticated user's ID from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user?.id) {
      throw new Error("You must be logged in to vote. Please sign in first.");
    }

    // Verify this user exists in our users table and get their auth_id
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("auth_id")
      .eq("auth_id", user.id)
      .single();
    
    if (userError || !userData?.auth_id) {
      throw new Error("User account not found. Please ensure you're properly registered.");
    }

    return userData.auth_id;
  }

  async function getNextVoteId(tableName: 'votes_single' | 'votes_preferential'): Promise<number> {
    // Get the highest current ID from the votes table
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .order('id', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    // If no records exist, start with ID 1, otherwise use highest ID + 1
    return data && data.length > 0 ? (data[0].id as number) + 1 : 1;
  }

  const selectCandidate = (optionId: string) => {
    setSelectedOptionId(optionId);
    setVoteMsg(null);
  };

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


  const castVote = async () => {
    if (selectedOptionIds.length === 0) {
      setVoteMsg("Please select at least one candidate.");
      return;
    }

    setVoteMsg(null);
    setSubmitting("yes");

    try {
      if (votedOptionId) {
        setVoteMsg("You have already voted in this poll.");
        return;
      }

      let voterId: string;
      try {
        voterId = await getVoterId();
      } catch (error) {
        setVoteMsg(error instanceof Error ? error.message : "Authentication error. Please log in again.");
        return;
      }

      console.log('Campaign vote_type:', campaign?.vote_type);
      console.log('Campaign object:', campaign);
      console.log('Selected option IDs:', selectedOptionIds);
      console.log('Selected option ID (singular):', selectedOptionId);
      if (campaign?.vote_type === "single") {
        // Single vote - check if user already voted first
        const { data: existingVote, error: checkError } = await supabase
          .from("votes_single")
          .select("option_id")
          .eq("campaign_id", id)
          .eq("voter_id", voterId)
          .maybeSingle();
        
        if (checkError) throw checkError;
        if (existingVote) {
          setVoteMsg("You have already voted in this poll.");
          setVotedOptionId(existingVote.option_id);
          return;
        }

        // Get next available ID and insert vote
        const nextId = await getNextVoteId('votes_single');
        const optionId = selectedOptionId || selectedOptionIds[0];
        const payload = {
          id: nextId,
          campaign_id: id,
          option_id: optionId,
          voter_id: voterId,
          created_at: new Date().toISOString(),
        };
        console.log('Inserting into votes_single table:', payload);
        const { error } = await supabase.from("votes_single").insert(payload);
        if (error) {
          console.error('Error inserting into votes_single:', error);
          throw error;
        }
        setVotedOptionId(optionId);
        // Set voted options for display
        const votedOption = options.find(o => o.id === optionId);
        if (votedOption) {
          setVotedOptions([{id: votedOption.id, label: votedOption.label}]);
        }
      } else {
        // Preferential voting - check if user already voted first
        const { data: existingVotes, error: checkError } = await supabase
          .from("votes_preferential")
          .select("option_id")
          .eq("campaign_id", id)
          .eq("voter_id", voterId)
          .limit(1);
        
        if (checkError) throw checkError;
        if (existingVotes && existingVotes.length > 0) {
          setVoteMsg("You have already voted in this poll.");
          setVotedOptionId("done");
          return;
        }

        // Get next available IDs and insert preferential votes with rank
        const baseId = await getNextVoteId('votes_preferential');
        const payloads = selectedOptionIds.map((optId, i) => ({
          id: baseId + i, // Sequential IDs starting from baseId
          campaign_id: id,
          option_id: optId,
          voter_id: voterId,
          rank: i + 1, // order of selection
          created_at: new Date().toISOString(),
        }));
        console.log('Inserting into votes_preferential table:', payloads);
        const { error } = await supabase.from("votes_preferential").insert(payloads);
        if (error) {
          console.error('Error inserting into votes_preferential:', error);
          throw error;
        }
        setVotedOptionId("done"); // marker that vote is done
        // Set voted options for display with ranks
        const votedOptionsWithRanks = selectedOptionIds.map((optionId, index) => {
          const option = options.find(o => o.id === optionId);
          return {
            id: optionId,
            label: option?.label || optionId,
            rank: index + 1
          };
        });
        setVotedOptions(votedOptionsWithRanks);
      }

      setSelectedOptionIds([]);

      try {
        localStorage.removeItem(`options-${id}`);
      } catch {}
    } catch (e) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Failed to submit vote";
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
          <p className="text-sm text-muted-foreground mb-4">
            {selectedOptionId ? "Confirm your selection" : "Choose a candidate"}
          </p>
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
                  <div className={`text-xs ${voteMsg.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                    {voteMsg}
                  </div>
                )}
                {options.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => toggleCandidate(o.id)}
                    disabled={votedOptionId !== null}
                    className={`w-full text-left rounded-md px-4 py-2 text-sm border transition-colors ${
                      selectedOptionIds.includes(o.id) || votedOptions.some(vo => vo.id === o.id)
                        ? "bg-primary/20 border-primary/60 ring-2 ring-primary/30"
                        : "bg-card border-border hover:bg-muted/50"
                    } ${votedOptionId !== null ? 'cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {o.label}
                          {campaign?.vote_type === "single" && votedOptions.some(vo => vo.id === o.id) && (
                            <span className="text-xs text-muted-foreground ml-2">(your vote)</span>
                          )}
                        </div>
                        {o.description && <div className="text-xs text-muted-foreground">{o.description}</div>}
                      </div>
                      {campaign?.vote_type === "preferential" && (
                        <div className="ml-4 flex-shrink-0">
                          {selectedOptionIds.includes(o.id) && (
                            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                              {selectedOptionIds.indexOf(o.id) + 1}
                            </div>
                          )}
                          {votedOptions.some(vo => vo.id === o.id) && !selectedOptionIds.includes(o.id) && (
                            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                              {votedOptions.find(vo => vo.id === o.id)?.rank}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
          
          <div className="mt-4 flex justify-end gap-3">
            {/* Submit button */}
            {votedOptionId ? (
              <>
                <button
                  disabled={true}
                  className="rounded-md bg-gray-300 text-gray-500 px-4 py-2 text-sm cursor-not-allowed"
                >
                  Vote Submitted
                </button>
                <button 
                  className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90"
                  onClick={() => router.push(`/poll/${id}/incentive`)}
                >
                  View Incentives
                </button>
              </>
            ) : selectedOptionIds.length > 0 ? (
              <button
                onClick={castVote}
                disabled={submitting !== null}
                className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : campaign?.vote_type === "preferential" ? "Submit Preferences" : "Submit Vote"}
              </button>
            ) : null}

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


