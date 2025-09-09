"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add your login logic here
    router.push("/polling-menu");
  };

  return (
    <div className="min-h-screen bg-[#232229] flex flex-col items-center justify-start relative">
      {/* Top curved shape */}
      <div className="absolute top-0 left-0 w-full h-40 overflow-hidden">
        <svg viewBox="0 0 375 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M0 0H375V80C250 140 125 40 0 80V0Z" fill="#11777B"/>
        </svg>
      </div>
      {/* Sign Up text */}
      <div className="relative z-10 w-full flex flex-col items-start px-8 pt-10">
        <h1 className="text-white text-2xl font-bold mb-12" style={{fontFamily: 'inherit'}}>Sign Up</h1>
      </div>
      {/* Login form */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-xs flex flex-col gap-6 px-8"
      >
        <div>
          <label className="block text-white text-lg font-bold mb-2" style={{fontFamily: 'inherit'}}>
            Student Email
          </label>
          <input
            type="email"
            className="w-full rounded-full px-6 py-3 bg-[#D9D9D9] text-black text-base font-semibold outline-none"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>
        <div>
          <label className="block text-white text-lg font-bold mb-2" style={{fontFamily: 'inherit'}}>
            Student ID
          </label>
          <input
            type="text"
            className="w-full rounded-full px-6 py-3 bg-[#D9D9D9] text-black text-base font-semibold outline-none"
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            placeholder="Enter your student ID"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-full px-6 py-3 bg-[#232F3E] text-white text-lg font-bold mt-2 transition hover:bg-[#1a2533]"
          style={{fontFamily: 'inherit'}}
        >
          Log In
        </button>
      </form>
    </div>
  );
}