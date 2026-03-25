"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Mic,
  ClipboardPaste,
  FileText,
  Users,
  ListChecks,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Record", href: "record", icon: Mic },
  { label: "Dashboard", href: "dashboard", icon: LayoutDashboard },
  { label: "Paste", href: "paste", icon: ClipboardPaste },
  { label: "Calls", href: "transcripts", icon: FileText },
  { label: "Technicians", href: "technicians", icon: Users },
  { label: "Eval Criteria", href: "settings/criteria", icon: ListChecks },
  { label: "Settings", href: "settings", icon: Settings },
];

export function Sidebar({ orgId }: { orgId: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          CallScore
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const href = `/org/${orgId}/${item.href}`;
          const anyActive = navItems.some((n) =>
            pathname.startsWith(`/org/${orgId}/${n.href}`)
          );
          const isActive =
            pathname.startsWith(href) ||
            (!anyActive && item.href === "record");
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
