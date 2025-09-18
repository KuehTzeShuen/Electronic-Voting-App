"use client";

const colorPalette = [
  "bg-[#3B4A5A]",
  "bg-[#6B4A9B]",
  "bg-[#2E5D47]",
  "bg-[#B07D62]",
  "bg-[#11777B]",
  "bg-[#A23E48]",
];

const pollData = [
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
];

export default function PollPage() {
  // Example voting options
  const votingOptions = [
    "Alice Tan",
    "Bob Lee",
    "Charlie Lim",
    "Diana Ong",
    "Ethan Koh",
    "Fiona Goh"
  ];

  // Shuffle and pick 4 options
  function getRandomOptions(arr: string[], n: number): string[] {
    const shuffled = arr.slice().sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  }
  const optionsToShow = getRandomOptions(votingOptions, 4);
  // const id = Number(params.id);
  const id = 0
  const poll = pollData[id];

  if (!poll) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#232229] text-white">
        Poll not found.
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${poll.color}`}>
      <div className="bg-opacity-10 rounded-3xl p-8 shadow-lg flex flex-col items-center gap-4">
        <div className="text-white text-xs font-semibold">{poll.club}</div>
        <div className="text-white text-2xl font-bold">{poll.title}</div>
        {poll.extra && (
          <div className="text-white text-sm">{poll.extra}</div>
        )}
        {/* Add more poll details or voting UI here */}
      </div>
      {/* Dropdown section for voting options */}
      <div className="mt-8 w-full max-w-md bg-[#232229] rounded-2xl shadow p-6 flex flex-col items-center gap-4">
        <div className="text-white text-lg font-semibold mb-2">Choose your candidate:</div>
        <ul className="w-full flex flex-col gap-3">
          {optionsToShow.map((option) => (
            <li key={option} className="w-full">
              <button className="w-full bg-[#1a1a1c] text-white rounded-xl py-3 px-4 font-medium hover:bg-[#11777B] transition-colors">
                {option}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}