"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<"student" | "admin" | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    student_id: string | null;
    gender: string | null;
    ug_pg: string | null;
    dob: string | null;
    discipline: number | null;
    location: number | null;
    grade: string | null;
    role: string | null;
  } | null>(null);

  // Mappings for display
  const disciplineMap: Record<string, string> = {
    "1": "Design and Architecture",
    "2": "Arts",
    "3": "Business and Economics",
    "4": "Education",
    "5": "Engineering",
    "6": "Information Technology",
    "7": "Law",
    "8": "Medicine, Nursing and Health Sciences",
    "9": "Pharmacy and Pharmaceutical Sciences",
    "10": "Science",
  };
  const locationMap: Record<string, string> = {
    "1": "Clayton",
    "2": "Caulfield",
    "3": "Peninsula",
    "4": "Parkville",
    "5": "Malaysia",
    "6": "Other",
  };

  useEffect(() => {
    try {
      const storedRole = typeof window !== "undefined" ? localStorage.getItem("appRole") : null;
      const storedEmail = typeof window !== "undefined" ? localStorage.getItem("appEmail") : null;
      if (storedRole === "admin" || storedRole === "student") setRole(storedRole);
      if (storedEmail) setEmail(storedEmail);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Prefer Supabase auth user → users table by auth_id
        const { data: { user } } = await supabase.auth.getUser();
        let row: { 
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          student_id: string | null;
          gender: string | null;
          ug_pg: string | null;
          dob: string | null;
          discipline: number | null;
          location: number | null;
          grade: string | null;
          role: string;
        } | null = null;
        if (user?.id) {
          const { data } = await supabase
            .from("users")
            .select("email, first_name, last_name, student_id, gender, ug_pg, dob, discipline, location, grade, role")
            .eq("auth_id", user.id)
            .limit(1)
            .maybeSingle();
          if (data) row = data;
        }
        // Fallback: fetch by email from localStorage
        if (!row && email) {
          const { data } = await supabase
            .from("users")
            .select("email, first_name, last_name, student_id, gender, ug_pg, dob, discipline, location, grade, role")
            .eq("email", email)
            .limit(1)
            .maybeSingle();
          if (data) row = data;
        }
        const effectiveRole = (() => {
          try {
            const stored = typeof window !== "undefined" ? localStorage.getItem("appRole") : null;
            return stored === "admin" || stored === "student" ? stored : role;
          } catch {
            return role;
          }
        })();
        setProfile({
          email: row?.email ?? email ?? null,
          first_name: row?.first_name ?? null,
          last_name: row?.last_name ?? null,
          student_id: row?.student_id ?? null,
          gender: row?.gender ?? null,
          ug_pg: row?.ug_pg ?? null,
          dob: row?.dob ?? null,
          discipline: row?.discipline ?? null,
          location: row?.location ?? null,
          grade: row?.grade ?? null,
          role: effectiveRole ?? null,
        });
      } catch {}
    })();
  }, [email, role]);

  const links = [
    { name: "Polls", href: "/polling-menu" },
    { name: "Completed Polls", href: "/polling-menu/completed" },
    { name: "Help", href: "/help" },
  ];

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b bg-background/80 backdrop-blur-md">
      {/* Logo */}
      <Link href="/polling-menu" className="font-bold text-xl">
        <span className="bg-clip-text text-transparent bg-[linear-gradient(135deg,#60a5fa_0%,#a78bfa_40%,#34d399_85%)]">Votely</span>
      </Link>

      {/* Navigation Links */}
      <NavigationMenu>
        <NavigationMenuList>
          {links.map((link) => (
            <NavigationMenuItem key={link.href}>
              <NavigationMenuLink
                asChild
                className={`px-3 py-2 rounded-md transition ${
                  pathname === link.href
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link href={link.href}>{link.name}</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
          {role === "admin" && (
            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className={`px-3 py-2 rounded-md transition ${
                  pathname === "/polls/new"
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link href="/polls/new">Add Poll</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          )}
          {/* Always render About last */}
          <NavigationMenuItem>
            <NavigationMenuLink
              asChild
              className={`px-3 py-2 rounded-md transition ${
                pathname === "/about"
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Link href="/about">About</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      {/* Right-side buttons (Add Poll for admins, profile menu) */}
      <div className="flex items-center gap-3">
        {/* Admin Add Poll moved into the main nav links for consistent styling */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer">
              <AvatarImage src="/avatar.png" alt="User avatar" />
              <AvatarFallback>{email ? (email[0] || "U").toUpperCase() : "U"}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Profile</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 text-xs text-muted-foreground space-y-1 max-h-80 overflow-y-auto">
              <div><span className="font-medium text-foreground">Email:</span> {profile?.email ?? "-"}</div>
              <div><span className="font-medium text-foreground">Name:</span> {(profile?.first_name ?? "-") + " " + (profile?.last_name ?? "")}</div>
              <div><span className="font-medium text-foreground">Student ID:</span> {profile?.student_id ?? "-"}</div>
              <div><span className="font-medium text-foreground">Gender:</span> {profile?.gender ?? "-"}</div>
              <div><span className="font-medium text-foreground">Level:</span> {profile?.ug_pg ?? "-"}</div>
              <div><span className="font-medium text-foreground">Date of Birth:</span> {profile?.dob ? new Date(profile.dob).toLocaleDateString() : "-"}</div>
              <div><span className="font-medium text-foreground">Discipline:</span> {profile?.discipline != null ? (disciplineMap[String(profile.discipline)] ?? String(profile.discipline)) : "-"}</div>
              <div><span className="font-medium text-foreground">Location:</span> {profile?.location != null ? (locationMap[String(profile.location)] ?? String(profile.location)) : "-"}</div>
              <div><span className="font-medium text-foreground">Role:</span> {profile?.role ?? "-"}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-500" onClick={() => {
              try {
                localStorage.removeItem("appEmail");
                localStorage.removeItem("appRole");
                localStorage.removeItem("authUser");
              } catch {}
              router.push("/");
            }}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
