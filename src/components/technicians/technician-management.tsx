"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Phone,
  TrendingUp,
  TrendingDown,
  Minus,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Technician } from "@/lib/supabase/types";
import { toast } from "sonner";

type TechnicianWithStats = Technician & {
  stats: { totalCalls: number; passRate: number | null };
};

interface Props {
  orgId: string;
  initialTechnicians: TechnicianWithStats[];
}

export function TechnicianManagement({ orgId, initialTechnicians }: Props) {
  const [technicians, setTechnicians] = useState(initialTechnicians);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<TechnicianWithStats | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function openCreate() {
    setEditingTech(null);
    setName("");
    setRole("");
    setSpecialties("");
    setDialogOpen(true);
  }

  function openEdit(tech: TechnicianWithStats) {
    setEditingTech(tech);
    setName(tech.name);
    setRole(tech.role || "");
    setSpecialties((tech.specialties || []).join(", "));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);

    const specialtiesArr = specialties
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingTech) {
        // Update
        const res = await fetch(`/api/technicians/${editingTech.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            role: role.trim() || null,
            specialties: specialtiesArr.length > 0 ? specialtiesArr : null,
          }),
        });
        if (!res.ok) throw new Error("Failed to update");
        const updated = await res.json();
        setTechnicians((prev) =>
          prev.map((t) =>
            t.id === editingTech.id ? { ...updated, stats: editingTech.stats } : t
          )
        );
        toast.success("CSR updated");
      } else {
        // Create
        const res = await fetch(`/api/organizations/${orgId}/technicians`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            role: role.trim() || null,
            specialties: specialtiesArr.length > 0 ? specialtiesArr : null,
          }),
        });
        if (!res.ok) throw new Error("Failed to create");
        const created = await res.json();
        setTechnicians((prev) => [
          ...prev,
          { ...created, stats: { totalCalls: 0, passRate: null } },
        ]);
        toast.success("CSR added");
      }
      setDialogOpen(false);
    } catch {
      toast.error(editingTech ? "Failed to update CSR" : "Failed to add CSR");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(techId: string) {
    setDeleting(techId);
    try {
      const res = await fetch(`/api/technicians/${techId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setTechnicians((prev) => prev.filter((t) => t.id !== techId));
      toast.success("CSR removed");
    } catch {
      toast.error("Failed to delete CSR");
    } finally {
      setDeleting(null);
    }
  }

  function getPassRateColor(rate: number | null): string {
    if (rate === null) return "text-muted-foreground";
    if (rate >= 0.8) return "text-green-600";
    if (rate >= 0.5) return "text-amber-600";
    return "text-red-600";
  }

  function getAvatarColor(rate: number | null): string {
    if (rate === null) return "bg-muted text-muted-foreground";
    if (rate >= 0.8) return "bg-green-100 text-green-700";
    if (rate >= 0.5) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  }

  if (technicians.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">CSRs</h1>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No CSRs yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Add CSRs to track their call performance, generate practice
              scenarios, and see individual improvement over time.
            </p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First CSR
                </Button>
              </DialogTrigger>
              <TechnicianDialog
                name={name}
                setName={setName}
                role={role}
                setRole={setRole}
                specialties={specialties}
                setSpecialties={setSpecialties}
                saving={saving}
                onSave={handleSave}
                isEdit={false}
              />
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">CSRs</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add CSR
            </Button>
          </DialogTrigger>
          <TechnicianDialog
            name={name}
            setName={setName}
            role={role}
            setRole={setRole}
            specialties={specialties}
            setSpecialties={setSpecialties}
            saving={saving}
            onSave={handleSave}
            isEdit={!!editingTech}
          />
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {technicians.map((tech) => {
          const initials = tech.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <Card key={tech.id} className="group relative">
              <CardContent className="p-5">
                {/* Edit/Delete actions */}
                <div className="absolute top-3 right-3 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.preventDefault();
                      openEdit(tech);
                    }}
                    aria-label={`Edit ${tech.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => e.preventDefault()}
                        disabled={deleting === tech.id}
                        aria-label={`Delete ${tech.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete CSR?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove {tech.name} and unlink all their
                          transcripts. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(tech.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <Link
                  href={`/org/${orgId}/technicians/${tech.id}`}
                  className="block"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColor(tech.stats.passRate)}`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">{tech.name}</h3>
                      {tech.role && (
                        <p className="text-sm text-muted-foreground truncate">
                          {tech.role}
                        </p>
                      )}
                      {tech.specialties && tech.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {tech.specialties.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-xs"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-6 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">
                        {tech.stats.totalCalls}
                      </span>
                      <span className="text-muted-foreground">calls</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm">
                      {tech.stats.passRate !== null ? (
                        <>
                          {tech.stats.passRate >= 0.5 ? (
                            <TrendingUp
                              className={`h-3.5 w-3.5 ${getPassRateColor(tech.stats.passRate)}`}
                            />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                          )}
                          <span
                            className={`font-medium ${getPassRateColor(tech.stats.passRate)}`}
                          >
                            {Math.round(tech.stats.passRate * 100)}%
                          </span>
                          <span className="text-muted-foreground">pass rate</span>
                        </>
                      ) : (
                        <>
                          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            No evals yet
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TechnicianDialog({
  name,
  setName,
  role,
  setRole,
  specialties,
  setSpecialties,
  saving,
  onSave,
  isEdit,
}: {
  name: string;
  setName: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  specialties: string;
  setSpecialties: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  isEdit: boolean;
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? "Edit CSR" : "Add CSR"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="tech-name">Name</Label>
          <Input
            id="tech-name"
            placeholder="e.g. John Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tech-role">Role (optional)</Label>
          <Input
            id="tech-role"
            placeholder="e.g. Senior Technician"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tech-specialties">Specialties (optional)</Label>
          <Input
            id="tech-specialties"
            placeholder="e.g. HVAC, Plumbing — comma separated"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
          />
        </div>
        <Button
          onClick={onSave}
          disabled={!name.trim() || saving}
          className="w-full"
        >
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Add CSR"}
        </Button>
      </div>
    </DialogContent>
  );
}
