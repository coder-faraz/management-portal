import React, { useState, useEffect, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "@/lib/routerAdapter";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  Sparkles,
  RotateCcw,
  BookOpen,
  Award,
  X,
  Check
} from "lucide-react";
import API from "../../apis";

const QuizAttemptScreen = ({ quizId }) => {
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [question_id]: selected_option }
  const [timeLeft, setTimeLeft] = useState(null); // in seconds
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // 1. Initial Load: Fetch Quiz, Questions & Start Attempt Session
  useEffect(() => {
    if (!quizId) {
      setLoadError("Invalid Quiz ID");
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function initializeQuiz() {
      try {
        setLoading(true);
        setLoadError("");

        // Fetch quiz details
        const quizRes = await API.QuizAPI.getQuizById(quizId);
        const quizData = quizRes?.data;
        if (!quizData) {
          throw new Error("Quiz not found or inaccessible");
        }

        // Fetch questions (student mode hides correct answers)
        const questionsRes = await API.QuizAPI.getQuizQuestions(quizId, false);
        let questionsData = Array.isArray(questionsRes?.data) ? questionsRes.data : [];

        if (questionsData.length === 0) {
          throw new Error("This quiz does not have any questions configured yet.");
        }

        // Shuffle questions if quiz setting is true
        if (quizData.shuffle_questions) {
          questionsData = [...questionsData].sort(() => Math.random() - 0.5);
        }

        // Start attempt session
        const attemptRes = await API.QuizAPI.startQuizAttempt({ quiz_id: quizId });
        const newAttemptId = attemptRes?.data?.attempt_id;
        if (!newAttemptId) {
          throw new Error(attemptRes?.message || "Could not start quiz session. You may have already taken this quiz.");
        }

        if (isMounted) {
          setQuiz(quizData);
          setQuestions(questionsData);
          setAttemptId(newAttemptId);
          startTimeRef.current = Date.now();

          // Initialize timer if quiz has a duration
          if (quizData.duration_minutes && quizData.duration_minutes > 0) {
            setTimeLeft(quizData.duration_minutes * 60);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Initialization error:", err);
          setLoadError(err?.message || "Failed to load quiz");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initializeQuiz();

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizId]);

  // 2. Timer Countdown & Auto-Submit
  useEffect(() => {
    if (timeLeft === null || timeLeft === undefined) return;

    if (timeLeft <= 0) {
      // Auto submit when time runs out
      handleFinalSubmit();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft]);

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // Handle Option Selection
  const handleSelectOption = (optionKey) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionKey,
    }));
  };

  // Clear current selection
  const handleClearCurrent = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQuestion.id];
      return copy;
    });
  };

  // Submit Attempt
  const handleFinalSubmit = async () => {
    if (submitting || !attemptId || !quiz) return;
    setSubmitting(true);
    setShowConfirmModal(false);

    try {
      const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
      const answerPayload = Object.entries(answers).map(([qId, opt]) => ({
        quiz_question_id: parseInt(qId, 10),
        selected_option: opt,
      }));

      const res = await API.QuizAPI.submitQuizAttempt({
        attempt_id: attemptId,
        quiz_id: quiz.id,
        answers: answerPayload,
        time_taken: timeTaken,
      });

      if (res?.data?.attempt?.id) {
        navigate(`/quiz/result/${res.data.attempt.id}`);
      } else {
        navigate(`/quiz/result/${attemptId}`);
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("Error submitting quiz. Navigating to results...");
      navigate(`/quiz/result/${attemptId}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-[#0a0a0a]">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800 dark:text-zinc-200">
          Preparing Your Quiz Environment...
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Loading questions and setting up anti-cheat session.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0a0a0a]">
        <div className="p-8 rounded-3xl bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#222] shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            Cannot Start Quiz
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            {loadError}
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

  const isTimerLow = timeLeft !== null && timeLeft <= 120; // 2 minutes or less

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#09090b] text-slate-800 dark:text-gray-100 flex flex-col">
      {/* ─── Top Sticky Control Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-[#202020] px-4 sm:px-6 py-3 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                {quiz.title}
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold truncate">
                Question {currentIndex + 1} of {totalQuestions} • {answeredCount} Answered
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Live Countdown Timer */}
            {timeLeft !== null && (
              <div
                className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 font-mono text-xs font-black transition-all ${
                  isTimerLow
                    ? "bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-600 dark:text-rose-400 animate-pulse"
                    : "bg-slate-50 dark:bg-[#1c1c1c] border-slate-200 dark:border-[#2c2c2c] text-slate-800 dark:text-zinc-200"
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}

            {/* Finish Quiz Button */}
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs font-bold text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Submit</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-6xl mx-auto mt-2 h-1 w-full bg-slate-100 dark:bg-[#202020] rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* ─── Main Content Workspace ────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Question Workspace */}
        <div className="lg:col-span-3 space-y-6 flex flex-col justify-between">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-[#202020] shadow-sm space-y-6">
            {/* Question Header & Marks */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1e1e1e]">
              <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-black border border-emerald-500/20">
                Question {currentIndex + 1}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                {currentQuestion.marks || 1} {currentQuestion.marks === 1 ? "Mark" : "Marks"}
              </span>
            </div>

            {/* Question Text */}
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {currentQuestion.question_text}
            </div>

            {/* 4 Interactive Option Cards */}
            <div className="space-y-3 pt-2">
              {[
                { key: "option_a", text: currentQuestion.option_a, label: "A" },
                { key: "option_b", text: currentQuestion.option_b, label: "B" },
                { key: "option_c", text: currentQuestion.option_c, label: "C" },
                { key: "option_d", text: currentQuestion.option_d, label: "D" },
              ].map((opt) => {
                const isSelected = answers[currentQuestion.id] === opt.key;
                return (
                  <div
                    key={opt.key}
                    onClick={() => handleSelectOption(opt.key)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 shadow-sm"
                        : "border-slate-200/80 dark:border-[#242424] bg-white dark:bg-[#161616] hover:border-slate-300 dark:hover:border-[#333] text-slate-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 dark:bg-[#202020] text-slate-600 dark:text-zinc-400 group-hover:bg-slate-200"
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold leading-relaxed">
                        {opt.text}
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300 dark:border-zinc-600"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#161616] text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {answers[currentQuestion?.id] && (
              <button
                type="button"
                onClick={handleClearCurrent}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Clear Choice
              </button>
            )}

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Finish & Submit</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Question Navigation Palette */}
        <aside className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-[#202020] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Question Palette
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {answeredCount}/{totalQuestions} Answered
              </span>
            </div>

            {/* Grid of Number Pills */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = Boolean(answers[q.id]);
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center relative ${
                      isCurrent
                        ? "ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-[#121212] z-10"
                        : ""
                    } ${
                      isAnswered
                        ? "bg-emerald-600 text-white font-black shadow-2xs"
                        : "bg-slate-100 dark:bg-[#1c1c1c] text-slate-700 dark:text-zinc-400 hover:bg-slate-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#202020] space-y-1.5 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 shrink-0" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-100 dark:bg-[#1c1c1c] border border-slate-300 dark:border-zinc-700 shrink-0" />
                <span>Unanswered ({totalQuestions - answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md ring-2 ring-emerald-500 shrink-0" />
                <span>Current Question</span>
              </div>
            </div>
          </div>

          {/* Instructions Reminder */}
          {quiz.instructions && (
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#141414] border border-slate-200/60 dark:border-[#222] text-xs space-y-1.5">
              <span className="font-bold text-slate-700 dark:text-zinc-300 block">
                Instructions:
              </span>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 whitespace-pre-line leading-relaxed">
                {quiz.instructions}
              </p>
            </div>
          )}
        </aside>
      </main>

      {/* ─── Submit Confirmation Modal ─────────────────────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Submit Your Quiz?
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                You have answered{" "}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {answeredCount}
                </span>{" "}
                out of {totalQuestions} questions.
                {totalQuestions - answeredCount > 0 && (
                  <span className="text-rose-500 font-semibold block mt-1">
                    ({totalQuestions - answeredCount} questions are left unanswered)
                  </span>
                )}
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 cursor-pointer"
              >
                Review More
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

QuizAttemptScreen.propTypes = {
  quizId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default QuizAttemptScreen;
