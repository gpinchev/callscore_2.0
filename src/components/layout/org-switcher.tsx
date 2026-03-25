"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Organization } from "@/lib/supabase/types";

export function OrgSwitcher({
  orgId,
  orgName,
  navy,
}: {
  orgId: string;
  orgName: string;
  navy?: boolean;
}) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((data) => setOrgs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 font-medium"
          style={navy ? { color: "var(--nav-fg)" } : undefined}
        >
          <Building2
            className="h-4 w-4"
            style={navy ? { color: "var(--nav-muted)" } : undefined}
          />
          {orgName}
          <ChevronsUpDown
            className="h-3 w-3"
            style={navy ? { color: "var(--nav-muted)" } : undefined}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => router.push(`/org/${org.id}/dashboard`)}
            className={org.id === orgId ? "bg-accent" : ""}
          >
            <Building2 className="mr-2 h-4 w-4" />
            {org.name}
          </DropdownMenuItem>
        ))}
        {orgs.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem onClick={() => router.push("/onboarding")}>
          + Create New Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
