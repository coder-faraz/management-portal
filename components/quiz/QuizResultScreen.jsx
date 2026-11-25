import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "@/lib/routerAdapter";
import {
  Trophy,
  Clock,
  Gift,
  Share2,
  RotateCcw,
  Check,
  X,
  Sparkles,
  BookOpen,
  Target,
  BarChart3,
  Copy
} from "lucide-react";
import API from "../../apis";
import { Utility } from "../utility";

const QuizResultScreen = ({ attemptId }) => {
  const navigate = useNavigate();
  const { capitalizeEachWord } = Utility();

  const [attemptData, setAttemptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("all"); // 'all' | 'correct' | 'incorrect'

  useEffect(() => {
    if (!attemptId) {
      setError("Invalid attempt ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    API.QuizAPI.getQuizAttemptReview(attemptId)
      .then((res) => {
        if (res?.data) {
          setAttemptData(res.data);
        } else {
          setError("Failed to load attempt result");
        }
      })
      .catch((err) => {
        console.error("Result load error:", err);
        setError("Error loading quiz result");
      })
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-[#0a0a0a]">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800 dark:text-zinc-200">
          Calculating Results & Performance...
        </h2>
      </div>
    );
  }

  if (error || !attemptData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0a0a0a]">
        <div className="p-8 rounded-3xl bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#222] shadow-xl max-w-md w-full text-center space-y-4">
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            Result Not Available
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            {error || "Could not find submission details."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/quiz/listing")}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-all cursor-pointer"
          >
            Back to Quiz Portal
          </button>
        </div>
      </div>
    );
  }

  const { attempt, quiz, questions = [], student, gift_claim } = attemptData;
  const isPassed = attempt?.result === "pass";
  const percentage = attempt?.percentage !== undefined && attempt?.percentage !== null ? attempt.percentage : 0;
  const totalQuestions = questions.length;
  const correctCount = questions.filter((q) => q.is_correct).length;
  const incorrectCount = totalQuestions - correctCount;

  // Format student and quiz details with capitalizeEachWord
  const studentFullName = student ? `${student.firstname || ""} ${student.lastname || ""}`.trim() : "Student";
  const formattedStudentName = capitalizeEachWord(studentFullName);
  const formattedQuizTitle = capitalizeEachWord(quiz?.title || "Online Assessment");
  const formattedRewardGift = quiz?.reward_gift ? capitalizeEachWord(quiz.reward_gift) : "";

  // 5-tier percentage-based motivational feedback
  const getScoreTier = (pct) => {
    if (pct >= 90) {
      return {
        title: "Outstanding Performance! 🌟",
        badge: "EXCELLENT",
        colorClass: "text-emerald-600 dark:text-emerald-400",
        bgClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
        ringColor: "text-emerald-500",
        description: "Exceptional mastery of this topic! Keep up the brilliant standard."
      };
    }
    if (pct >= 75) {
      return {
        title: "Great Job! Well Done! 👏",
        badge: "VERY GOOD",
        colorClass: "text-emerald-600 dark:text-emerald-400",
        bgClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
        ringColor: "text-emerald-500",
        description: "You've demonstrated a strong understanding of these concepts. Superb effort!"
      };
    }
    if (pct >= 60) {
      return {
        title: "Good Effort! Keep Growing! 👍",
        badge: "GOOD",
        colorClass: "text-sky-600 dark:text-sky-400",
        bgClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
        ringColor: "text-sky-500",
        description: "Solid performance! A little revision on missed topics will take you to the top."
      };
    }
    if (pct >= 40) {
      return {
        title: "Nice Try! Almost There! 💪",
        badge: "AVERAGE",
        colorClass: "text-amber-600 dark:text-amber-400",
        bgClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
        ringColor: "text-amber-500",
        description: "You have built the basics. Review the solutions below to strengthen weak areas."
      };
    }
    return {
      title: "Keep Practicing! You Can Do It! 🎯",
      badge: "KEEP PRACTICING",
      colorClass: "text-rose-600 dark:text-rose-400",
      bgClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
      ringColor: "text-rose-500",
      description: "Every attempt is a stepping stone. Go through the explanations and give it another shot!"
    };
  };

  const tier = getScoreTier(percentage);

  // Format time taken
  const formatTimeTaken = (secs) => {
    if (!secs) return "Quick submission";
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    if (mins === 0) return `${remainingSecs} seconds`;
    return `${mins}m ${remainingSecs}s`;
  };

  // SVG Circular progress math
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Social Share / Copy Text
  const handleCopyShare = () => {
    const textToShare = `🎯 I scored ${percentage}% (${attempt.score}/${attempt.total_marks}) on "${formattedQuizTitle}" in School ERP! ${
      formattedRewardGift ? `🏆 Unlocked reward: ${formattedRewardGift}${gift_claim?.claim_code ? ` (Claim Code: ${gift_claim.claim_code})` : ""}` : ""
    }`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToShare);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } else {
      alert(textToShare);
    }
  };

  // Copy Claim Code
  const handleCopyClaimCode = (code) => {
    if (!code) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    } else {
      alert(`Claim Code: ${code}`);
    }
  };

  // Filtered review questions
  const filteredQuestions = questions.filter((q) => {
    if (reviewFilter === "correct") return q.is_correct;
    if (reviewFilter === "incorrect") return !q.is_correct;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#09090b] text-slate-800 dark:text-gray-100 p-4 sm:p-6 lg:p-8 pb-16">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ─── Hero Score & Result Card ─────────────────────────────────────── */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-[#222] shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 text-center md:text-left">
            {/* Left: Summary Info */}
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${tier.bgClass}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{tier.title}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-[#1e1e1e] text-slate-600 dark:text-zinc-300">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Performance Report</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                {formattedQuizTitle}
              </h1>

              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Completed by{" "}
                <span className="font-bold text-slate-800 dark:text-gray-200">
                  {formattedStudentName}
                </span>{" "}
                • Time taken:{" "}
                <span className="font-bold text-slate-800 dark:text-gray-200">
                  {formatTimeTaken(attempt.time_taken)}
                </span>
              </p>

              <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                {tier.description}
              </p>
            </div>

            {/* Right: Circular Percentage SVG Donut */}
            <div className="relative flex flex-col items-center justify-center shrink-0">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  className="text-slate-100 dark:text-[#202020]"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r={radius}
                  cx="64"
                  cy="64"
                />
                <circle
                  className={`${tier.ringColor} transition-all duration-1000 ease-out`}
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r={radius}
                  cx="64"
                  cy="64"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {percentage}%
                </span>
                <span className={`text-[10px] font-black uppercase tracking-wider ${tier.colorClass}`}>
                  {tier.badge}
                </span>
              </div>
            </div>
          </div>

          {/* ─── 3 Key Metric Stat Cards Across Full Width ──────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181818] border border-slate-100 dark:border-[#222] flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Total Score
                </span>
                <p className="text-base font-black text-slate-900 dark:text-white">
                  {attempt.score} <span className="text-xs font-normal text-slate-400">/ {attempt.total_marks} Marks</span>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181818] border border-slate-100 dark:border-[#222] flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Accuracy Breakdown
                </span>
                <p className="text-base font-black text-slate-900 dark:text-white">
                  <span className="text-emerald-600 dark:text-emerald-400">{correctCount} Correct</span>
                  <span className="text-slate-300 dark:text-zinc-600 mx-1.5">•</span>
                  <span className="text-rose-500 dark:text-rose-400">{incorrectCount} Incorrect</span>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181818] border border-slate-100 dark:border-[#222] flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Time Taken
                </span>
                <p className="text-base font-black text-slate-900 dark:text-white">
                  {formatTimeTaken(attempt.time_taken)}
                </p>
              </div>
            </div>
          </div>

          {/* ─── Unlocked Reward Gift Banner (If Applicable) ─────────────────── */}
          {(isPassed || (attempt?.percentage !== null && attempt?.percentage !== undefined && attempt.percentage >= 50) || gift_claim) && formattedRewardGift && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/20 border-2 border-amber-300 dark:border-amber-700/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-xs shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                    Congratulations! Reward Unlocked
                  </span>
                  <p className="text-sm font-black text-amber-950 dark:text-amber-100 truncate">
                    {formattedRewardGift}
                  </p>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    Present your claim code to the school teacher or coordinator to redeem your gift.
                  </p>
                </div>
              </div>

              {/* Claim Code Pill & Actions */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                {gift_claim?.claim_code ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-amber-300 dark:border-amber-700/80 shadow-2xs">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                        Claim Code
                      </span>
                      <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-400 tracking-wider">
                        {gift_claim.claim_code}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyClaimCode(gift_claim.claim_code)}
                      className="p-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/60 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
                      title="Copy Claim Code"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-100/60 dark:bg-amber-950/50 border border-amber-300/50 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                    Claim Code in My Rewards
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigate("/quiz/listing")}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-xs font-bold text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  View My Rewards
                </button>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-100 dark:border-[#1e1e1e] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopyShare}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#1a1a1a] hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-2 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share My Score</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              {quiz?.quiz_type === "practice" && (
                <button
                  type="button"
                  onClick={() => navigate(`/quiz/attempt/${quiz.id}`)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#202020] hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake Practice Quiz</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate("/quiz/listing")}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
              >
                Back to Portal
              </button>
            </div>
          </div>
        </div>

        {/* ─── Detailed Question-by-Question Review ────────────────────────── */}
        {quiz?.allow_review !== false && questions.length > 0 && (
          <div className="space-y-4">
            {/* Review Filter Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Question Solutions &amp; Breakdown</span>
              </h2>

              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200/60 dark:border-[#262626]">
                <button
                  type="button"
                  onClick={() => setReviewFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    reviewFilter === "all"
                      ? "bg-white dark:bg-[#262626] text-emerald-600 dark:text-emerald-400 shadow-2xs"
                      : "text-slate-500 dark:text-zinc-400"
                  }`}
                >
                  All ({totalQuestions})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter("correct")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    reviewFilter === "correct"
                      ? "bg-white dark:bg-[#262626] text-emerald-600 dark:text-emerald-400 shadow-2xs"
                      : "text-slate-500 dark:text-zinc-400"
                  }`}
                >
                  Correct ({correctCount})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter("incorrect")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    reviewFilter === "incorrect"
                      ? "bg-white dark:bg-[#262626] text-rose-600 dark:text-rose-400 shadow-2xs"
                      : "text-slate-500 dark:text-zinc-400"
                  }`}
                >
                  Incorrect ({incorrectCount})
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {filteredQuestions.map((q, idx) => {
                const isCorrect = q.is_correct;

                return (
                  <div
                    key={q.id || idx}
                    className={`p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121212] border transition-all ${
                      isCorrect
                        ? "border-emerald-200 dark:border-emerald-950/60"
                        : "border-rose-200 dark:border-rose-950/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center ${
                            isCorrect
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {q.order_index || idx + 1}
                        </span>
                        <span
                          className={`text-xs font-black ${
                            isCorrect ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isCorrect ? "Correct" : "Incorrect"}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-400">
                        Marks: {q.marks_awarded || 0} / {q.marks || 1}
                      </span>
                    </div>

                    {/* Question Text */}
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed mb-4">
                      {q.question_text}
                    </p>

                    {/* Options Breakdown - 2 columns on medium/large screens */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { key: "option_a", text: q.option_a, label: "A" },
                        { key: "option_b", text: q.option_b, label: "B" },
                        { key: "option_c", text: q.option_c, label: "C" },
                        { key: "option_d", text: q.option_d, label: "D" },
                      ].map((opt) => {
                        const isStudentChoice = q.selected_option === opt.key;
                        const isCorrectAnswer = q.correct_option === opt.key;

                        let style = "border-slate-100 dark:border-[#202020] bg-slate-50/50 dark:bg-[#161616] text-slate-600 dark:text-zinc-400";
                        if (isCorrectAnswer) {
                          style = "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold";
                        } else if (isStudentChoice && !isCorrectAnswer) {
                          style = "border-rose-400 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold";
                        }

                        return (
                          <div
                            key={opt.key}
                            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${style}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className="w-5 h-5 rounded-md bg-black/5 dark:bg-white/10 font-bold flex items-center justify-center shrink-0 text-[10px]">
                                {opt.label}
                              </span>
                              <span className="truncate">{capitalizeEachWord(opt.text)}</span>
                            </div>

                            <div className="shrink-0 flex items-center gap-1 text-[10px] font-black uppercase">
                              {isCorrectAnswer && (
                                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  Correct
                                </span>
                              )}
                              {isStudentChoice && !isCorrectAnswer && (
                                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                  <X className="w-3.5 h-3.5" />
                                  Your Choice
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

QuizResultScreen.propTypes = {
  attemptId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default QuizResultScreen;
