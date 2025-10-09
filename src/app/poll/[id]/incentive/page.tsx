"use client";

import React, { useMemo, useRef, useState } from "react";
import { motion, useAnimation, AnimatePresence, type Transition } from "framer-motion";
import { useRouter, useParams } from "next/navigation";

type Rarity =
  | "Consumer"
  | "Industrial"
  | "Mil-Spec"
  | "Restricted"
  | "Classified"
  | "Covert"
  | "Exceedingly Rare";

interface Item {
  id: string;
  name: string;
  rarity: Rarity;
  weight: number;
  emoji: string;
}


/**
 * Palette mapped to your app tokens.
 * Feel free to tweak the hues; the important bit is we stick to theme variables.
 */
const RARITY_STYLES: Record<
  Rarity,
  { bg: string; ring: string; text: string }
> = {
  Consumer: {
    bg: "bg-muted",
    ring: "ring-border",
    text: "text-foreground",
  },
  Industrial: {
    bg: "bg-cyan-600/20",
    ring: "ring-cyan-500/40",
    text: "text-cyan-200",
  },
  "Mil-Spec": {
    bg: "bg-blue-600/20",
    ring: "ring-blue-500/40",
    text: "text-blue-200",
  },
  Restricted: {
    bg: "bg-purple-600/20",
    ring: "ring-purple-500/40",
    text: "text-purple-200",
  },
  Classified: {
    bg: "bg-pink-600/20",
    ring: "ring-pink-500/40",
    text: "text-pink-200",
  },
  Covert: {
    bg: "bg-red-600/20",
    ring: "ring-red-500/40",
    text: "text-red-200",
  },
  "Exceedingly Rare": {
    bg: "bg-yellow-400/20",
    ring: "ring-yellow-300/40",
    text: "text-yellow-100",
  },
};

const POOL: Item[] = [
  { id: "1", name: "Nothing", rarity: "Consumer", weight: 300, emoji: "❌" },
  { id: "2", name: "Sticker", rarity: "Consumer", weight: 200, emoji: "🏷️" },
  { id: "3", name: "Pen", rarity: "Industrial", weight: 150, emoji: "🖊️" },
  { id: "4", name: "Notebook", rarity: "Mil-Spec", weight: 120, emoji: "📓" },
  { id: "5", name: "Hoodie", rarity: "Restricted", weight: 80, emoji: "🧥" },
  { id: "6", name: "Cap", rarity: "Classified", weight: 50, emoji: "🧢" },
  { id: "7", name: "Keychain", rarity: "Covert", weight: 20, emoji: "🔑" },
  { id: "8", name: "Giftcard", rarity: "Exceedingly Rare", weight: 5, emoji: "🎁" },
];

const TILE_W = 120;
const TILE_GAP = 12;
const TILE_FULL = TILE_W + TILE_GAP;

