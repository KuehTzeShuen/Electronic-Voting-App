"use client";
import { useState } from "react";

const colorPalette = [
  "bg-[#3B4A5A]",
  "bg-[#6B4A9B]",
  "bg-[#2E5D47]",
  "bg-[#B07D62]",
  "bg-[#11777B]",
  "bg-[#A23E48]",
];

export default function OngoingPollsPage() {
  const [polls, setPolls] = useState([
    {
      club: "Monash Cybersecurity Club",
      title: "2025 OGM MONSEC President Poll",
      color: colorPalette[0],
      extra: "",
    },
    {
      club: "Monash Cybersecurity Club",
      title: "2025 OGM MONSEC President Poll",
      color: colorPalette[1],
      extra: "100 MONSEC Merch coupon available",
    },
    {
      club: "Monash Cybersecurity Club",
      title: "2025 OGM MONSEC Secretary Poll",
      color: colorPalette[2],
      extra: "",
    },
  ]);

  const [club, setClub] = useState("");
  const [title, setTitle] = useState("");
  const [extra, setExtra] = useState("");

  const handleAddPoll = (e: React.FormEvent) => {
    e.preventDefault();
    const color = colorPalette[polls.length % colorPalette.length];
    setPolls([
      ...polls,
      { club, title, color, extra },
    ]);
    setClub("");
    setTitle("");
    setExtra("");
  };

  return (
    <div className="min-h-screen bg-[#232229] flex flex-col items-center relative">
      {/* Top circle */}
      <div className="absolute top-0 left-0 w-full h-40 overflow-hidden">
        <svg viewBox="0 0 375 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="0" cy="0" r="200" fill="#11777B" />
        </svg>
      </div>
      {/* Header */}
      <div className="relative z-10 w-full flex flex-row items-center justify-between px-8 pt-8">
        <h1 className="text-white text-2xl font-bold" style={{fontFamily: 'inherit'}}>Ongoing Polls</h1>
        {/* Hamburger menu icon */}
        <div className="w-8 h-8 flex flex-col justify-center items-center">
          <span className="block w-6 h-1 bg-white rounded mb-1"></span>
          <span className="block w-6 h-1 bg-white rounded mb-1"></span>
          <span className="block w-6 h-1 bg-white rounded"></span>
        </div>
      </div>
      {/* Add Poll Form */}
      <form
        onSubmit={handleAddPoll}
        className="relative z-10 w-full max-w-xs flex flex-col gap-2 px-8 pt-6"
      >
        <input
          type="text"
          placeholder="Club Name"
          className="rounded-full px-4 py-2 bg-[#D9D9D9] text-black text-sm font-semibold outline-none"
          value={club}
          onChange={e => setClub(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Poll Title"
          className="rounded-full px-4 py-2 bg-[#D9D9D9] text-black text-sm font-semibold outline-none"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Extra Info (optional)"
          className="rounded-full px-4 py-2 bg-[#D9D9D9] text-black text-sm font-semibold outline-none"
          value={extra}
          onChange={e => setExtra(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-full px-4 py-2 bg-[#11777B] text-white text-sm font-bold mt-2 transition hover:bg-[#0e5e62]"
        >
          Add Poll
        </button>
      </form>
      {/* Poll cards */}
      <div className="relative z-10 w-full flex flex-col gap-6 px-4 pt-8">
        {polls.map((poll, idx) => (
          <div
            key={idx}
            className={`rounded-3xl ${poll.color} p-5 flex flex-col gap-3 relative`}
            style={{ minHeight: 150 }}
          >
            <div className="text-white text-xs font-semibold">{poll.club}</div>
            <div className="text-white text-xl font-bold leading-tight">{poll.title}</div>
            {poll.extra && (
              <div className="text-white text-xs">{poll.extra}</div>
            )}
            <div className="flex flex-row items-center mt-2">
              <input
                type="text"
                placeholder="Enter code:"
                className="rounded-full px-4 py-2 bg-[#232229] text-white text-sm font-semibold outline-none mr-2"
                style={{ minWidth: 100 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}