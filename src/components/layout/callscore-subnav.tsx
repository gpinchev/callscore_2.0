"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "dashboard", exact: false },
  { label: "Calls", href: "transcripts", exact: false },
  { label: "Alerts", href: "alerts", exact: false },
  { label: "Settings", href: "settings", exact: false },
];

export function CallScoreSubNav({ orgId }: { orgId: string }) {
  const pathname = usePathname();

  return (
    <div className="flex-none border-b bg-white">
      <div className="flex items-center gap-0 overflow-x-auto px-6">
        {navItems.map((item) => {
          const href = `/org/${orgId}/${item.href}`;
          const anyActive = navItems.some((n) =>
            pathname.startsWith(`/org/${orgId}/${n.href}`)
          );
          const isActive =
            (item.exact ? pathname === href : pathname.startsWith(href)) ||
            (!anyActive && item.href === "dashboard");
          return (
            <Link
              key={item.href}
              href={href}
              className="whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 hover:border-gray-300"
              style={isActive ? { color: "#007CC4", borderColor: "#007CC4" } : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