function weightedPick(items: Item[], rng = Math.random): Item {
  const total = items.reduce((s, it) => s + it.weight, 0);
  let r = rng() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function buildStrip({
  pool,
  winner,
  pad = 40,
  tail = 60,
}: {
  pool: Item[];
  winner: Item;
  pad?: number;
  tail?: number;
}): Item[] {
  const randItem = () => pool[Math.floor(Math.random() * pool.length)];
  const arr: Item[] = [];
  for (let i = 0; i < pad; i++) arr.push(randItem());
  arr.push(winner);
  for (let i = 0; i < tail; i++) arr.push(randItem());
  return arr;
}

const EASES: ("linear" | number[])[] = [
  "linear",
  [0.25, 0.1, 0.25, 1.0],
  [0.42, 0, 1, 1],
  [0, 0, 0.58, 1],
  [0.12, 0.86, 0.12, 1.0],
];

export default function CaseRoller() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);
  const controls = useAnimation();
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<Item | null>(null);
  const [strip, setStrip] = useState<Item[]>([]);
  const [seed, setSeed] = useState<number>(() => Math.random());
  const [runId, setRunId] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const winnerRef = useRef<Item | null>(null);

  const centerOffsetPx = useMemo(() => {
    const visibleTiles = 7;
    const containerWidth = visibleTiles * TILE_FULL;
    const center = containerWidth / 2 - TILE_FULL / 2;
    return center;
  }, []);

  const router = useRouter();

  async function roll() {
    if (rolling) return;
    setShowModal(false);
    setResult(null);
    setRolling(true);

    controls.stop();
    controls.set({ x: 0 });
    setRunId((v) => v + 1);

    let _s = seed * 1_000_000;
    const rng = () => {
      _s = (1103515245 * _s + 12345) % 2 ** 31;
      return _s / 2 ** 31;
    };

    const win = weightedPick(POOL, rng);
    winnerRef.current = win;

    const padTiles = 40;
    const tailTiles = 60;
    const newStrip = buildStrip({ pool: POOL, winner: win, pad: padTiles, tail: tailTiles });
    setStrip(newStrip);

    await new Promise(requestAnimationFrame);

    const winnerIndex = padTiles;
    const targetX = -(winnerIndex * TILE_FULL) + centerOffsetPx;

    const duration = 5.8 + rng() * 0.8;
    const easeChoice = EASES[Math.floor(rng() * EASES.length)];

    await controls.start({ x: 0, transition: { duration: 0, ease: "linear" } });
    await controls.start({ x: targetX, transition: { duration, ease: easeChoice as Transition['ease'] } });
    await controls.start({ x: targetX + 14, transition: { duration: 0.18 } });
    await controls.start({ x: targetX, transition: { duration: 0.22 } });

    setRolling(false);
    setResult(win);
    setShowModal(true);
    setSeed(Math.random());
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-[940px] max-w-full">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-3">Thank You for Voting</h1>
        {/* Roller */}
        <div className="relative select-none rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {/* subtle top/bottom sheen */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-foreground/5 via-transparent to-background/20" />
          {/* center indicator */}
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-full w-0.5 bg-primary/80 shadow-[0_0_14px_rgba(0,0,0,0.2)] z-20" />

          <div className="relative overflow-hidden px-4 py-6">
            {/* moving lines during roll */}
            <div
              className={`absolute inset-0 pointer-events-none ${
                rolling ? "[mask-image:linear-gradient(90deg,transparent,black,transparent)]" : ""
              }`}
            >
              <div
                className={`absolute inset-0 ${rolling ? "animate-pulse" : ""}`}
                style={{
                  background: rolling
                    ? "repeating-linear-gradient(90deg, hsl(var(--border)) 0, hsl(var(--border)) 3px, transparent 3px, transparent 12px)"
                    : undefined,
                }}
              />
            </div>

            <motion.div
              key={runId}
              className={`flex gap-3 will-change-transform ${rolling ? "blur-[0.6px]" : ""}`}
              animate={controls}
              style={{ x: 0 }}
            >
              {strip.map((it, i) => {
                const rarity = RARITY_STYLES[it.rarity];
                return (
                  <div
                    key={i}
                    className={`${rarity.bg} ${rarity.text} ring-1 ${rarity.ring} rounded-xl p-3 flex flex-col items-center justify-center shadow-sm shrink-0`}
                    style={{ width: TILE_W }}
                  >
                    <div className="text-4xl drop-shadow mb-2">{it.emoji}</div>
                    <div className="text-[10px] uppercase tracking-wide opacity-80">{it.rarity}</div>
                    <div className="text-sm font-medium text-center line-clamp-2">{it.name}</div>
                  </div>
                );
              })}

              {strip.length === 0 && (
                <div className="text-muted-foreground py-8">Press ROLL to spin…</div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={roll}
            disabled={rolling}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            {rolling ? "Rolling…" : "Roll"}
          </button>
        </div>

        {/* Result modal */}
        <AnimatePresence>
          {showModal && result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowModal(false)}
            >
              <div
                className={`p-6 rounded-2xl border border-border bg-card text-foreground shadow-xl`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-xl ${RARITY_STYLES[result.rarity].bg} ${RARITY_STYLES[result.rarity].text} ring-2 ${RARITY_STYLES[result.rarity].ring}`}>
                  <span className="text-5xl">{result.emoji}</span>
                </div>
                <h2 className="text-xl font-semibold mb-1 text-center">
                  You got: <span className="font-bold">{result.name}</span>
                </h2>
                <p className="text-center text-muted-foreground mb-4">{result.rarity}</p>
                <div className="flex justify-center">
                  <button
                    onClick={() => router.push(`/poll/${id}`)}
                    className="inline-flex items-center justify-center rounded-md bg-secondary text-secondary-foreground px-4 py-2 text-sm font-medium hover:bg-secondary/80"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}