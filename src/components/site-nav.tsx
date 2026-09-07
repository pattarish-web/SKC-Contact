"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "คลังสัญญา" },
  { href: "/audit", label: "ตรวจเว็บ" },
];

export function SiteNav() {
  const pathname = usePathname();
  if (!pathname.startsWith("/audit")) {
    return null;
  }
  return (
    <nav className="border-b border-teal-900/10 bg-[oklch(0.995_0.006_175)]">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-2 sm:px-6">
        <p className="mr-3 hidden text-xs text-muted-foreground sm:block">
          สำหรับตรวจระบบ
        </p>
        {LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium",
                active
                  ? "bg-teal-800 text-white"
                  : "text-teal-900 hover:bg-teal-50"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
