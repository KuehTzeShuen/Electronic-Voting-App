"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/navbar";

export default function NavbarWrapper() {
  const pathname = usePathname();
  const hideNavbar = ["/", "/login", "/signup"].includes(pathname);

  // ✅ Only show Navbar if not on login/register pages
  if (hideNavbar) return null;

  return <Navbar />;
}
