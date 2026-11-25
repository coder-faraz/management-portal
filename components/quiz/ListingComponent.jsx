import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "@/lib/routerAdapter";
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Award,
  Gift,
  BookOpen,
  Edit,
  Trash2,
  ListOrdered,
  BarChart3,
  Sparkles,
  Layers,
  ArrowRight,
  Eye,
  RotateCcw,
  AlertCircle,
  Trophy,
  Check,
  X
} from "lucide-react";

import API from "../../apis";
import { setMenuItem } from "../../redux/actions/NavigationAction";
import { setAllClasses, setSchoolClasses } from "../../redux/actions/ClassAction";
import { setAllSections, setSchoolSections } from "../../redux/actions/SectionAction";
import { setAllSubjects } from "../../redux/actions/SubjectAction";
import { Utility } from "../utility";

import QuizFormModal from "./QuizFormModal";
import QuizQuestionsEditor from "./QuizQuestionsEditor";
import QuizStatsModal from "./QuizStatsModal";

const ListingComponent = ({ rolePriority = null }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    getLocalStorage,
    fetchAndSetAll,
    fetchAndSetSchoolData,
    capitalizeEachWord,
  } = Utility();

  const authInfo = getLocalStorage("auth") || {};
  const isStudent = rolePriority === 6 || authInfo?.role === 6 || authInfo?.rolePriority === 6;

  // Set active sidebar menu
  useEffect(() => {
    dispatch(setMenuItem("Online Quiz"));
  }, [dispatch]);

  // Master Data from Redux
  const schoolClasses = useSelector((state) => state.schoolClasses);
  const allClasses = useSelector((state) => state.allClasses);
  const schoolSections = useSelector((state) => state.schoolSections);
  const allSections = useSelector((state) => state.allSections);
  const allSubjects = useSelector((state) => state.allSubjects);

  // Deduplicated Class List matching project standard
  const classList = useMemo(() => {
    const raw = (schoolClasses?.listData?.length ? schoolClasses.listData : allClasses?.listData) || [];
    const seen = new Set();
    const list = [];
    raw.forEach((item, idx) => {
      const id = item?.class_id ?? item?.id ?? idx;
      const rawName = item?.class_name ?? item?.name ?? `Class ${id}`;
      if (id !== undefined && id !== null && !seen.has(String(id))) {
        seen.add(String(id));
        list.push({ id: Number(id), name: String(rawName) });
      }
    });
    return list;
  }, [schoolClasses?.listData, allClasses?.listData]);

  // Deduplicated Section List
  const sectionList = useMemo(() => {
    const raw = (schoolSections?.listData?.length ? schoolSections.listData : allSections?.listData) || [];
    const seen = new Set();
    const list = [];
    raw.forEach((item, idx) => {
      const id = item?.section_id ?? item?.id ?? idx;
      const rawName = item?.section_name ?? item?.name ?? `Section ${id}`;
      if (id !== undefined && id !== null && !seen.has(String(id))) {
        seen.add(String(id));
        list.push({ id: Number(id), name: String(rawName) });
      }
    });
    return list;
  }, [schoolSections?.listData, allSections?.listData]);

  // Deduplicated Subject List
  const subjectList = useMemo(() => {
    const raw = allSubjects?.listData || [];
    const seen = new Set();
    const list = [];
    raw.forEach((item, idx) => {
      const id = item?.subject_id ?? item?.id ?? idx;
      const rawName = item?.subject_name ?? item?.name ?? `Subject ${id}`;
      if (id !== undefined && id !== null && !seen.has(String(id))) {
        seen.add(String(id));
        list.push({ id: Number(id), name: String(rawName) });
      }
    });
    return list;
  }, [allSubjects?.listData]);

  // Filter & Search States
  const [classData, setClassData] = useState([]);
  const [activeTab, setActiveTab] = useState(isStudent ? "available" : "all"); // admin: 'all' | 'published' | 'draft' | 'closed'; student: 'available' | 'completed' | 'rewards'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  // Load classes, sections, subjects if not present
  useEffect(() => {
    const schoolInfoLocal = getLocalStorage("schoolInfo");
    if (schoolInfoLocal) {
      fetchAndSetSchoolData(dispatch, setSchoolClasses, setSchoolSections, setClassData);
      API.SchoolAPI.getSchoolClasses()
        .then((res) => {
          if (res?.status === "Success" && Array.isArray(res?.data)) {
            setClassData(res.data);
          }
        })
        .catch((err) => console.error("Error fetching class mapping for quiz listing:", err));
    } else {
      if (!classList.length) fetchAndSetAll(dispatch, setAllClasses, API.ClassAPI);
      if (!sectionList.length) fetchAndSetAll(dispatch, setAllSections, API.SectionAPI);
    }
    if (!subjectList.length) {
      fetchAndSetAll(dispatch, setAllSubjects, API.SubjectAPI);
    }
  }, []);

  // Quizzes list state
  const [quizzes, setQuizzes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [giftClaims, setGiftClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(false);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [savingQuiz, setSavingQuiz] = useState(false);

  const [isQuestionsEditorOpen, setIsQuestionsEditorOpen] = useState(false);
  const [activeQuizForQuestions, setActiveQuizForQuestions] = useState(null);

  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [activeQuizForStats, setActiveQuizForStats] = useState(null);

  // Toast feedback
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  // Fetch Quizzes from Backend
  const loadQuizzes = useCallback(() => {
    setLoading(true);
    const condition = {};

    if (!isStudent && activeTab !== "all") {
      condition.status = activeTab;
    }
    if (selectedClass) condition.class_id = selectedClass;
    if (selectedSection) condition.section_id = selectedSection;
    if (selectedSubject) condition.subject_id = selectedSubject;

    API.QuizAPI.getAllQuizzes(condition, 0, 50, searchQuery.trim() || false)
      .then((res) => {
        if (res?.data?.rows) {
          setQuizzes(res.data.rows);
          setTotalCount(res.data.count || res.data.rows.length);
        } else if (Array.isArray(res?.data)) {
          setQuizzes(res.data);
          setTotalCount(res.data.length);
        } else {
          setQuizzes([]);
          setTotalCount(0);
        }
      })
      .catch((err) => {
        console.error("Error loading quizzes:", err);
        setQuizzes([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab, selectedClass, selectedSection, selectedSubject, searchQuery, isStudent]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  // Load Gift Claims for Student
  useEffect(() => {
    if (isStudent && activeTab === "rewards") {
      setLoadingClaims(true);
      API.QuizAPI.getGiftClaims()
        .then((res) => {
          if (res?.data?.rows) setGiftClaims(res.data.rows);
          else if (Array.isArray(res?.data)) setGiftClaims(res.data);
          else setGiftClaims([]);
        })
        .catch(() => setGiftClaims([]))
        .finally(() => setLoadingClaims(false));
    }
  }, [isStudent, activeTab]);

  // Save / Update Quiz Metadata
  const handleSaveQuiz = async (payload) => {
    setSavingQuiz(true);
    try {
      if (payload.id) {
        await API.QuizAPI.updateQuiz(payload);
        showToast("Quiz details updated successfully!");
      } else {
        const res = await API.QuizAPI.createQuiz(payload);
        const newQuizId = res?.data?.id ?? res?.data?.data?.id ?? res?.id;
        showToast("Quiz created successfully! Now add questions to it.");
        setIsFormModalOpen(false);
        setEditingQuiz(null);
        loadQuizzes();
        if (newQuizId) {
          // Open questions editor for the newly created quiz immediately
          setActiveQuizForQuestions({ ...payload, id: Number(newQuizId) });
          setIsQuestionsEditorOpen(true);
        }
      }
      setIsFormModalOpen(false);
      setEditingQuiz(null);
      loadQuizzes();
    } catch (err) {
      console.error("Save quiz error:", err);
      showToast("Failed to save quiz. Please check fields.", "error");
    } finally {
      setSavingQuiz(false);
    }
  };

  // Delete Quiz
  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to delete this quiz? All student attempts and questions will also be removed.")) {
      return;
    }
    try {
      await API.QuizAPI.deleteQuiz(quizId);
      showToast("Quiz deleted successfully.");
      loadQuizzes();
    } catch (err) {
      showToast("Failed to delete quiz.", "error");
    }
  };

  // Toggle Quiz Status (Draft <-> Published)
  const handleToggleStatus = async (quiz) => {
    const nextStatus = quiz.status === "published" ? "draft" : "published";
    try {
      await API.QuizAPI.updateQuiz({ id: quiz.id, status: nextStatus });
      showToast(`Quiz status changed to ${nextStatus}.`);
      loadQuizzes();
    } catch (err) {
      showToast("Failed to update status.", "error");
    }
  };

  // Student Filtered Quizzes
  const studentQuizzes = useMemo(() => {
    if (!isStudent) return quizzes;
    if (activeTab === "available") {
      return quizzes.filter((q) => !q.has_attempted || q.quiz_type === "practice");
    }
    if (activeTab === "completed") {
      return quizzes.filter((q) => q.has_attempted);
    }
    return quizzes;
  }, [quizzes, isStudent, activeTab]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-[10000] px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/80 border-rose-300 text-rose-800 dark:text-rose-200"
              : "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 text-emerald-800 dark:text-emerald-200"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── Hero Header Banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/10">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 rounded-2xl bg-white/15 backdrop-blur-md text-emerald-100 border border-white/20">
                <HelpCircle className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-200 bg-white/10 px-2.5 py-0.5 rounded-full">
                Interactive Learning Hub
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
              {isStudent ? "Online Quiz Portal" : "Online Quiz Management"}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl mt-1 leading-relaxed">
              {isStudent
                ? "Test your knowledge, review step-by-step solutions, and unlock special reward claim badges!"
                : "Create school-wide online quizzes, import questions directly from the question bank, and analyze student leaderboards."}
            </p>
          </div>

          {!isStudent && (
            <button
              type="button"
              onClick={() => {
                setEditingQuiz(null);
                setIsFormModalOpen(true);
              }}
              className="px-5 py-3 rounded-2xl bg-white text-emerald-700 hover:bg-emerald-50 active:scale-95 font-black text-xs shadow-lg shadow-black/10 flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Quiz</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Tabs & Filters Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#121212] p-4 rounded-2xl border border-slate-100 dark:border-[#1e1e1e] shadow-2xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#1c1c1c] border border-slate-200/60 dark:border-[#282828] shrink-0">
          {isStudent ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("available")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "available"
                    ? "bg-white dark:bg-[#2a2a2a] text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                }`}
              >
                Available Quizzes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("completed")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "completed"
                    ? "bg-white dark:bg-[#2a2a2a] text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                }`}
              >
                My Results
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rewards")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "rewards"
                    ? "bg-white dark:bg-[#2a2a2a] text-amber-600 dark:text-amber-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                }`}
              >
                <Gift className="w-3.5 h-3.5 text-amber-500" />
                <span>My Rewards & Gifts</span>
              </button>
            </>
          ) : (
            <>
              {[
                { id: "all", label: "All Quizzes" },
                { id: "published", label: "Published" },
                { id: "draft", label: "Drafts" },
                { id: "closed", label: "Closed" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === t.id
                      ? "bg-white dark:bg-[#2a2a2a] text-emerald-600 dark:text-emerald-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Filter Dropdowns & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Class Filter */}
          {!isStudent && (
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Classes</option>
              {classList.map((c, idx) => (
                <option key={`cls-${c.id ?? idx}`} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Subjects</option>
            {subjectList.map((s, idx) => (
              <option key={`sub-${s.id ?? idx}`} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quiz..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-xs font-medium text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* ─── Student Rewards Tab View ───────────────────────────────────────── */}
      {isStudent && activeTab === "rewards" ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center gap-3">
            <Gift className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Quiz Rewards & Certificates
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400/90 mt-0.5">
                Present your Claim Code to the school teacher or coordinator to redeem your gifts.
              </p>
            </div>
          </div>

          {loadingClaims ? (
            <div className="py-12 text-center text-xs text-slate-400 font-semibold animate-pulse">
              Loading reward claims...
            </div>
          ) : giftClaims.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-[#262626] rounded-3xl p-6">
              <Trophy className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                No Rewards Earned Yet
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Complete and pass quizzes with reward badges to earn exciting prizes and claim codes!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {giftClaims.map((gc) => (
                <div
                  key={gc.id}
                  className="p-5 rounded-3xl bg-white dark:bg-[#141414] border border-amber-200/80 dark:border-amber-900/40 shadow-sm space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                      <Award className="w-5 h-5" />
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        gc.status === "claimed"
                          ? "bg-slate-100 text-slate-600 dark:bg-[#202020] dark:text-zinc-400"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {gc.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">
                      {gc.gift_title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Quiz: {gc.quiz_title || "Online Assessment"}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#222]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Claim Code:
                    </span>
                    <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-400 tracking-wider">
                      {gc.claim_code || "PENDING"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : isStudent ? (
        /* ─── Student Quiz Cards Grid ──────────────────────────────────────── */
        <div>
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-semibold animate-pulse">
              Loading available quizzes...
            </div>
          ) : studentQuizzes.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-[#262626] rounded-3xl p-6">
              <BookOpen className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                No Quizzes Available
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === "completed"
                  ? "You have not completed any quizzes yet."
                  : "There are currently no active quizzes published for your class."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {studentQuizzes.map((quiz) => {
                const att = quiz.student_attempt;
                return (
                  <div
                    key={quiz.id}
                    className="p-5 rounded-3xl bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-[#242424] hover:border-emerald-500/40 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/20">
                          {quiz.subject_name || "General"}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{quiz.duration_minutes ? `${quiz.duration_minutes}m` : "Untimed"}</span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                          {capitalizeEachWord(quiz.title)}
                        </h3>
                        {quiz.description && (
                          <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mt-1">
                            {quiz.description}
                          </p>
                        )}
                      </div>

                      {/* Reward Badge if exists */}
                      {quiz.reward_gift && (
                        <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-center gap-2">
                          <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 truncate">
                            {capitalizeEachWord(quiz.reward_gift)}
                          </span>
                        </div>
                      )}

                      {/* Completed Result Pill */}
                      {att && (
                        <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#1b1b1b] border border-slate-100 dark:border-[#282828] flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Score</span>
                            <span className="text-xs font-black text-slate-800 dark:text-gray-100">
                              {att.score} / {att.total_marks} ({att.percentage}%)
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              att.result === "pass" || (att.percentage !== null && att.percentage !== undefined && att.percentage >= 50)
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            }`}
                          >
                            {att.result === "pass" || (att.percentage !== null && att.percentage !== undefined && att.percentage >= 50) ? "PASS" : "FAIL"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-[#202020] flex items-center gap-2">
                      {att ? (
                        <>
                          <button
                            type="button"
                            onClick={() => navigate(`/quiz/result/${att.id}`)}
                            className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-[#202020] hover:bg-slate-200 dark:hover:bg-[#282828] text-xs font-bold text-slate-700 dark:text-zinc-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Result</span>
                          </button>
                          {quiz.quiz_type === "practice" && (
                            <button
                              type="button"
                              onClick={() => navigate(`/quiz/attempt/${quiz.id}`)}
                              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title="Retake Practice Quiz"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Retake</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/quiz/attempt/${quiz.id}`)}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs font-bold text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>Start Quiz</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ─── Admin / Teacher Management View ──────────────────────────────── */
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-semibold animate-pulse">
              Loading quizzes...
            </div>
          ) : quizzes.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-[#262626] rounded-3xl p-6">
              <HelpCircle className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                No Quizzes Found
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No quizzes match the current tab and filter criteria. Create your first online quiz now.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuiz(null);
                    setIsFormModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-2xs"
                >
                  + Create New Quiz
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-[#222] bg-white dark:bg-[#141414] shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-zinc-400 font-bold border-b border-slate-100 dark:border-[#252525]">
                    <tr>
                      <th className="py-3 px-4">Quiz Title & Scope</th>
                      <th className="py-3 px-4">Class & Subject</th>
                      <th className="py-3 px-4 text-center">Questions</th>
                      <th className="py-3 px-4 text-center">Duration</th>
                      <th className="py-3 px-4 text-center">Marks</th>
                      <th className="py-3 px-4 text-center">Submissions</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#202020]">
                    {quizzes.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-[#181818] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white max-w-xs truncate">
                            {q.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400">
                              Type: <span className="capitalize font-semibold text-slate-600 dark:text-zinc-300">{q.quiz_type || "Graded"}</span>
                            </span>
                            {q.reward_gift && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                <Gift className="w-3 h-3" />
                                {q.reward_gift}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-gray-200">
                            {q.class_name ? `Class ${q.class_name}` : "All Classes"}
                            {q.section_name ? ` (${q.section_name})` : ""}
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            {q.subject_name || "General"}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveQuizForQuestions(q);
                              setIsQuestionsEditorOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#222] hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-zinc-300 font-bold cursor-pointer transition-colors"
                            title="Click to view/manage questions"
                          >
                            <ListOrdered className="w-3 h-3" />
                            <span>{q.questions_count || 0}</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-center text-slate-600 dark:text-zinc-400 font-medium">
                          {q.duration_minutes ? `${q.duration_minutes} mins` : "Untimed"}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="font-extrabold text-slate-800 dark:text-zinc-200">
                            {q.total_marks || 0}
                          </span>
                          {q.passing_marks && (
                            <span className="text-[10px] text-slate-400 block">
                              Pass: {q.passing_marks}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveQuizForStats(q);
                              setIsStatsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-black cursor-pointer hover:bg-emerald-100 transition-colors"
                            title="View Quiz Analytics"
                          >
                            <BarChart3 className="w-3 h-3" />
                            <span>{q.attempts_count || 0}</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(q)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              q.status === "published"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:opacity-80"
                                : q.status === "closed"
                                ? "bg-slate-200 text-slate-700 dark:bg-[#2c2c2c] dark:text-zinc-400"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:opacity-80"
                            }`}
                            title="Click to toggle status"
                          >
                            {q.status || "draft"}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveQuizForQuestions(q);
                                setIsQuestionsEditorOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                              title="Manage Questions"
                            >
                              <ListOrdered className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingQuiz(q);
                                setIsFormModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                              title="Edit Quiz Settings"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuiz(q.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Quiz"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}
      <QuizFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingQuiz(null);
        }}
        initialData={editingQuiz}
        classList={classList}
        sectionList={sectionList}
        subjectList={subjectList}
        classData={classData}
        onSave={handleSaveQuiz}
        loading={savingQuiz}
      />

      <QuizQuestionsEditor
        isOpen={isQuestionsEditorOpen}
        onClose={() => {
          setIsQuestionsEditorOpen(false);
          setActiveQuizForQuestions(null);
        }}
        quiz={activeQuizForQuestions}
        onQuestionsSaved={() => {
          showToast("Quiz questions updated!");
          loadQuizzes();
        }}
      />

      <QuizStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => {
          setIsStatsModalOpen(false);
          setActiveQuizForStats(null);
        }}
        quiz={activeQuizForStats}
      />
    </div>
  );
};

ListingComponent.propTypes = {
  rolePriority: PropTypes.number,
};

export default ListingComponent;
