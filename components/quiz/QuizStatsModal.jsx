import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  X,
  BarChart3,
  Trophy,
  Users,
  Target,
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Award
} from "lucide-react";
import API from "../../apis";

const QuizStatsModal = ({ isOpen, onClose, quiz }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && quiz?.id) {
      setLoading(true);
      API.QuizAPI.getQuizStats(quiz.id)
        .then((res) => {
          if (res?.data) {
            setStats(res.data);
          }
        })
        .catch((err) => console.error("Error fetching quiz stats:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, quiz?.id]);

  if (!isOpen || !quiz) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-[#202020] bg-slate-50/50 dark:bg-[#181818] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white truncate max-w-md">
                Quiz Analytics & Performance
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {quiz.title} • {quiz.class_name ? `Class ${quiz.class_name}` : ""} • {quiz.subject_name || "General"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-semibold animate-pulse">
              Calculating quiz analytics...
            </div>
          ) : !stats || stats.total_attempts === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 font-semibold">
              <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
              No attempts submitted yet for this quiz.
            </div>
          ) : (
            <>
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#282828]">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Attempts</span>
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {stats.total_attempts}
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium">Total submissions</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Pass Rate</span>
                    <Percent className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {stats.pass_rate}%
                  </p>
                  <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
                    {stats.passed_count} passed / {stats.failed_count} failed
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#282828]">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Avg Score</span>
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {stats.avg_score}
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium">Out of {quiz.total_marks || "N/A"}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-500/20">
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Top Score</span>
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {stats.highest_score}
                  </p>
                  <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium">Highest achieved</span>
                </div>
              </div>

              {/* Leaderboard Table */}
              {stats.leaderboard && stats.leaderboard.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span>Student Leaderboard (Top Performers)</span>
                    </h3>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#222] bg-white dark:bg-[#181818]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[#202020] text-slate-500 dark:text-zinc-400 font-bold border-b border-slate-100 dark:border-[#282828]">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3">Student</th>
                          <th className="py-2.5 px-3 text-center">Score</th>
                          <th className="py-2.5 px-3 text-center">Percentage</th>
                          <th className="py-2.5 px-3 text-center">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#242424]">
                        {stats.leaderboard.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-[#1e1e1e] transition-colors">
                            <td className="py-2.5 px-3 text-center font-bold">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-gray-100">
                              {item.student_name}
                              {item.roll_no && (
                                <span className="ml-1.5 text-[10px] font-normal text-slate-400">
                                  (Roll: {item.roll_no})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-zinc-200">
                              {item.score} / {item.total_marks}
                            </td>
                            <td className="py-2.5 px-3 text-center font-black text-emerald-600 dark:text-emerald-400">
                              {item.percentage}%
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  item.result === "pass"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                }`}
                              >
                                {item.result}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-[#202020] bg-slate-50/50 dark:bg-[#161616] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-[#252525] text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-[#303030] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

QuizStatsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  quiz: PropTypes.object,
};

export default QuizStatsModal;
