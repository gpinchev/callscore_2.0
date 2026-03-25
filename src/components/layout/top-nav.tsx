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
import { OrgSwitcher } from "./org-switcher";

const navItems = [
  { label: "Record", href: "record", icon: Mic },
  { label: "Dashboard", href: "dashboard", icon: LayoutDashboard },
  { label: "Paste", href: "paste", icon: ClipboardPaste },
  { label: "Calls", href: "transcripts", icon: FileText },
  { label: "Technicians", href: "technicians", icon: Users },
  { label: "Eval Criteria", href: "settings/criteria", icon: ListChecks },
  { label: "Settings", href: "settings", icon: Settings },
];

export function TopNav({ orgId, orgName }: { orgId: string; orgName: string }) {
  const pathname = usePathname();

  return (
    <header className="flex-none">
      {/* Dark navy brand bar */}
      <div
        className="flex h-14 items-center justify-between px-4 md:px-6"
        style={{ backgroundColor: "var(--nav-bg)" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-base font-bold tracking-tight"
            style={{ color: "var(--nav-fg)" }}
          >
            CallScore
          </Link>
          <span style={{ color: "var(--nav-muted)" }} className="text-sm">|</span>
          <div style={{ color: "var(--nav-fg)" }}>
            <OrgSwitcher orgId={orgId} orgName={orgName} navy />
          </div>
        </div>
      </div>

      {/* White tab bar */}
      <div className="border-b bg-card">
        <nav className="flex items-center gap-0 overflow-x-auto px-4 md:px-6">
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
                  "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
