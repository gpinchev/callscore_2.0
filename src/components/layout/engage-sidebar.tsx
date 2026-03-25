"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Moon,
  Phone,
  Voicemail,
  Pause,
  Clock,
  Bell,
  Timer,
  Mic,
  Tag,
  Ban,
  BarChart2,
  FileText,
  Server,
  Wifi,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const engageItems = [
  { label: "Do Not Disturb", icon: Moon },
  { label: "Phone Lines", icon: Phone },
  { label: "Voicemail Settings", icon: Voicemail },
  { label: "Hold Settings", icon: Pause },
  { label: "Working Hours", icon: Clock },
  { label: "Notifications", icon: Bell },
  { label: "Ring Duration", icon: Timer },
  { label: "Audio Samples", icon: Mic },
  { label: "Tags", icon: Tag },
  { label: "Blocked Contacts", icon: Ban },
  { label: "Reporting", icon: BarChart2 },
  { label: "10DLC Information", icon: FileText },
  { label: "SIP Settings", icon: Server },
  { label: "Network Diagnosis", icon: Wifi },
];

export function EngageSidebar({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const callScoreHref = `/org/${orgId}/dashboard`;
  const isCallScoreActive = pathname.startsWith(`/org/${orgId}`);

  return (
    <aside className="flex w-60 flex-none flex-col border-r bg-white">
      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {engageItems.map((item) => (
          <button
            key={item.label}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
            disabled
          >
            <item.icon className="h-4 w-4 text-gray-400" />
            {item.label}
          </button>
        ))}

        {/* Divider */}
        <div className="my-2 border-t" />

        {/* Call Score — the active CallScore item */}
        <Link
          href={callScoreHref}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium",
            isCallScoreActive ? "" : "text-gray-600 hover:bg-gray-50"
          )}
          style={isCallScoreActive ? { color: "#007CC4" } : undefined}
        >
          <Star
            className="h-4 w-4"
            style={isCallScoreActive ? { color: "#007CC4" } : undefined}
          />
          Call Score
        </Link>
      </nav>
    </aside>
  );
}
