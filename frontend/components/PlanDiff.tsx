"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02,
  XCircle01,
  AlertTriangle01,
  ChevronDown01,
  ChevronRight01,
  Refresh01,
  Zap01,
  Clock01,
  Book02,
} from "@hugeicons/core-free-icons";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";

interface Topic {
  name: string;
  difficulty: string;
  rationale: string;
}

interface DailyPlan {
  day: number;
  theme: string;
  topics: Topic[];
  estimated_hours: number;
}

interface StudyPlan {
  exam_name: string;
  total_days: number;
  overview: string;
  schedule: DailyPlan[];
  critical_topics: string[];
}

interface Verification {
  is_valid: boolean;
  missing_topics: string[];
  overloaded_days: number[];
  prerequisite_issues: string[];
  critique: string;
}

interface PlanVersion {
  version: number;
  plan: StudyPlan;
  verification: Verification | null;
  was_accepted: boolean;
}

interface PlanDiffProps {
  versions: PlanVersion[];
  selfCorrectionApplied: boolean;
  verificationSummary: {
    coverage_percent: number;
    overloaded_days_count: number;
    prerequisite_issues_count: number;
    is_valid: boolean;
    iterations_used: number;
  };
}

export function PlanDiff({
  versions,
  selfCorrectionApplied,
  verificationSummary,
}: PlanDiffProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<[number, number]>([
    0,
    versions.length > 1 ? versions.length - 1 : 0,
  ]);

  if (versions.length === 0) return null;

  const v1 = versions[selectedVersions[0]];
  const v2 = versions[selectedVersions[1]];

  // Calculate what changed between versions
  const getChanges = () => {
    if (!v1 || !v2 || v1.version === v2.version) return null;

    const changes: string[] = [];

    // Compare topics
    const v1Topics = new Set(
      v1.plan.schedule.flatMap((d) => d.topics.map((t) => t.name))
    );
    const v2Topics = new Set(
      v2.plan.schedule.flatMap((d) => d.topics.map((t) => t.name))
    );

    const added = [...v2Topics].filter((t) => !v1Topics.has(t));
    const removed = [...v1Topics].filter((t) => !v2Topics.has(t));

    if (added.length > 0) {
      changes.push(`Added: ${added.join(", ")}`);
    }
    if (removed.length > 0) {
      changes.push(`Removed: ${removed.join(", ")}`);
    }

    // Compare hours
    const v1Hours = v1.plan.schedule.reduce((sum, d) => sum + d.estimated_hours, 0);
    const v2Hours = v2.plan.schedule.reduce((sum, d) => sum + d.estimated_hours, 0);
    if (v1Hours !== v2Hours) {
      changes.push(
        `Hours: ${v1Hours}h → ${v2Hours}h (${v2Hours > v1Hours ? "+" : ""}${v2Hours - v1Hours}h)`
      );
    }

    return changes;
  };

  const changes = getChanges();

  return (
    <Card variant="soft" className="overflow-hidden">
      {/* Header - always visible */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer transition-premium"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              selfCorrectionApplied
                ? "bg-chart-3/20 text-chart-3"
                : "bg-chart-2/20 text-chart-2"
            }`}
          >
            {selfCorrectionApplied ? (
              <HugeiconsIcon icon={Refresh01} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
            ) : (
              <HugeiconsIcon icon={CheckmarkCircle02} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Self-Correction Log
              {selfCorrectionApplied && (
                <span className="text-xs bg-chart-3/20 text-chart-3 px-2 py-0.5 rounded-full">
                  {verificationSummary.iterations_used} iterations
                </span>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selfCorrectionApplied
                ? "AI identified and fixed issues in the plan"
                : "Plan verified on first attempt"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Verification metrics */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div
              className={`flex items-center gap-1 ${
                verificationSummary.coverage_percent >= 90
                  ? "text-chart-2"
                  : verificationSummary.coverage_percent >= 70
                  ? "text-chart-3"
                  : "text-destructive"
              }`}
            >
              <HugeiconsIcon icon={Book02} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" />
              {verificationSummary.coverage_percent}% coverage
            </div>
            <div
              className={`flex items-center gap-1 ${
                verificationSummary.overloaded_days_count === 0
                  ? "text-chart-2"
                  : "text-chart-3"
              }`}
            >
              <HugeiconsIcon icon={Clock01} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" />
              {verificationSummary.overloaded_days_count === 0
                ? "Balanced"
                : `${verificationSummary.overloaded_days_count} heavy day(s)`}
            </div>
          </div>

          {expanded ? (
            <HugeiconsIcon icon={ChevronDown01} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-muted-foreground" />
          ) : (
            <HugeiconsIcon icon={ChevronRight01} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4 animate-fade-in">
          {/* Version selector */}
          {versions.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Compare:</span>
              {versions.map((v, i) => (
                <Button
                  key={v.version}
                  variant={
                    selectedVersions.includes(i) ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => {
                    if (selectedVersions[0] === i) {
                      setSelectedVersions([selectedVersions[1], i]);
                    } else if (selectedVersions[1] === i) {
                      setSelectedVersions([i, selectedVersions[0]]);
                    } else {
                      setSelectedVersions([selectedVersions[0], i]);
                    }
                  }}
                  className="gap-1"
                >
                  v{v.version}
                  {v.was_accepted && (
                    <HugeiconsIcon icon={CheckmarkCircle02} size={12} color="currentColor" strokeWidth={1.5} className="w-3 h-3 text-chart-2" />
                  )}
                </Button>
              ))}
            </div>
          )}

          {/* Iteration timeline */}
          <div className="space-y-3">
            {versions.map((v, i) => (
              <div
                key={v.version}
                className={`p-3 rounded-lg border ${
                  v.was_accepted
                    ? "border-chart-2 bg-chart-2/5"
                    : v.verification?.is_valid === false
                    ? "border-chart-3 bg-chart-3/5"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">
                      v{v.version}
                    </span>
                    {v.was_accepted && (
                      <span className="text-xs bg-chart-2/20 text-chart-2 px-2 py-0.5 rounded-full">
                        Accepted
                      </span>
                    )}
                  </div>
                  {v.verification && (
                    <div className="flex items-center gap-2 text-xs">
                      {v.verification.is_valid ? (
                        <HugeiconsIcon icon={CheckmarkCircle02} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4 text-chart-2" />
                      ) : (
                        <HugeiconsIcon icon={XCircle01} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4 text-destructive" />
                      )}
                      <span
                        className={
                          v.verification.is_valid
                            ? "text-chart-2"
                            : "text-destructive"
                        }
                      >
                        {v.verification.is_valid ? "Verified" : "Issues Found"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Verification details */}
                {v.verification && !v.verification.is_valid && (
                  <div className="mt-2 space-y-1 text-sm">
                    {v.verification.missing_topics.length > 0 && (
                      <p className="text-muted-foreground flex items-start gap-2">
                        <HugeiconsIcon icon={AlertTriangle01} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
                        <span>
                          Missing: {v.verification.missing_topics.join(", ")}
                        </span>
                      </p>
                    )}
                    {v.verification.overloaded_days.length > 0 && (
                      <p className="text-muted-foreground flex items-start gap-2">
                        <HugeiconsIcon icon={Clock01} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
                        <span>
                          Overloaded days: {v.verification.overloaded_days.join(", ")}
                        </span>
                      </p>
                    )}
                    {v.verification.prerequisite_issues.length > 0 && (
                      <p className="text-muted-foreground flex items-start gap-2">
                        <HugeiconsIcon icon={Zap01} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
                        <span>
                          Prerequisite issues:{" "}
                          {v.verification.prerequisite_issues.join("; ")}
                        </span>
                      </p>
                    )}
                    <p className="text-foreground/80 mt-2 italic">
                      &quot;{v.verification.critique}&quot;
                    </p>
                  </div>
                )}

                {/* Show what was fixed in next version */}
                {i < versions.length - 1 && v.verification && !v.verification.is_valid && (
                  <div className="mt-3 pt-2 border-t border-border">
                    <p className="text-xs text-chart-2 flex items-center gap-1">
                      <HugeiconsIcon icon={Refresh01} size={12} color="currentColor" strokeWidth={1.5} className="w-3 h-3" />
                      AI self-corrected → v{v.version + 1}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Changes summary */}
          {changes && changes.length > 0 && (
            <div className="bg-secondary/50 p-3 rounded-lg backdrop-blur-lg">
              <h4 className="text-sm font-medium text-foreground mb-2">
                What Changed (v{v1?.version} → v{v2?.version})
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
