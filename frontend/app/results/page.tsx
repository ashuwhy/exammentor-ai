"use client";

import {
  BarChart3,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

// Mock analytics data
const MOCK_STATS = {
  overall_score: 78,
  topics_mastered: 4,
  topics_total: 7,
  study_hours: 12.5,
  quizzes_taken: 6,
  streak_days: 3,
};

const TOPIC_PERFORMANCE = [
  { name: "Cell Biology", score: 92, status: "mastered" },
  { name: "Genetics", score: 85, status: "mastered" },
  { name: "Photosynthesis", score: 78, status: "mastered" },
  { name: "Human Physiology", score: 70, status: "learning" },
  { name: "Ecology", score: 65, status: "learning" },
  { name: "Plant Physiology", score: 45, status: "weak" },
  { name: "Evolution", score: 0, status: "pending" },
];

const MISCONCEPTIONS = [
  {
    topic: "Photosynthesis",
    issue: "Confused dark reaction with night-time process",
    advice: "Review the Calvin Cycle section",
  },
  {
    topic: "Genetics",
    issue: "Mixing up genotype and phenotype definitions",
    advice: "Practice Punnett square problems",
  },
];

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-purple-400" />
              Your Progress
            </h1>
            <p className="text-slate-400 mt-1">
              NEET 2025 • Day 3 of 7
            </p>
          </div>
          <Link
            href="/plan"
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
          >
            Continue Learning
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-5 border border-slate-700">
            <TrendingUp className="w-6 h-6 text-green-400 mb-2" />
            <p className="text-3xl font-bold text-white">
              {MOCK_STATS.overall_score}%
            </p>
            <p className="text-slate-400 text-sm">Overall Score</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-5 border border-slate-700">
            <Target className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-3xl font-bold text-white">
              {MOCK_STATS.topics_mastered}/{MOCK_STATS.topics_total}
            </p>
            <p className="text-slate-400 text-sm">Topics Mastered</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-5 border border-slate-700">
            <BookOpen className="w-6 h-6 text-blue-400 mb-2" />
            <p className="text-3xl font-bold text-white">
              {MOCK_STATS.study_hours}h
            </p>
            <p className="text-slate-400 text-sm">Study Time</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-5 border border-slate-700">
            <CheckCircle className="w-6 h-6 text-amber-400 mb-2" />
            <p className="text-3xl font-bold text-white">
              {MOCK_STATS.streak_days} 🔥
            </p>
            <p className="text-slate-400 text-sm">Day Streak</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Topic Performance */}
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">
              Topic Performance
            </h2>
            <div className="space-y-4">
              {TOPIC_PERFORMANCE.map((topic) => (
                <div key={topic.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300 text-sm">{topic.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        topic.status === "mastered"
                          ? "bg-green-500/20 text-green-400"
                          : topic.status === "learning"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : topic.status === "weak"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-slate-500/20 text-slate-400"
                      }`}
                    >
                      {topic.status}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        topic.score >= 80
                          ? "bg-green-500"
                          : topic.score >= 60
                          ? "bg-yellow-500"
                          : topic.score > 0
                          ? "bg-red-500"
                          : "bg-slate-600"
                      }`}
                      style={{ width: `${topic.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Misconceptions */}
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Areas to Improve
            </h2>
            <div className="space-y-4">
              {MISCONCEPTIONS.map((m, i) => (
                <div
                  key={i}
                  className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
                >
                  <p className="text-amber-200 font-medium mb-1">{m.topic}</p>
                  <p className="text-amber-200/70 text-sm mb-2">{m.issue}</p>
                  <p className="text-purple-300 text-sm">💡 {m.advice}</p>
                </div>
              ))}
              {MISCONCEPTIONS.length === 0 && (
                <p className="text-slate-400 text-center py-8">
                  No misconceptions detected yet. Keep learning!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Visual Chart Placeholder */}
        <div className="mt-6 bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">
            Daily Progress
          </h2>
          <div className="h-48 flex items-end justify-around gap-2">
            {[45, 62, 78, 0, 0, 0, 0].map((val, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    val > 0
                      ? "bg-gradient-to-t from-purple-500 to-purple-400"
                      : "bg-slate-700"
                  }`}
                  style={{ height: `${Math.max(val, 10)}%` }}
                />
                <span className="text-slate-400 text-xs">D{i + 1}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-sm mt-4">
            Score progression over 7 days
          </p>
        </div>
      </div>
    </div>
  );
}
