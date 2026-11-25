import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Search,
  Database,
  Save,
  HelpCircle,
  FileText,
  AlertCircle,
  Check,
  Edit2,
  ListOrdered,
  BookOpen
} from "lucide-react";
import API from "../../apis";

const QuizQuestionsEditor = ({
  isOpen,
  onClose,
  quiz,
  onQuestionsSaved,
}) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Bank Picker State
  const [isBankPickerOpen, setIsBankPickerOpen] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [selectedBankIds, setSelectedBankIds] = useState([]);

  // Inline New / Edit Question State
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [qText, setQText] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [correctOpt, setCorrectOpt] = useState("option_a");
  const [marks, setMarks] = useState(1);
  const [formError, setFormError] = useState("");

  // Load existing questions for this quiz
  useEffect(() => {
    if (isOpen && quiz?.id) {
      setLoading(true);
      setError("");
      API.QuizAPI.getQuizQuestions(quiz.id, true)
        .then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            setQuestions(res.data);
          } else {
            setQuestions([]);
          }
        })
        .catch((err) => {
          console.error("Error fetching quiz questions:", err);
          setError("Failed to load existing questions for this quiz.");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, quiz?.id]);

  // Load question bank when bank picker is opened
  useEffect(() => {
    if (isBankPickerOpen && quiz?.subject_id) {
      setLoadingBank(true);
      API.AssessmentAPI.getAllQuestions({ subject_id: quiz.subject_id, mode: "MCQ" }, 0, 100)
        .then((res) => {
          if (res?.data?.rows) {
            setBankQuestions(res.data.rows);
          } else if (Array.isArray(res?.data)) {
            setBankQuestions(res.data);
          } else {
            setBankQuestions([]);
          }
        })
        .catch(() => setBankQuestions([]))
        .finally(() => setLoadingBank(false));
    }
  }, [isBankPickerOpen, quiz?.subject_id]);

  if (!isOpen || !quiz) return null;

  // Filter bank questions by search
  const filteredBankQuestions = bankQuestions.filter((bq) => {
    if (!bankSearch.trim()) return true;
    const term = bankSearch.toLowerCase();
    return (
      (bq.question_text || "").toLowerCase().includes(term) ||
      (bq.chapter || "").toLowerCase().includes(term)
    );
  });

  const totalCalculatedMarks = questions.reduce(
    (sum, q) => sum + (parseFloat(String(q.marks)) || 1),
    0
  );

  // Reset question draft form
  const resetForm = () => {
    setQText("");
    setOptA("");
    setOptB("");
    setOptC("");
    setOptD("");
    setCorrectOpt("option_a");
    setMarks(1);
    setFormError("");
    setIsAddingNew(false);
    setEditingIndex(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAddingNew(true);
  };

  const handleStartEdit = (index) => {
    const q = questions[index];
    setQText(q.question_text || "");
    setOptA(q.option_a || "");
    setOptB(q.option_b || "");
    setOptC(q.option_c || "");
    setOptD(q.option_d || "");
    setCorrectOpt(q.correct_option || "option_a");
    setMarks(q.marks !== undefined && q.marks !== null ? q.marks : 1);
    setFormError("");
    setEditingIndex(index);
    setIsAddingNew(false);
  };

  const handleSaveQuestionDraft = (e) => {
    e.preventDefault();
    setFormError("");

    if (!qText.trim()) {
      setFormError("Question text is required.");
      return;
    }
    if (!optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
      setFormError("All 4 options (A, B, C, D) are required for multiple choice.");
      return;
    }

    const questionObj = {
      question_text: qText.trim(),
      option_a: optA.trim(),
      option_b: optB.trim(),
      option_c: optC.trim(),
      option_d: optD.trim(),
      correct_option: correctOpt,
      marks: parseFloat(String(marks)) || 1,
      order_index: editingIndex !== null ? editingIndex + 1 : questions.length + 1,
    };

    if (editingIndex !== null) {
      const updated = [...questions];
      updated[editingIndex] = { ...updated[editingIndex], ...questionObj };
      setQuestions(updated);
    } else {
      setQuestions((prev) => [...prev, questionObj]);
    }

    resetForm();
  };

  const handleDeleteQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) resetForm();
  };

  const handleMove = (index, direction) => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === questions.length - 1)
    ) {
      return;
    }
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setQuestions(updated);
  };

  // Import selected bank questions
  const handleImportBankQuestions = () => {
    const selected = bankQuestions.filter((bq) =>
      selectedBankIds.includes(String(bq.id))
    );
    const converted = selected.map((bq, idx) => ({
      question_bank_id: bq.id,
      question_text: bq.question_text || "",
      option_a: bq.option_a || "",
      option_b: bq.option_b || "",
      option_c: bq.option_c || "",
      option_d: bq.option_d || "",
      correct_option: bq.correct_option || "option_a",
      marks: bq.max_marks || 1,
      order_index: questions.length + idx + 1,
    }));

    setQuestions((prev) => [...prev, ...converted]);
    setSelectedBankIds([]);
    setIsBankPickerOpen(false);
  };

  // Save all questions to backend
  const handleFinalSave = async () => {
    if (questions.length === 0) {
      setError("Please add at least 1 question to the quiz before saving.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const payload = {
        quiz_id: quiz.id,
        replace: true,
        questions: questions.map((q, idx) => ({
          ...q,
          order_index: idx + 1,
        })),
      };

      const res = await API.QuizAPI.createQuizQuestions(payload);
      if (res?.status === 200 || res?.data) {
        setSuccessMsg("All questions saved and synchronized successfully!");
        setTimeout(() => {
          if (onQuestionsSaved) onQuestionsSaved(totalCalculatedMarks, questions.length);
          onClose();
        }, 1000);
      }
    } catch (err) {
      console.error("Save questions error:", err);
      setError("Failed to save questions. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#242424] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#202020] bg-slate-50/70 dark:bg-[#161616] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white truncate max-w-md">
                  {quiz.title}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                  {quiz.quiz_type || "Graded"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {quiz.class_name ? `Class ${quiz.class_name}` : "Class"} •{" "}
                {quiz.subject_name || "General"} • Total Questions:{" "}
                <span className="font-bold text-slate-800 dark:text-zinc-200">
                  {questions.length}
                </span>{" "}
                • Total Marks:{" "}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {totalCalculatedMarks}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
              title="Close editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Banners / Feedback */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
          {/* Top Button Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-[#222]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartAdd}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs font-bold text-white flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBankPickerOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-200/80 dark:bg-[#252525] hover:bg-slate-300 dark:hover:bg-[#303030] text-xs font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Import from Question Bank</span>
              </button>
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">
              {questions.length} questions configured
            </div>
          </div>

          {/* Inline Question Add / Edit Form */}
          {(isAddingNew || editingIndex !== null) && (
            <form
              onSubmit={handleSaveQuestionDraft}
              className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  {editingIndex !== null ? `Edit Question #${editingIndex + 1}` : "New Multiple Choice Question"}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Question Text <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Enter the question text..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a] text-xs font-medium text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* 4 Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "option_a", label: "Option A", val: optA, setter: setOptA },
                  { id: "option_b", label: "Option B", val: optB, setter: setOptB },
                  { id: "option_c", label: "Option C", val: optC, setter: setOptC },
                  { id: "option_d", label: "Option D", val: optD, setter: setOptD },
                ].map((opt) => (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-xl border transition-all ${
                      correctOpt === opt.id
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                        : "border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#181818]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                        {opt.label}
                      </span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <input
                          type="radio"
                          name="correct_answer"
                          checked={correctOpt === opt.id}
                          onChange={() => setCorrectOpt(opt.id)}
                          className="accent-emerald-600"
                        />
                        <span>Correct Answer</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={opt.val}
                      onChange={(e) => opt.setter(e.target.value)}
                      placeholder={`Enter text for ${opt.label}...`}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2e2e2e] bg-slate-50/50 dark:bg-[#141414] text-xs text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Marks:</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a] text-xs font-bold text-center"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                >
                  {editingIndex !== null ? "Update Question" : "Add to Quiz"}
                </button>
              </div>
            </form>
          )}

          {/* Question List */}
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-semibold animate-pulse">
              Loading questions...
            </div>
          ) : questions.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-[#282828] rounded-3xl p-6">
              <HelpCircle className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                No Questions Added Yet
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Create new multiple choice questions inline or import existing questions from the question bank.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-2xs"
                >
                  + Add First Question
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-[#222] bg-white dark:bg-[#161616] hover:border-emerald-500/30 transition-all shadow-2xs group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-[#202020] text-slate-700 dark:text-zinc-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-gray-100 leading-relaxed">
                          {q.question_text}
                        </p>
                        {/* Options chips */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5">
                          {[
                            { key: "option_a", text: q.option_a, label: "A" },
                            { key: "option_b", text: q.option_b, label: "B" },
                            { key: "option_c", text: q.option_c, label: "C" },
                            { key: "option_d", text: q.option_d, label: "D" },
                          ].map((opt) => (
                            <div
                              key={opt.key}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-medium flex items-center gap-2 border ${
                                q.correct_option === opt.key
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold"
                                  : "bg-slate-50 dark:bg-[#1c1c1c] border-slate-100 dark:border-[#282828] text-slate-600 dark:text-zinc-400"
                              }`}
                            >
                              <span className="font-extrabold text-[10px] w-4 h-4 rounded-full bg-slate-200/70 dark:bg-[#2a2a2a] flex items-center justify-center shrink-0">
                                {opt.label}
                              </span>
                              <span className="truncate">{opt.text}</span>
                              {q.correct_option === opt.key && (
                                <Check className="w-3 h-3 text-emerald-600 shrink-0 ml-auto" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#222] text-slate-600 dark:text-zinc-400 mr-1">
                        {q.marks || 1} {q.marks === 1 ? "mark" : "marks"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, "up")}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, "down")}
                        disabled={idx === questions.length - 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                        title="Edit question"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Remove question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-[#202020] bg-slate-50/50 dark:bg-[#161616] flex items-center justify-between shrink-0">
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
            Total Questions: <span className="text-slate-900 dark:text-white font-bold">{questions.length}</span> •
            Total Marks: <span className="text-emerald-600 dark:text-emerald-400 font-black">{totalCalculatedMarks}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#1e1e1e] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFinalSave}
              disabled={saving || questions.length === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs font-bold text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving Questions..." : "Save & Sync Questions"}</span>
            </button>
          </div>
        </div>

        {/* ─── Question Bank Picker Modal ────────────────────────────────────── */}
        {isBankPickerOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2c2c2c] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-[#222] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Select Questions from Question Bank
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Showing MCQ questions for {quiz.subject_name || "this subject"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBankPickerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-slate-100 dark:border-[#222]">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    placeholder="Search question bank by keyword or chapter..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-slate-50 dark:bg-[#121212] text-xs"
                  />
                </div>
              </div>

              {/* List */}
              <div className="p-4 flex-1 overflow-y-auto space-y-2.5 custom-scrollbar">
                {loadingBank ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-semibold animate-pulse">
                    Loading Question Bank...
                  </div>
                ) : filteredBankQuestions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No matching questions found in bank for this subject.
                  </div>
                ) : (
                  filteredBankQuestions.map((bq) => {
                    const isSelected = selectedBankIds.includes(String(bq.id));
                    return (
                      <div
                        key={bq.id}
                        onClick={() => {
                          const sId = String(bq.id);
                          setSelectedBankIds((prev) =>
                            prev.includes(sId)
                              ? prev.filter((id) => id !== sId)
                              : [...prev, sId]
                          );
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                            : "border-slate-200 dark:border-[#262626] bg-slate-50/40 dark:bg-[#141414] hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-gray-200 line-clamp-2">
                            {bq.question_text}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-medium">
                            {bq.chapter && <span>Chapter: {bq.chapter}</span>}
                            <span>• {bq.difficulty_level || "Medium"}</span>
                            <span>• {bq.max_marks || 1} mark</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Picker Footer */}
              <div className="p-3 border-t border-slate-100 dark:border-[#222] flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-semibold">
                  {selectedBankIds.length} questions selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBankPickerOpen(false)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={selectedBankIds.length === 0}
                    onClick={handleImportBankQuestions}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white disabled:opacity-40"
                  >
                    Import Selected ({selectedBankIds.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

QuizQuestionsEditor.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  quiz: PropTypes.object,
  onQuestionsSaved: PropTypes.func,
};

export default QuizQuestionsEditor;
