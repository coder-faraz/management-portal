import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import {
  X,
  HelpCircle,
  Save,
  CheckCircle2,
  Layers,
  Sparkles,
  BookOpen,
  Clock,
  Award,
  Gift,
  Shuffle,
  Eye,
  AlertCircle,
  FileText
} from "lucide-react";
import API from "../../apis";

const QUIZ_TYPES = [
  { id: "graded", label: "Graded Quiz", desc: "Counts towards student score" },
  { id: "practice", label: "Practice Quiz", desc: "Unlimited retakes for revision" },
  { id: "mock", label: "Mock Exam", desc: "Simulation mode under strict time" },
];

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Mixed"];

const QuizFormModal = ({
  isOpen,
  onClose,
  initialData = null,
  classList = [],
  sectionList = [],
  subjectList = [],
  classData: propClassData = [],
  onSave,
  loading = false,
}) => {
  const isEditing = Boolean(initialData && initialData.id);

  // Raw mapping from school_class_data (class_id, section_id, subject_ids)
  const [classData, setClassData] = useState(propClassData || []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [quizType, setQuizType] = useState("graded");
  const [difficulty, setDifficulty] = useState("Medium");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [passingMarks, setPassingMarks] = useState(4);
  const [rewardGift, setRewardGift] = useState("");
  const [allowReview, setAllowReview] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [status, setStatus] = useState("draft");
  const [validationError, setValidationError] = useState("");

  // Sync propClassData or fetch if missing
  useEffect(() => {
    if (propClassData && propClassData.length > 0) {
      setClassData(propClassData);
    } else if (isOpen) {
      API.SchoolAPI.getSchoolClasses()
        .then((res) => {
          if (res?.status === "Success" && Array.isArray(res?.data)) {
            setClassData(res.data);
          }
        })
        .catch((err) => {
          console.error("Error fetching school class mapping for quiz modal:", err);
        });
    }
  }, [isOpen, propClassData]);

  // Derived unique Class list (prioritizing classData mapping table)
  const computedClassList = useMemo(() => {
    if (classData && classData.length > 0) {
      const seen = new Set();
      const list = [];
      classData.forEach((item) => {
        const id = item.class_id ?? item.id;
        const name = item.class_name ?? item.name;
        if (id !== undefined && id !== null && !seen.has(String(id))) {
          seen.add(String(id));
          list.push({ id: Number(id), name: String(name) });
        }
      });
      if (list.length > 0) return list;
    }
    return classList;
  }, [classData, classList]);

  // Derived Sections strictly belonging to the currently selected Class
  const availableSections = useMemo(() => {
    if (!classId) return [];
    if (classData && classData.length > 0) {
      const matching = classData.filter(
        (obj) => String(obj.class_id ?? obj.id) === String(classId)
      );
      const seen = new Set();
      const list = [];
      matching.forEach((obj) => {
        const sId = obj.section_id;
        const sName = obj.section_name ?? (sId !== undefined ? `Section ${sId}` : null);
        if (sId !== undefined && sId !== null && sName && !seen.has(String(sId))) {
          seen.add(String(sId));
          list.push({ id: Number(sId), name: String(sName) });
        }
      });
      return list;
    }
    return sectionList;
  }, [classId, classData, sectionList]);

  // Derived Subjects mapped to currently selected Class & Section in school_class_data
  const availableSubjects = useMemo(() => {
    if (!classId) return subjectList;
    if (classData && classData.length > 0) {
      const matching = classData.filter((obj) => {
        const matchClass = String(obj.class_id ?? obj.id) === String(classId);
        if (!matchClass) return false;
        if (sectionId) {
          return String(obj.section_id ?? obj.id) === String(sectionId);
        }
        return true;
      });

      const subjectIdSet = new Set();
      matching.forEach((obj) => {
        if (obj.subject_ids) {
          String(obj.subject_ids)
            .split(",")
            .forEach((id) => {
              const trimmed = id.trim();
              if (trimmed) subjectIdSet.add(trimmed);
            });
        }
      });

      if (subjectIdSet.size > 0 && subjectList && subjectList.length > 0) {
        const filtered = subjectList.filter((s) => subjectIdSet.has(String(s.id)));
        if (filtered.length > 0) return filtered;
      }
    }
    return subjectList;
  }, [classId, sectionId, classData, subjectList]);

  // Initialize or reset form values
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setInstructions(initialData.instructions || "");
      setClassId(initialData.class_id ? String(initialData.class_id) : "");
      setSectionId(initialData.section_id ? String(initialData.section_id) : "");
      setSubjectId(initialData.subject_id ? String(initialData.subject_id) : "");
      setQuizType(initialData.quiz_type || "graded");
      setDifficulty(initialData.difficulty_level || "Medium");
      setDurationMinutes(initialData.duration_minutes !== null && initialData.duration_minutes !== undefined ? initialData.duration_minutes : 15);
      setPassingMarks(initialData.passing_marks !== null && initialData.passing_marks !== undefined ? initialData.passing_marks : 4);
      setRewardGift(initialData.reward_gift || "");
      setAllowReview(initialData.allow_review !== false);
      setShuffleQuestions(Boolean(initialData.shuffle_questions));
      setStatus(initialData.status || "draft");
    } else {
      setTitle("");
      setDescription("");
      setInstructions("• Attempt all questions.\n• Each question carries 1 mark.\n• Do not refresh or exit until submitted.");
      const defaultCls = computedClassList[0]?.id ? String(computedClassList[0].id) : "";
      setClassId(defaultCls);
      setSectionId("");
      setSubjectId("");
      setQuizType("graded");
      setDifficulty("Medium");
      setDurationMinutes(15);
      setPassingMarks(4);
      setRewardGift("");
      setAllowReview(true);
      setShuffleQuestions(false);
      setStatus("draft");
    }
    setValidationError("");
  }, [initialData, isOpen, computedClassList]);

  // Handler when class selection changes: reset dependent section & subject
  const handleClassChange = (newClassId) => {
    setClassId(newClassId);
    setSectionId(""); // Reset section to All Sections
    setSubjectId(""); // Reset subject so user chooses from newly available subjects
  };

  // Handler when section changes: optionally clear subject if not valid in that section
  const handleSectionChange = (newSectionId) => {
    setSectionId(newSectionId);
  };

  // If availableSubjects changes and currently chosen subjectId is not in it, reset subjectId
  useEffect(() => {
    if (subjectId && availableSubjects.length > 0) {
      const exists = availableSubjects.some((s) => String(s.id) === String(subjectId));
      if (!exists) {
        setSubjectId("");
      }
    }
  }, [availableSubjects, subjectId]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    if (!title.trim()) {
      setValidationError("Please enter a quiz title.");
      return;
    }
    if (!classId) {
      setValidationError("Please select a target class.");
      return;
    }
    if (!subjectId) {
      setValidationError("Please select a subject.");
      return;
    }
    if (durationMinutes !== "" && parseInt(String(durationMinutes), 10) < 0) {
      setValidationError("Duration cannot be negative (use 0 or leave blank for untimed).");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      instructions: instructions.trim() || null,
      class_id: parseInt(classId, 10),
      section_id: sectionId ? parseInt(sectionId, 10) : null,
      subject_id: parseInt(subjectId, 10),
      quiz_type: quizType,
      difficulty_level: difficulty,
      duration_minutes: durationMinutes !== "" && durationMinutes !== null ? parseInt(String(durationMinutes), 10) : null,
      passing_marks: passingMarks !== "" && passingMarks !== null ? parseFloat(String(passingMarks)) : null,
      reward_gift: rewardGift.trim() || null,
      allow_review: Boolean(allowReview),
      shuffle_questions: Boolean(shuffleQuestions),
      status: status,
    };

    if (isEditing && initialData?.id) {
      payload.id = initialData.id;
    }

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-[#202020] flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-[#181818]/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isEditing ? "Edit Online Quiz" : "Create Online Quiz"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Configure quiz scope, rules, timer, and student incentives
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {validationError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="font-semibold">{validationError}</span>
            </div>
          )}

          {/* 1. Quiz Type Selector */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300">
              Quiz Mode / Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {QUIZ_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setQuizType(t.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    quizType === t.id
                      ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs"
                      : "border-slate-200 dark:border-[#2a2a2a] bg-slate-50/50 dark:bg-[#1a1a1a] text-slate-600 dark:text-zinc-400 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-gray-100">{t.label}</span>
                    {quizType === t.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 leading-snug">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                Quiz Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Mathematics Rapid Fire: Fractions & Decimals"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a] text-xs font-semibold text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                Short Description / Topics Covered
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this quiz assesses..."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a] text-xs font-medium text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all custom-scrollbar"
              />
            </div>
          </div>

          {/* 3. Class, Section, and Subject (Dependent Dropdowns) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                Class <span className="text-rose-500">*</span>
              </label>
              <select
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a] text-xs font-semibold text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              >
                <option value="">Select Class</option>
                {computedClassList.map((c, idx) => (
                  <option key={`modal-cls-${c.id ?? idx}`} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                Section (Optional)
              </label>
              <select
                value={sectionId}
                onChange={(e) => handleSectionChange(e.target.value)}
                disabled={!classId}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a] text-xs font-semibold text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-[#121212]"
              >
                <option value="">All Sections</option>
                {availableSections.map((s, idx) => (
                  <option key={`modal-sec-${s.id ?? idx}`} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                Subject <span className="text-rose-500">*</span>
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={!classId}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a] text-xs font-semibold text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-[#121212]"
              >
                <option value="">Select Subject</option>
                {availableSubjects.map((sub, idx) => (
                  <option key={`modal-sub-${sub.id ?? idx}`} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Duration, Difficulty & Passing Marks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                Duration (Minutes)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="0 = Untimed"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a] text-xs font-semibold text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold">mins</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                Passing Marks
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={passingMarks}
                onChange={(e) => setPassingMarks(e.target.value)}
                placeholder="Passing score threshold"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a] text-xs font-semibold text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a] text-xs font-semibold text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Reward Gift Title (Incentive Workflow) */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center gap-2 mb-1.5">
              <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <label className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Reward Gift / Pass Badge (Optional Incentive)
              </label>
            </div>
            <input
              type="text"
              value={rewardGift}
              onChange={(e) => setRewardGift(e.target.value)}
              placeholder="e.g. Science Olympiad Gold Badge • 100 Reward Points"
              className="w-full px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-[#161616] text-xs text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
              Students who pass this quiz will unlock a claim code for this reward in their student portal.
            </p>
          </div>

          {/* 6. Quiz Options & Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="p-3 rounded-2xl border border-slate-200 dark:border-[#262626] bg-slate-50/60 dark:bg-[#181818] flex items-center justify-between cursor-pointer select-none">
              <div className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-gray-200 block">Allow Result Review</span>
                  <span className="text-[10px] text-slate-400">Show correct answers after submission</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={allowReview}
                onChange={(e) => setAllowReview(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
            </label>

            <label className="p-3 rounded-2xl border border-slate-200 dark:border-[#262626] bg-slate-50/60 dark:bg-[#181818] flex items-center justify-between cursor-pointer select-none">
              <div className="flex items-center gap-2.5">
                <Shuffle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-gray-200 block">Shuffle Questions</span>
                  <span className="text-[10px] text-slate-400">Randomize question sequence per attempt</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
            </label>
          </div>

          {/* 7. Status & Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                Quiz Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a] text-xs font-semibold text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              >
                <option value="draft">Draft (Hidden from students)</option>
                <option value="published">Published (Visible in portal)</option>
                <option value="closed">Closed (Submissions disabled)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                Instructions for Students
              </label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Total 10 questions. Time limit 15 minutes."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a] text-xs text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-[#202020] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#1e1e1e] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs font-bold text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "Saving Quiz..." : isEditing ? "Update Quiz" : "Save & Add Questions"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

QuizFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  classList: PropTypes.array,
  sectionList: PropTypes.array,
  subjectList: PropTypes.array,
  classData: PropTypes.array,
  onSave: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default QuizFormModal;
