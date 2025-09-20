"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('Connecting...');

  // Function to load and update vote results
  const loadVoteResults = useCallback(async () => {
    try {
      // Load vote counts joined with option labels
      const { data: opts } = await supabase
        .from("campaign_options")
        .select("id, label")
        .eq("campaign_id", id);
      const { data: votes } = await supabase
        .from("votes_single")
        .select("option_id")
        .eq("campaign_id", id);
      const labelById = new Map<string, string>(
        ((opts || []) as Array<{ id: string; label: string }>).map((o) => [o.id, o.label])
      );
      const counts = new Map<string, number>();
      ((votes || []) as Array<{ option_id: string }>).forEach((v) => {
        counts.set(v.option_id, (counts.get(v.option_id) || 0) + 1);
      });
      const rows: Row[] = Array.from(labelById.entries()).map(([option_id, label]) => ({
        option_id,
        label,
        count: counts.get(option_id) || 0,
      }));
      setRows(rows);
      setLastUpdated(new Date());
      console.log('Vote results updated:', rows);
    } catch (error) {
      console.error("Error loading vote results:", error);
    }
  }, [id]);

  // Initial data loading effect
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

        // Load initial vote results
        await loadVoteResults();

      } finally {
        setLoading(false);
      }
    })();
  }, [id, role, loadVoteResults]);

  // Separate effect for real-time subscription (runs after initial load)
  useEffect(() => {
    if (loading || !id) return; // Don't set up subscription until initial load is complete

    let subscription: RealtimeChannel | null = null;
    let pollInterval: NodeJS.Timeout | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const setupSubscription = async (retryCount = 0) => {
      try {
        console.log(`Setting up real-time subscription for poll: ${id} (attempt ${retryCount + 1})`);
        
        // Much longer delay - wait for everything to be fully ready
        const delay = retryCount === 0 ? 10 : Math.min(10 + (retryCount * 100), 400);
        console.log(`Waiting ${delay}ms before subscription setup...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Check if Supabase client is ready by testing a simple query
        try {
          const { error: testError } = await supabase
            .from('votes_single')
            .select('id')
            .limit(1);
          
          if (testError) {
            console.warn('Supabase client not ready, retrying...', testError);
            throw new Error('Client not ready');
          }
        } catch (clientError) {
          console.warn('Supabase client readiness check failed:', clientError);
          throw new Error('Client not ready');
        }
        
        console.log('Supabase client is ready, proceeding with subscription...');
        
        subscription = supabase
          .channel(`votes-${id}`)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'votes_single',
              filter: `campaign_id=eq.${id}`
            },
            (payload) => {
              console.log('Vote change detected:', payload);
              // Reload results when votes change
              loadVoteResults();
            }
          )
          .subscribe((status, err) => {
            console.log('Subscription status:', status);
            if (err) {
              console.error('Subscription error details:', err);
            }
            setSubscriptionStatus(status);
            
            if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to real-time updates');
              // Clear any existing polling if subscription succeeds
              if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
              }
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Failed to subscribe to real-time updates');
              console.error('Error details:', err);
              
              // Retry subscription with progressive delay (max 3 retries)
              if (retryCount < 3 && !retryTimeout) {
                retryTimeout = setTimeout(() => {
                  console.log(`Retrying subscription (attempt ${retryCount + 2})...`);
                  retryTimeout = null;
                  setupSubscription(retryCount + 1);
                }, 3000);
              } else {
                console.log('Max retries reached, falling back to polling');
                // Fallback to polling every 5 seconds if real-time fails
                if (!pollInterval) {
                  pollInterval = setInterval(() => {
                    console.log('Polling for updates (real-time failed)');
                    loadVoteResults();
                  }, 5000);
                }
              }
            } else if (status === 'TIMED_OUT') {
              console.error('Subscription timed out');
              // Retry subscription with progressive delay (max 3 retries)
              if (retryCount < 3 && !retryTimeout) {
                retryTimeout = setTimeout(() => {
                  console.log(`Retrying subscription after timeout (attempt ${retryCount + 2})...`);
                  retryTimeout = null;
                  setupSubscription(retryCount + 1);
                }, 3000);
              }
            } else if (status === 'CLOSED') {
              console.log('Subscription closed');
            }
          });
      } catch (error) {
        console.error('Error setting up subscription:', error);
        setSubscriptionStatus('CHANNEL_ERROR');
        
        // Retry if we haven't exceeded max attempts
        if (retryCount < 3 && !retryTimeout) {
          retryTimeout = setTimeout(() => {
            console.log(`Retrying subscription after error (attempt ${retryCount + 2})...`);
            retryTimeout = null;
            setupSubscription(retryCount + 1);
          }, 3000);
        } else {
          // Fallback to polling
          if (!pollInterval) {
            pollInterval = setInterval(() => {
              console.log('Polling for updates (subscription setup failed)');
              loadVoteResults();
            }, 5000);
          }
        }
      }
    };

    // Set up subscription after a delay
    const setupTimeout = setTimeout(() => {
      setupSubscription();
    }, 1000); // Additional 1 second delay after component is ready

    // Cleanup function
    return () => {
      clearTimeout(setupTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [id, loading, loadVoteResults]); // Only run when loading is false

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground px-6 py-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-32 bg-muted animate-pulse rounded"></div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-muted animate-pulse"></div>
              <div className="h-3 w-16 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
          <div className="h-6 w-16 bg-muted animate-pulse rounded"></div>
        </div>
        
        {/* Last updated skeleton */}
        <div className="h-3 w-32 bg-muted animate-pulse rounded mb-4"></div>
        
        {/* Results skeleton */}
        <div className="space-y-3 max-w-xl mx-auto">
          {Array.from({ length: Math.max(rows.length, 4) }).map((_, index) => {
            const widths = ['w-24', 'w-20', 'w-28', 'w-24'];
            const percentages = [20, 40, 60, 80];
            return (
              <div key={index} className="w-full">
                <div className="flex justify-between text-sm mb-1">
                  <div className={`h-4 bg-muted animate-pulse rounded ${widths[index % 4]}`}></div>
                  <div className="h-4 w-12 bg-muted animate-pulse rounded"></div>
                </div>
                <div className="h-2 w-full rounded bg-muted overflow-hidden">
                  <div 
                    className="h-2 bg-muted animate-pulse" 
                    style={{ width: `${percentages[index % 4]}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Live Results</h1>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              subscriptionStatus === 'SUBSCRIBED' ? 'bg-green-500 animate-pulse' : 
              subscriptionStatus === 'CHANNEL_ERROR' ? 'bg-red-500' : 
              'bg-yellow-500 animate-pulse'
            }`}></div>
            <span className="text-xs text-muted-foreground">
              {subscriptionStatus === 'SUBSCRIBED' ? 'Live' : 
               subscriptionStatus === 'CHANNEL_ERROR' ? 'Polling' : 
               'Connecting...'}
            </span>
          </div>
        </div>
        <button 
          onClick={loadVoteResults}
          className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
        >
          Refresh
        </button>
      </div>
      {lastUpdated && (
        <p className="text-xs text-muted-foreground mb-4">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
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


