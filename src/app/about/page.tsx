"use client";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-secondary/20 to-transparent rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-gradient-to-tl from-primary/15 to-transparent rounded-full blur-xl animate-float-delayed"></div>
        <div className="absolute top-1/3 right-1/3 w-16 h-16 bg-gradient-to-br from-chart-1/20 to-transparent rounded-full blur-lg animate-float"></div>
        <div className="absolute bottom-1/3 left-1/3 w-20 h-20 bg-gradient-to-tl from-chart-2/15 to-transparent rounded-full blur-lg animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary/30 rounded-full animate-pulse"></div>
        <div className="absolute top-1/6 right-1/6 w-1 h-1 bg-chart-3/40 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-1/6 left-1/6 w-1.5 h-1.5 bg-chart-4/30 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <main className="relative z-10 px-6 py-16 max-w-5xl mx-auto">
        {/* Hero */}
        <section className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-muted-foreground mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
            Next.js + Supabase • Secure • Preferential Voting
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            <span className="bg-clip-text text-transparent bg-[linear-gradient(135deg,#60a5fa_0%,#a78bfa_40%,#34d399_85%)]">
              Votely
            </span>
            <span className="text-foreground"> — Vote with Confidence</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-4 max-w-2xl mx-auto">
            A modern, privacy‑aware voting platform built for clubs and organizations. Fast, transparent, and delightful.
          </p>
        </section>

        {/* Feature grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            {
              title: "Role‑aware Access",
              desc: "Admins create and manage polls; students vote with OTP sign‑in.",
            },
            {
              title: "Single & Preferential",
              desc: "Support simple ballots or ranked choices with weighted scoring.",
            },
            {
              title: "Real‑time Results",
              desc: "Results and analytics with discipline/location breakdowns.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="relative group rounded-xl border border-white/10 bg-white/5 p-4 overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(600px_120px_at_var(--x,50%)_0%,rgba(99,102,241,0.12),transparent_60%)]" />
              <div className="relative">
                <h3 className="text-sm font-medium mb-1 tracking-tight">
                  {f.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* Glass card with glow */}
        <section className="relative rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 overflow-hidden">
          <div className="pointer-events-none absolute -inset-px rounded-2xl [mask-image:linear-gradient(transparent,black,transparent)]">
            <div className="absolute -inset-px rounded-2xl bg-[conic-gradient(from_90deg_at_50%_50%,#60a5fa_0deg,#a78bfa_120deg,#34d399_240deg,#60a5fa_360deg)] opacity-20 blur-2xl" />
          </div>
          <div className="relative">
            <h2 className="text-lg font-semibold mb-2">Why Votely?</h2>
            <p className="text-sm text-muted-foreground">
              We designed Votely to make elections feel trustworthy and exciting. With accessible UI, serverless OTP, and
              analytics‑ready results, organizers can focus on voters—not plumbing.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="px-2 py-1 rounded-md border border-white/10 bg-card/60">OTP Auth</span>
              <span className="px-2 py-1 rounded-md border border-white/10 bg-card/60">Supabase</span>
              <span className="px-2 py-1 rounded-md border border-white/10 bg-card/60">ShadCN UI</span>
              <span className="px-2 py-1 rounded-md border border-white/10 bg-card/60">Tailwind</span>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a
                href="https://github.com/KuehTzeShuen/Electronic-Voting-App"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90 shadow-[0_0_24px_rgba(99,102,241,0.25)]"
              >
                View on GitHub
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-90">
                  <path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a
                href="/polling-menu"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                Explore Polls
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


