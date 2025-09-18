"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const colorPalette = [
  "bg-[#3B4A5A]",
  "bg-[#6B4A9B]",
  "bg-[#2E5D47]",
  "bg-[#B07D62]",
  "bg-[#11777B]",
  "bg-[#A23E48]",
];

export default function OngoingPollsPage() {
  const [search, setSearch] = useState("");
  const [polls] = useState([
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

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const router = useRouter();

  // Animation end handler
  const handleAnimationEnd = () => {
    if (selectedIdx !== null) {
      router.push(`/poll/${selectedIdx}`);
    }
  };

  // When Confirm is clicked
  const handleSelect = (idx: number) => {
    const card = cardRefs.current[idx];
    if (card) {
      const rect = card.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;
      // Calculate the card's center
      const cardCenterX = rect.left + rect.width / 2 + scrollX;
      const cardCenterY = rect.top + rect.height / 2 + scrollY;
      // Calculate the viewport center
      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = window.innerHeight / 2;
      // Calculate translation needed
      const translateX = viewportCenterX - cardCenterX;
      const translateY = viewportCenterY - cardCenterY;
      setCardStyle({
        position: "absolute",
        left: rect.left + scrollX,
        top: rect.top + scrollY,
        width: rect.width,
        height: rect.height,
        zIndex: 50,
        transition: "transform 0.7s cubic-bezier(0.4,0,0.2,1), opacity 0.7s",
        transform: `translate(0px, 0px) scale(1)`,
      });
      setSelectedIdx(idx);
      // Animate to center after a tick
      setTimeout(() => {
        // Calculate scale factors
        const targetWidth = window.innerWidth * 0.9;
        const targetHeight = window.innerHeight * 0.8;
        const scaleX = targetWidth / rect.width;
        const scaleY = targetHeight / rect.height;
        setCardStyle((prev: React.CSSProperties) => ({
          ...prev,
          transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`,
          boxShadow: "0 10px 40px 0 rgba(0,0,0,0.3)",
        }));
      }, 10);
    }
  };

  return (
    <div
      className={`min-h-screen bg-[#232229] flex flex-col items-center relative transition-colors duration-500 ${
        selectedIdx !== null ? "bg-opacity-0" : "bg-opacity-100"
      }`}
    >
      {/* Top circle */}
      <div
        className={`absolute top-0 left-0 w-full h-40 overflow-hidden transition-opacity duration-500 ${
          selectedIdx !== null ? "opacity-0" : "opacity-100"
        }`}
      >
        <svg
          viewBox="0 0 375 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <circle cx="0" cy="0" r="200" fill="#11777B" />
        </svg>
      </div>
      {/* Header */}
      <div
        className={`relative z-10 w-full flex flex-row items-center justify-between px-8 pt-8 transition-opacity duration-500 ${
          selectedIdx !== null ? "opacity-0" : "opacity-100"
        }`}
      >
        <h1
          className="text-white text-4xl font-bold"
          style={{ fontFamily: "inherit" }}
        >
          Ongoing Polls
        </h1>
        {/* Hamburger menu icon */}
        <div className="w-8 h-8 flex flex-col justify-center items-center">
          <span className="block w-6 h-1 bg-white rounded mb-1"></span>
          <span className="block w-6 h-1 bg-white rounded mb-1"></span>
          <span className="block w-6 h-1 bg-white rounded"></span>
        </div>
      </div>
      <div className="relative z-10 w-full flex flex-row items-center justify-center px-8 pt-8 transition-opacity duration-500">
        <input
          type="text"
          placeholder="Search"
          className="rounded-full px-4 py-2 bg-[#989898] text-black text-sm font-semibold outline-none"
          style={{ minWidth: 250 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {/* Poll cards */}
      <div className="relative z-10 w-full flex flex-col gap-6 px-8 pt-8 items-center">
        {polls
          .filter(
            poll =>
              poll.club.toLowerCase().includes(search.toLowerCase()) ||
              poll.title.toLowerCase().includes(search.toLowerCase()) ||
              (poll.extra && poll.extra.toLowerCase().includes(search.toLowerCase()))
          )
          .map((poll, idx) => {
          const isSelected = selectedIdx === idx;
          const isFading = selectedIdx !== null && !isSelected;

          // Render the absolutely positioned animating card only when selected
          if (isSelected && Object.keys(cardStyle).length > 0) {
            // Animate card, but keep text size fixed and centered, fade out input/button
            return (
              <div
                key={"animating-" + idx}
                style={cardStyle}
                className={`
                  rounded-3xl ${poll.color} p-5 flex flex-col gap-3 items-center
                  transition-all duration-700
                  z-50
                `}
                onTransitionEnd={handleAnimationEnd}
              >
                <div className="flex flex-col items-center w-full justify-center h-full">
                  <div className="text-white text-xs font-semibold">
                    {poll.club}
                  </div>
                  <div className="text-white text-xl font-bold leading-tight">
                    {poll.title}
                  </div>
                  {poll.extra && (
                    <div className="text-white text-xs">{poll.extra}</div>
                  )}
                </div>
                <div
                  className="flex flex-row gap-2 mt-2 w-full justify-center transition-opacity duration-700"
                  style={{ opacity: 0 }}
                >
                  <input
                    type="text"
                    placeholder="Enter code:"
                    className="rounded-full px-4 py-2 bg-[#232229] text-white text-sm font-semibold outline-none mr-2"
                    style={{ minWidth: 100 }}
                    disabled
                  />
                  <button
                    type="button"
                    className="rounded-full px-4 py-2 bg-[#232229] text-white text-sm font-semibold outline-none mr-2"
                    style={{ minWidth: 100 }}
                    disabled
                  >
                    Confirm
                  </button>
                </div>
              </div>
            );
          }

          // Render the normal cards (fade out if not selected)
          return (
            <div
              key={idx}
              ref={el => { cardRefs.current[idx] = el; }}
              className={`
          rounded-3xl ${poll.color} p-6 flex flex-col gap-4 relative max-w-xl w-full
          transition-all duration-700
          ${isFading ? "opacity-0 pointer-events-none" : "opacity-100"}
          ${isSelected && selectedIdx !== null ? "opacity-0" : ""}
        `}
              style={{ minHeight: 150, marginLeft: 'auto', marginRight: 'auto' }}
            >
              <div className="text-white text-xs font-semibold">
                {poll.club}
              </div>
              <div className="text-white text-xl font-bold leading-tight">
                {poll.title}
              </div>
              {poll.extra && (
                <div className="text-white text-xs">{poll.extra}</div>
              )}
              <div className="flex flex-row gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Enter code:"
                  className="rounded-full px-4 py-2 bg-[#232229] text-white text-sm font-semibold outline-none mr-2"
                  style={{ minWidth: 100 }}
                  disabled={selectedIdx !== null}
                />
                <button
                  type="button"
                  className="rounded-full px-4 py-2 bg-[#232229] text-white text-sm font-semibold outline-none mr-2"
                  style={{ minWidth: 100 }}
                  onClick={() => handleSelect(idx)}
                  disabled={selectedIdx !== null}
                >
                  Confirm
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
