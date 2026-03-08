"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Organization } from "@/lib/supabase/types";

type OrgWithCost = Organization & { total_eval_cost: number | null };

export default function LandingPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgWithCost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((data) => {
        setOrgs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">CallScore</h1>
          <p className="text-muted-foreground">
            AI-powered call analysis for field service teams
          </p>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="h-10 w-10 rounded-md bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-muted" />
                      <div className="h-3 w-20 rounded bg-muted" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : orgs.length > 0 ? (
            orgs.map((org) => (
              <Card
                key={org.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => router.push(`/org/${org.id}/record`)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{org.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {org.industry}
                      </Badge>
                      {org.total_eval_cost != null && org.total_eval_cost > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ${org.total_eval_cost < 0.01
                            ? org.total_eval_cost.toFixed(4)
                            : org.total_eval_cost < 1
                            ? org.total_eval_cost.toFixed(3)
                            : org.total_eval_cost.toFixed(2)} eval cost
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                No organizations yet. Create one to get started.
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={() => router.push("/onboarding")}
          className="w-full"
          size="lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Organization
        </Button>
      </div>
    </div>
  );
}
