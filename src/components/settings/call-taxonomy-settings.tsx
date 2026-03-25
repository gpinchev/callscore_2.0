"use client";

import { useState } from "react";
import { ChevronRight, Plus, X, Loader2, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CALL_TAXONOMY } from "@/lib/call-taxonomy";
import type { Organization } from "@/lib/supabase/types";

export type TaxonomyEntry = {
  callType: string;
  intents: string[];
  outcomes: string[];
};

function buildDefault(): TaxonomyEntry[] {
  return Object.entries(CALL_TAXONOMY).map(([callType, { intents, outcomes }]) => ({
    callType,
    intents: [...intents],
    outcomes: [...outcomes],
  }));
}

function parseTaxonomy(raw: Organization["call_taxonomy"]): TaxonomyEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) return buildDefault();
  return raw as TaxonomyEntry[];
}

interface Props {
  org: Organization;
}

export function CallTaxonomySettings({ org }: Props) {
  const [entries, setEntries] = useState<TaxonomyEntry[]>(() => parseTaxonomy(org.call_taxonomy));
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // ── per-entry helpers ────────────────────────────────────────
  function updateCallType(idx: number, value: string) {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, callType: value } : e));
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
    setExpanded((prev) => (prev === idx ? null : prev !== null && prev > idx ? prev - 1 : prev));
  }

  function addEntry() {
    setEntries((prev) => [...prev, { callType: "", intents: [], outcomes: [] }]);
    setExpanded(entries.length);
  }

  function addItem(entryIdx: number, field: "intents" | "outcomes", value: string) {
    if (!value.trim()) return;
    setEntries((prev) =>
      prev.map((e, i) =>
        i === entryIdx ? { ...e, [field]: [...e[field], value.trim()] } : e
      )
    );
  }

  function removeItem(entryIdx: number, field: "intents" | "outcomes", itemIdx: number) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === entryIdx
          ? { ...e, [field]: e[field].filter((_, j) => j !== itemIdx) }
          : e
      )
    );
  }

  // ── save ─────────────────────────────────────────────────────
  async function handleSave() {
    const invalid = entries.find((e) => !e.callType.trim());
    if (invalid !== undefined) {
      toast.error("All call types must have a name.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_taxonomy: entries }),
      });
      if (!res.ok) throw new Error();
      toast.success("Taxonomy saved");
    } catch {
      toast.error("Failed to save taxonomy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          Call Taxonomy
        </CardTitle>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</> : "Save Changes"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-1 p-0 pb-4">
        {entries.map((entry, idx) => (
          <CallTypeRow
            key={idx}
            entry={entry}
            isExpanded={expanded === idx}
            onToggle={() => setExpanded(expanded === idx ? null : idx)}
            onCallTypeChange={(v) => updateCallType(idx, v)}
            onRemoveEntry={() => removeEntry(idx)}
            onAddItem={(field, value) => addItem(idx, field, value)}
            onRemoveItem={(field, itemIdx) => removeItem(idx, field, itemIdx)}
          />
        ))}

        <div className="px-4 pt-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={addEntry}>
            <Plus className="h-3.5 w-3.5" />
            Add Call Type
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── sub-component ─────────────────────────────────────────────
interface RowProps {
  entry: TaxonomyEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onCallTypeChange: (v: string) => void;
  onRemoveEntry: () => void;
  onAddItem: (field: "intents" | "outcomes", value: string) => void;
  onRemoveItem: (field: "intents" | "outcomes", itemIdx: number) => void;
}

function CallTypeRow({
  entry,
  isExpanded,
  onToggle,
  onCallTypeChange,
  onRemoveEntry,
  onAddItem,
  onRemoveItem,
}: RowProps) {
  return (
    <div className="border-b last:border-b-0">
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 text-left group"
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 text-gray-400 transition-transform shrink-0",
              isExpanded && "rotate-90"
            )}
          />
          {isExpanded ? (
            <Input
              value={entry.callType}
              onChange={(e) => onCallTypeChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="h-7 text-sm font-medium max-w-xs"
              placeholder="Call type name"
            />
          ) : (
            <span className={cn("text-sm font-medium", !entry.callType && "text-gray-400 italic")}>
              {entry.callType || "Unnamed call type"}
            </span>
          )}
        </button>
        <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
          <span>{entry.intents.length} intents</span>
          <span>{entry.outcomes.length} outcomes</span>
        </div>
        <button
          type="button"
          onClick={onRemoveEntry}
          className="p-1 rounded hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors"
          aria-label="Remove call type"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="grid grid-cols-2 gap-4 px-10 pb-4">
          <ItemList
            label="Intents"
            items={entry.intents}
            onAdd={(v) => onAddItem("intents", v)}
            onRemove={(i) => onRemoveItem("intents", i)}
            placeholder="e.g. Emergency Repair"
          />
          <ItemList
            label="Outcomes"
            items={entry.outcomes}
            onAdd={(v) => onAddItem("outcomes", v)}
            onRemove={(i) => onRemoveItem("outcomes", i)}
            placeholder="e.g. Appointment Booked"
          />
        </div>
      )}
    </div>
  );
}

// ── item list ────────────────────────────────────────────────
interface ItemListProps {
  label: string;
  items: string[];
  placeholder: string;
  onAdd: (value: string) => void;
  onRemove: (idx: number) => void;
}

function ItemList({ label, items, placeholder, onAdd, onRemove }: ItemListProps) {
  const [draft, setDraft] = useState("");

  function commit() {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5 group">
            <span className="flex-1 text-sm text-gray-700 truncate">{item}</span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 hover:text-red-600 text-gray-400 transition-all"
              aria-label={`Remove ${item}`}
            >
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
          placeholder={placeholder}
          className="h-7 text-xs"
        />
        <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={commit}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
