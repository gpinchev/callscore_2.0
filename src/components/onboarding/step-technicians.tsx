"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { OnboardingData } from "@/app/onboarding/page";

export function StepTechnicians({
  data,
  updateData,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  updateData: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  function addTechnician() {
    updateData({
      technicians: [...data.technicians, { name: "", role: "" }],
    });
  }

  function updateTechnician(
    index: number,
    field: "name" | "role",
    value: string
  ) {
    const updated = [...data.technicians];
    updated[index] = { ...updated[index], [field]: value };
    updateData({ technicians: updated });
  }

  function removeTechnician(index: number) {
    updateData({
      technicians: data.technicians.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Add CSRs who will be making calls. You can always add more
          later.
        </p>
      </div>

      <div className="space-y-3">
        {data.technicians.map((tech, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <Label className="sr-only">Name</Label>
              <Input
                placeholder="CSR name"
                value={tech.name}
                onChange={(e) => updateTechnician(i, "name", e.target.value)}
              />
            </div>
            <div className="w-40 space-y-1">
              <Label className="sr-only">Role</Label>
              <Input
                placeholder="Role (optional)"
                value={tech.role}
                onChange={(e) => updateTechnician(i, "role", e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeTechnician(i)}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button variant="outline" onClick={addTechnician} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add CSR
        </Button>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onNext}>
            Skip for now
          </Button>
          <Button
            onClick={onNext}
            disabled={
              data.technicians.length > 0 &&
              data.technicians.some((t) => !t.name.trim())
            }
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
