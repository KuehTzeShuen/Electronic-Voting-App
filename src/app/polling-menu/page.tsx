"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import React from "react";

const colorPalette = [
  "bg-[#3B4A5A]",
  "bg-[#6B4A9B]",
  "bg-[#2E5D47]",
  "bg-[#B07D62]",
  "bg-[#11777B]",
  "bg-[#A23E48]",
];

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
  const [role, setRole] = useState<"student" | "admin" | null>(initialRole);
  const [roleLoading, setRoleLoading] = useState<boolean>(true);
  const [club, setClub] = useState("");
  const [title, setTitle] = useState("");
  const [extra, setExtra] = useState("");

  // const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  // const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});
  const router = useRouter();

  // Animation end handler
  // const handleAnimationEnd = () => {
  //   if (selectedIdx !== null) {
  //     router.push(`/poll/${selectedIdx}`);
  //   }
  // };

  // When Confirm is clicked
  // const handleSelect = (idx: number) => {
  //   const card = cardRefs.current[idx];
  //   if (card) {
  //     const rect = card.getBoundingClientRect();
  //     const scrollY = window.scrollY || window.pageYOffset;
  //     const scrollX = window.scrollX || window.pageXOffset;
  //     // Calculate the card's center
  //     const cardCenterX = rect.left + rect.width / 2 + scrollX;
  //     const cardCenterY = rect.top + rect.height / 2 + scrollY;
  //     // Calculate the viewport center
  //     const viewportCenterX = window.innerWidth / 2;
  //     const viewportCenterY = window.innerHeight / 2;
  //     // Calculate translation needed
  //     const translateX = viewportCenterX - cardCenterX;
  //     const translateY = viewportCenterY - cardCenterY;
  //     setCardStyle({
  //       position: "absolute",
  //       left: rect.left + scrollX,
  //       top: rect.top + scrollY,
  //       width: rect.width,
  //       height: rect.height,
  //       zIndex: 50,
  //       transition: "transform 0.7s cubic-bezier(0.4,0,0.2,1), opacity 0.7s",
  //       transform: `translate(0px, 0px) scale(1)`,
  //     });
  //     setSelectedIdx(idx);
  //     // Animate to center after a tick
  //     setTimeout(() => {
  //       // Calculate scale factors
  //       const targetWidth = window.innerWidth * 0.9;
  //       const targetHeight = window.innerHeight * 0.8;
  //       const scaleX = targetWidth / rect.width;
  //       const scaleY = targetHeight / rect.height;
  //       setCardStyle((prev: React.CSSProperties) => ({
  //         ...prev,
  //         transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`,
  //         boxShadow: "0 10px 40px 0 rgba(0,0,0,0.3)",
  //       }));
  //     }, 10);
  //   }
  // };

  // Hydrate role once; show skeleton until resolved
  React.useEffect(() => {
    (async () => {
      try {
        const { data: session } = await supabase.auth.getUser();
        const email = session.user?.email;
        if (!email) return;
        const desired = initialRole;
        const base = supabase.from("users").select("role").eq("email", email).limit(1);
        const { data } = desired ? await base.eq("role", desired).maybeSingle() : await base.maybeSingle();
        const resolved = (data?.role === "admin" || data?.role === "student") ? data.role : initialRole;
        if (resolved) setRole(resolved);
      } finally {
        setRoleLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track code input keyed by campaign id
  const handleCodeChange = (id: string, value: string) => {
    setCodes(prev => ({ ...prev, [id]: value }));
  };

  // Join with code (basic client-side check then navigate)
  const handleJoin = async (id: string) => {
    const code = (codes[id] || "").trim();
    if (!code) return; // require a non-empty code
    // Check code against campaigns
    const { data } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", id)
      .eq("code", code)
      .maybeSingle();
    if (!data) {
      alert("Invalid access code for this poll");
      return;
    }
    router.push(`/poll/${id}`);
  };

  // Load campaigns
  React.useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("id, title, description, vote_type, starts_at, ends_at, is_published, club")
        .order("starts_at", { ascending: false })
        .limit(100);
      if (Array.isArray(data)) setCampaigns(data as Campaign[]);
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
        <h1 className="text-foreground text-2xl font-semibold">Ongoing Polls</h1>
        {!roleLoading && role === "admin" && (
          <Button size="sm" onClick={() => router.push("/polls/new")}>Add poll</Button>
        )}
      </header>

      {/* Admin add form moved to /polls/new */}

      <main className="w-full px-4 pt-6 pb-10 space-y-4 relative z-10">
        {roleLoading && (
          <div className="w-full max-w-2xl mx-auto">
            <div className="h-20 rounded-xl bg-muted animate-pulse mb-3" />
            <div className="h-20 rounded-xl bg-muted animate-pulse mb-3" />
            <div className="h-20 rounded-xl bg-muted animate-pulse" />
          </div>
        )}
        {!roleLoading && campaigns.map((c) => (
          <Card key={c.id} className="w-full max-w-2xl mx-auto border-muted/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-0"></CardHeader>
            <CardContent>
              {c.club && <div className="text-sm text-muted-foreground font-medium">{c.club}</div>}
              <div className="text-foreground text-lg font-semibold mt-1">{c.title}</div>
              {c.description && <div className="text-muted-foreground text-xs mt-1">{c.description}</div>}
              {role === "student" ? (
                <div className="flex items-center gap-2 mt-3">
                  <Input
                    type="text"
                    placeholder="Enter code"
                    value={codes[c.id] || ""}
                    onChange={e => handleCodeChange(c.id, e.target.value)}
                  />
                  <Button size="sm" onClick={() => handleJoin(c.id)} disabled={(codes[c.id] || "").trim() === ""}>
                    Join
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" variant="secondary" onClick={() => router.push(`/poll/${c.id}/results`)}>
                    View votes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
