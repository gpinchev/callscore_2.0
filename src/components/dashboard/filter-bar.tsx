"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { DashboardFilters } from "@/lib/dashboard-types";

interface Props {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  technicians: { id: string; name: string }[];
  criteria: { id: string; name: string }[];
}

const DATE_PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
] as const;

export function FilterBar({
  filters,
  onFiltersChange,
  technicians,
  criteria,
}: Props) {
  const [techOpen, setTechOpen] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const startDate = new Date(filters.startDate);
  const endDate = new Date(filters.endDate);

  const setDatePreset = (days: number) => {
    const now = new Date();
    onFiltersChange({
      ...filters,
      startDate: subDays(now, days).toISOString(),
      endDate: now.toISOString(),
    });
    setDateOpen(false);
  };

  const toggleTechnician = (id: string) => {
    const current = filters.technicianIds;
    const next = current.includes(id)
      ? current.filter((t) => t !== id)
      : [...current, id];
    onFiltersChange({ ...filters, technicianIds: next });
  };

  const toggleCriteria = (id: string) => {
    const current = filters.criteriaIds;
    const next = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    onFiltersChange({ ...filters, criteriaIds: next });
  };

  const hasActiveFilters =
    filters.technicianIds.length > 0 ||
    filters.criteriaIds.length > 0 ||
    !filters.excludeMock;

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      technicianIds: [],
      criteriaIds: [],
      excludeMock: true,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date Range */}
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-3.5 w-3.5" />
            {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="mb-3 flex gap-1">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.days}
                variant="outline"
                size="sm"
                onClick={() => setDatePreset(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={{
              from: startDate,
              to: endDate,
            }}
            onSelect={(range) => {
              if (range?.from) {
                onFiltersChange({
                  ...filters,
                  startDate: range.from.toISOString(),
                  endDate: (range.to || range.from).toISOString(),
                });
              }
            }}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>

      {/* Technician Multi-Select */}
      <Popover open={techOpen} onOpenChange={setTechOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-3.5 w-3.5" />
            CSRs
            {filters.technicianIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {filters.technicianIds.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {technicians.map((tech) => (
              <label
                key={tech.id}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={filters.technicianIds.includes(tech.id)}
                  onCheckedChange={() => toggleTechnician(tech.id)}
                />
                {tech.name}
              </label>
            ))}
            {technicians.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                No CSRs
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Criteria Multi-Select */}
      <Popover open={criteriaOpen} onOpenChange={setCriteriaOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-3.5 w-3.5" />
            Criteria
            {filters.criteriaIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {filters.criteriaIds.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {criteria.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={filters.criteriaIds.includes(c.id)}
                  onCheckedChange={() => toggleCriteria(c.id)}
                />
                <span className="truncate">{c.name}</span>
              </label>
            ))}
            {criteria.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                No criteria
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Mock Toggle */}
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Switch
          checked={!filters.excludeMock}
          onCheckedChange={(checked) =>
            onFiltersChange({ ...filters, excludeMock: !checked })
          }
        />
        Include mock
      </label>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
