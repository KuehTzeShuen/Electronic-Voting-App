"use client";

import { useState } from "react";

interface PreferentialPollProps {
  options: string[];
  onChange?: (ranking: string[]) => void;
}

export default function PreferentialPoll({ options, onChange }: PreferentialPollProps) {
  const [ranking, setRanking] = useState<string[]>([]);

  const handleSelect = (option: string) => {
    if (ranking.includes(option)) {
      const updated = ranking.filter(o => o !== option);
      setRanking(updated);
      onChange?.(updated);
    } else {
      const updated = [...ranking, option];
      setRanking(updated);
      onChange?.(updated);
    }
  };

  return (
    <div className="space-y-2">
      {options.map(option => {
        const rank = ranking.indexOf(option) + 1;
        return (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            className={`w-full p-3 border rounded-lg flex justify-between ${
              rank ? "bg-primary/20 border-primary/60" : "bg-card border-border hover:bg-muted/50"
            }`}
          >
            <span>{option}</span>
            {rank > 0 && <span className="font-bold">{rank}</span>}
          </button>
        );
      })}
    </div>
  );
}
