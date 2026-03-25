"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
import { ALL_INTENTS } from "@/lib/call-taxonomy";
import type { EvalCriteria, FewShotExample } from "@/lib/supabase/types";


type CriterionWithExamples = EvalCriteria & {
  few_shot_examples: FewShotExample[];
};

interface Props {
  orgId: string;
  initialCriteria: CriterionWithExamples[];
}

export function CriteriaManager({ orgId, initialCriteria }: Props) {
  const [criteria, setCriteria] = useState<CriterionWithExamples[]>(initialCriteria);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogIntent, setAddDialogIntent] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Group criteria by call_intents (array — a criterion can appear under multiple intents)
  const grouped = useMemo(() => {
    const byIntent = new Map<string, CriterionWithExamples[]>();
    const unassigned: CriterionWithExamples[] = [];
    for (const c of criteria) {
      // Prefer the new call_intents array; fall back to legacy call_intent string
      const intents: string[] =
        c.call_intents?.length > 0
          ? c.call_intents
          : c.call_intent
          ? [c.call_intent]
          : [];
      if (intents.length === 0) {
        unassigned.push(c);
      } else {
        for (const intent of intents) {
          if (!byIntent.has(intent)) byIntent.set(intent, []);
          byIntent.get(intent)!.push(c);
        }
      }
    }
    const ordered: { intent: string; items: CriterionWithExamples[] }[] = ALL_INTENTS
      .filter((i) => byIntent.has(i))
      .map((i) => ({ intent: i as string, items: byIntent.get(i)! }));
    for (const [intent, items] of byIntent.entries()) {
      if (!ALL_INTENTS.includes(intent as never)) {
        ordered.push({ intent, items });
      }
    }
    return { ordered, unassigned };
  }, [criteria]);

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const saveCriterion = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      setSaving((prev) => ({ ...prev, [id]: true }));
      try {
        const response = await fetch(`/api/eval-criteria/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error("Failed to save");
      } catch {
        toast.error("Failed to save changes");
      } finally {
        setSaving((prev) => ({ ...prev, [id]: false }));
      }
    },
    []
  );

  const debouncedSave = useCallback(
    (id: string, updates: Record<string, unknown>) => {
      const key = `${id}-${Object.keys(updates).join(",")}`;
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }
      debounceTimers.current[key] = setTimeout(() => {
        saveCriterion(id, updates);
        delete debounceTimers.current[key];
      }, 500);
    },
    [saveCriterion]
  );

  const updateLocalCriterion = (id: string, updates: Partial<CriterionWithExamples>) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleFieldChange = (
    id: string,
    field: string,
    value: string | boolean | number | string[]
  ) => {
    updateLocalCriterion(id, { [field]: value } as Partial<CriterionWithExamples>);
    // Instant save for toggles/selects/arrays, debounced for text
    if (typeof value === "boolean" || Array.isArray(value) || field === "status" || field === "category") {
      saveCriterion(id, { [field]: value });
    } else {
      debouncedSave(id, { [field]: value });
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const oldIndex = criteria.findIndex((c) => c.id === draggedId);
    const newIndex = criteria.findIndex((c) => c.id === targetId);

    const reordered = [...criteria];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    setCriteria(reordered);
    setDraggedId(null);
    setDragOverId(null);

    // Persist reorder
    try {
      const response = await fetch("/api/eval-criteria/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
      });
      if (!response.ok) throw new Error("Failed to reorder");
    } catch {
      toast.error("Failed to save new order");
      setCriteria(initialCriteria);
    }
  };

  const handleDelete = async (id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
    try {
      const response = await fetch(`/api/eval-criteria/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Criterion deleted");
    } catch {
      toast.error("Failed to delete criterion");
      setCriteria(initialCriteria);
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  function renderCriterionCard(criterion: CriterionWithExamples) {
    return (
      <CriterionCard
        key={criterion.id}
        criterion={criterion}
        isExpanded={expandedId === criterion.id}
        isDragging={draggedId === criterion.id}
        isDragOver={dragOverId === criterion.id}
        isSaving={saving[criterion.id] || false}
        onToggleExpand={() => handleToggleExpand(criterion.id)}
        onFieldChange={(field, value) => handleFieldChange(criterion.id, field, value)}
        onDelete={() => handleDelete(criterion.id)}
        onDragStart={() => handleDragStart(criterion.id)}
        onDragOver={(e) => handleDragOver(e, criterion.id)}
        onDrop={() => handleDrop(criterion.id)}
        onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
        onExamplesChange={(examples) => updateLocalCriterion(criterion.id, { few_shot_examples: examples })}
      />
    );
  }

  function openAddForIntent(intent: string | null) {
    setAddDialogIntent(intent);
    setAddDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Eval Criteria</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define what your calls are evaluated against, grouped by call intent.
          </p>
        </div>
        <AddCriterionDialog
          orgId={orgId}
          open={addDialogOpen}
          onOpenChange={(open) => { setAddDialogOpen(open); if (!open) setAddDialogIntent(null); }}
          sortOrder={criteria.length}
          defaultIntent={addDialogIntent}
          onCreated={(newCriterion) => {
            setCriteria((prev) => [...prev, { ...newCriterion, few_shot_examples: [] }]);
            setAddDialogOpen(false);
            setAddDialogIntent(null);
          }}
        />
      </div>

      {criteria.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-medium mb-2">No eval criteria yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Add criteria to define how your calls will be evaluated by AI.
            </p>
            <Button onClick={() => openAddForIntent(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Criterion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Grouped by intent */}
          {grouped.ordered.map(({ intent, items }) => (
            <div key={intent}>
              <div className="flex items-center mb-2">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-violet-400" />
                  {intent}
                  <span className="text-xs font-normal text-gray-400">({items.length})</span>
                </h2>
              </div>
              <div className="space-y-2">
                {items.map(renderCriterionCard)}
              </div>
            </div>
          ))}

          {/* Unassigned */}
          {grouped.unassigned.length > 0 && (
            <div>
              <div className="flex items-center mb-2">
                <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
                  Unassigned
                  <span className="text-xs font-normal">({grouped.unassigned.length})</span>
                </h2>
              </div>
              <div className="space-y-2">
                {grouped.unassigned.map(renderCriterionCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Criterion Card
// ============================================================

function CriterionCard({
  criterion,
  isExpanded,
  isDragging,
  isDragOver,
  isSaving,
  onToggleExpand,
  onFieldChange,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onExamplesChange,
}: {
  criterion: CriterionWithExamples;
  isExpanded: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isSaving: boolean;
  onToggleExpand: () => void;
  onFieldChange: (field: string, value: string | boolean | number | string[]) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onExamplesChange: (examples: FewShotExample[]) => void;
}) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`transition-all ${isDragging ? "opacity-50" : ""} ${
        isDragOver ? "border-primary border-2" : ""
      }`}
    >
      <CardContent className="p-0">
        {/* Header row */}
        <div className="flex items-center gap-3 p-4">
          <div
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5" />
          </div>

          <button
            onClick={onToggleExpand}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="font-medium truncate">{criterion.name}</span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant={criterion.status === "published" ? "default" : "outline"}
              className="text-xs"
            >
              {criterion.status === "published" ? "Published" : "Draft"}
            </Badge>
            {criterion.few_shot_examples.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1 hidden sm:inline-flex">
                <BookOpen className="h-3 w-3" />
                {criterion.few_shot_examples.length}
              </Badge>
            )}
            {isSaving && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
            <Switch
              checked={criterion.is_active}
              onCheckedChange={(checked) => onFieldChange("is_active", checked)}
              aria-label="Toggle active"
            />
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t px-4 pb-4 pt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`name-${criterion.id}`}>Name</Label>
                <Input
                  id={`name-${criterion.id}`}
                  value={criterion.name}
                  onChange={(e) => onFieldChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Call Intent</Label>
                <IntentMultiSelect
                  selected={criterion.call_intents?.length > 0 ? criterion.call_intents : criterion.call_intent ? [criterion.call_intent] : []}
                  onChange={(intents) => onFieldChange("call_intents", intents)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`desc-${criterion.id}`}>
                Description — what should the AI check for?
              </Label>
              <Textarea
                id={`desc-${criterion.id}`}
                value={criterion.description}
                onChange={(e) => onFieldChange("description", e.target.value)}
                rows={3}
                className="resize-y"
              />
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Label htmlFor={`status-${criterion.id}`} className="text-sm">
                  Status
                </Label>
                <Select
                  value={criterion.status}
                  onValueChange={(val) => onFieldChange("status", val)}
                >
                  <SelectTrigger id={`status-${criterion.id}`} className="w-[130px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id={`notify-${criterion.id}`}
                  checked={criterion.notify_on_fail ?? false}
                  onCheckedChange={(checked) => onFieldChange("notify_on_fail", checked)}
                />
                <Label htmlFor={`notify-${criterion.id}`} className="text-sm cursor-pointer">
                  Notify when failed
                </Label>
              </div>
            </div>

            {/* Few-shot examples */}
            <FewShotExamplesSection
              criterionId={criterion.id}
              examples={criterion.few_shot_examples}
              onExamplesChange={onExamplesChange}
            />

            <div className="flex justify-end pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete criterion?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &ldquo;{criterion.name}&rdquo; and
                      all associated few-shot examples. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Intent Multi-Select
// ============================================================

function IntentMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (intents: string[]) => void;
}) {
  const toggle = (intent: string) => {
    if (selected.includes(intent)) {
      onChange(selected.filter((i) => i !== intent));
    } else {
      onChange([...selected, intent]);
    }
  };

  const label =
    selected.length === 0
      ? "No intent"
      : selected.length === 1
      ? selected[0]
      : `${selected.length} intents selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span className={selected.length === 0 ? "text-muted-foreground" : "text-foreground"}>
            {label}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="max-h-64 overflow-y-auto p-1">
          {selected.length > 0 && (
            <button
              type="button"
              className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onChange([])}
            >
              Clear all
            </button>
          )}
          {ALL_INTENTS.map((intent) => (
            <label
              key={intent}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-accent"
            >
              <Checkbox
                checked={selected.includes(intent)}
                onCheckedChange={() => toggle(intent)}
                id={`intent-check-${intent}`}
              />
              <span>{intent}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================
// Few-Shot Examples Section
// ============================================================

function FewShotExamplesSection({
  criterionId,
  examples,
  onExamplesChange,
}: {
  criterionId: string;
  examples: FewShotExample[];
  onExamplesChange: (examples: FewShotExample[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newExample, setNewExample] = useState({
    example_type: "pass" as "pass" | "fail",
    transcript_snippet: "",
    explanation: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!newExample.transcript_snippet.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/eval-criteria/${criterionId}/examples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExample),
      });
      if (!response.ok) throw new Error("Failed to add example");
      const created = await response.json();
      onExamplesChange([...examples, created]);
      setNewExample({ example_type: "pass", transcript_snippet: "", explanation: "" });
      setAdding(false);
      toast.success("Example added");
    } catch {
      toast.error("Failed to add example");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (exampleId: string) => {
    const previousExamples = examples;
    onExamplesChange(examples.filter((e) => e.id !== exampleId));
    try {
      const response = await fetch(
        `/api/eval-criteria/${criterionId}/examples/${exampleId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete");
    } catch {
      toast.error("Failed to delete example");
      onExamplesChange(previousExamples);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Few-Shot Examples</Label>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Example
          </Button>
        )}
      </div>

      {examples.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">
          Add examples to improve AI accuracy. Examples show the AI what passing and
          failing looks like for this criterion.
        </p>
      )}

      {examples.map((example) => (
        <div
          key={example.id}
          className="rounded-md border p-3 space-y-2 text-sm"
        >
          <div className="flex items-center justify-between">
            <Badge
              variant={example.example_type === "pass" ? "default" : "destructive"}
              className="text-xs gap-1"
            >
              {example.example_type === "pass" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {example.example_type === "pass" ? "Pass" : "Fail"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(example.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-muted-foreground italic text-xs leading-relaxed">
            &ldquo;{example.transcript_snippet}&rdquo;
          </p>
          {example.explanation && (
            <p className="text-xs text-muted-foreground">
              {example.explanation}
            </p>
          )}
        </div>
      ))}

      {adding && (
        <div className="rounded-md border p-3 space-y-3">
          <div className="flex gap-2">
            <Button
              variant={newExample.example_type === "pass" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setNewExample((prev) => ({ ...prev, example_type: "pass" }))
              }
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Pass
            </Button>
            <Button
              variant={newExample.example_type === "fail" ? "destructive" : "outline"}
              size="sm"
              onClick={() =>
                setNewExample((prev) => ({ ...prev, example_type: "fail" }))
              }
            >
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Fail
            </Button>
          </div>
          <Textarea
            placeholder="Paste a transcript snippet..."
            value={newExample.transcript_snippet}
            onChange={(e) =>
              setNewExample((prev) => ({
                ...prev,
                transcript_snippet: e.target.value,
              }))
            }
            rows={3}
            className="text-sm"
          />
          <Textarea
            placeholder="Explanation (optional) — why is this a pass/fail?"
            value={newExample.explanation}
            onChange={(e) =>
              setNewExample((prev) => ({ ...prev, explanation: e.target.value }))
            }
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setNewExample({
                  example_type: "pass",
                  transcript_snippet: "",
                  explanation: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newExample.transcript_snippet.trim() || submitting}
            >
              {submitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Add Criterion Dialog
// ============================================================

function AddCriterionDialog({
  orgId,
  open,
  onOpenChange,
  sortOrder,
  defaultIntent,
  onCreated,
}: {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sortOrder: number;
  defaultIntent: string | null;
  onCreated: (criterion: EvalCriteria) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [callIntents, setCallIntents] = useState<string[]>(defaultIntent ? [defaultIntent] : []);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [submitting, setSubmitting] = useState(false);

  // Sync defaultIntent when dialog opens for a specific group
  const prevOpen = useRef(false);
  if (open && !prevOpen.current) {
    if (defaultIntent !== null) {
      setCallIntents(defaultIntent ? [defaultIntent] : []);
    }
  }
  prevOpen.current = open;

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/eval-criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: orgId,
          name: name.trim(),
          description: description.trim(),
          call_intents: callIntents,
          call_intent: callIntents[0] ?? null,
          sort_order: sortOrder,
          status,
        }),
      });
      if (!response.ok) throw new Error("Failed to create");
      const created = await response.json();
      onCreated(created);
      toast.success("Criterion created");
      // Reset form
      setName("");
      setDescription("");
      setCallIntents([]);
      setStatus("draft");
    } catch {
      toast.error("Failed to create criterion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Criterion
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Eval Criterion</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-name">Name</Label>
            <Input
              id="new-name"
              placeholder="e.g., Proper Introduction"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-description">
              Description — what should the AI check for?
            </Label>
            <Textarea
              id="new-description"
              placeholder="e.g., Did the technician introduce themselves by name and company?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Call Intent</Label>
              <IntentMultiSelect selected={callIntents} onChange={setCallIntents} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "published")}>
                <SelectTrigger id="new-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !description.trim() || submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
