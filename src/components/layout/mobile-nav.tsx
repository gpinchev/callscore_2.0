"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Mic,
  FileText,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Record", href: "record", icon: Mic },
  { label: "Dashboard", href: "dashboard", icon: LayoutDashboard },
  { label: "Calls", href: "transcripts", icon: FileText },
  { label: "Techs", href: "technicians", icon: Users },
  { label: "Settings", href: "settings", icon: Settings },
];

export function MobileNav({ orgId }: { orgId: string }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const href = `/org/${orgId}/${tab.href}`;
          const anyActive = tabs.some((t) =>
            pathname.startsWith(`/org/${orgId}/${t.href}`)
          );
          const isActive =
            pathname.startsWith(href) ||
            (!anyActive && tab.href === "record");
          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
