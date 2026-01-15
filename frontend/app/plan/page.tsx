"use client";

import { useState } from "react";
import { Calendar, Clock, BookOpen, ChevronRight, Play } from "lucide-react";
import Link from "next/link";

// Mock data - in production this comes from API
const MOCK_PLAN = {
  exam_name: "NEET 2025",
  total_days: 7,
  schedule: [
    {
      day_number: 1,
      focus_topics: ["Cell Biology", "Biomolecules"],
      estimated_hours: 4,
      rationale: "Foundation concepts - essential for everything else",
      color: "from-blue-500 to-cyan-500",
    },
    {
      day_number: 2,
      focus_topics: ["Genetics", "Molecular Biology"],
      estimated_hours: 5,
      rationale: "High-yield topics with strong exam weightage",
      color: "from-purple-500 to-pink-500",
    },
    {
      day_number: 3,
      focus_topics: ["Human Physiology - Digestion", "Respiration"],
      estimated_hours: 4.5,
      rationale: "Interconnected systems - better learned together",
      color: "from-green-500 to-emerald-500",
    },
    {
      day_number: 4,
      focus_topics: ["Circulation", "Excretion"],
      estimated_hours: 4,
      rationale: "Completes the physiology module",
      color: "from-orange-500 to-yellow-500",
    },
    {
      day_number: 5,
      focus_topics: ["Plant Physiology", "Photosynthesis"],
      estimated_hours: 4.5,
      rationale: "Distinct from human systems - fresh perspective needed",
      color: "from-lime-500 to-green-500",
    },
    {
      day_number: 6,
      focus_topics: ["Ecology", "Environment"],
      estimated_hours: 3.5,
      rationale: "Conceptual and less calculation-heavy - good for day 6",
      color: "from-teal-500 to-cyan-500",
    },
    {
      day_number: 7,
      focus_topics: ["Revision & Practice Tests"],
      estimated_hours: 6,
      rationale: "Consolidation day - reinforce weak areas",
      color: "from-red-500 to-pink-500",
    },
  ],
  critical_topics: ["Genetics", "Human Physiology", "Ecology"],
};

export default function PlanPage() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Calendar className="w-8 h-8 text-purple-400" />
              Your Study Plan
            </h1>
            <p className="text-slate-400 mt-1">
              {MOCK_PLAN.exam_name} • {MOCK_PLAN.total_days} days
            </p>
          </div>
          <Link
            href="/learn/cell-biology"
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
          >
            <Play className="w-5 h-5" />
            Start Learning
          </Link>
        </div>

        {/* Critical Topics Alert */}
        <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-4 mb-8">
          <p className="text-amber-200 font-medium">
            🎯 Focus Areas: {MOCK_PLAN.critical_topics.join(", ")}
          </p>
        </div>

        {/* Gantt-style Timeline */}
        <div className="space-y-4">
          {MOCK_PLAN.schedule.map((day) => (
            <div
              key={day.day_number}
              onClick={() =>
                setSelectedDay(
                  selectedDay === day.day_number ? null : day.day_number
                )
              }
              className={`relative bg-slate-800/50 backdrop-blur-lg rounded-xl border transition-all cursor-pointer ${
                selectedDay === day.day_number
                  ? "border-purple-500 ring-2 ring-purple-500/50"
                  : "border-slate-700 hover:border-slate-600"
              }`}
            >
              <div className="p-5 flex items-center gap-6">
                {/* Day Number */}
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${day.color} flex items-center justify-center flex-shrink-0`}
                >
                  <span className="text-white font-bold text-lg">
                    D{day.day_number}
                  </span>
                </div>

                {/* Topics */}
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-1">
                    {day.focus_topics.map((topic, i) => (
                      <span
                        key={i}
                        className="bg-slate-700 text-slate-200 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                  {selectedDay === day.day_number && (
                    <p className="text-slate-400 text-sm mt-2 animate-in fade-in">
                      💡 {day.rationale}
                    </p>
                  )}
                </div>

                {/* Hours */}
                <div className="flex items-center gap-2 text-slate-300 flex-shrink-0">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">{day.estimated_hours}h</span>
                </div>

                {/* Progress Bar (Visual width based on hours) */}
                <div className="w-32 flex-shrink-0">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${day.color} transition-all`}
                      style={{ width: `${(day.estimated_hours / 6) * 100}%` }}
                    />
                  </div>
                </div>

                <ChevronRight
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    selectedDay === day.day_number ? "rotate-90" : ""
                  }`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center justify-center gap-8 text-slate-400 text-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>Click a day to see rationale</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Hours indicate estimated study time</span>
          </div>
        </div>
      </div>
    </div>
  );
}
