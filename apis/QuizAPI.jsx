/**
 * Copyright © 2026, School CRM Inc. ALL RIGHTS RESERVED.
 *
 * This software is the confidential information of School CRM Inc.
 */

import { api } from "./config/axiosConfig";
import { defineCancelApiObject } from "./config/axiosUtils";
import { Utility } from "../components/utility";

const { getLocalStorage } = Utility();

export const QuizAPI = {
  // ─── Quiz Management APIs ────────────────────────────────────────────────
  getAllQuizzes: async (conditionObj = false, page = 0, size = 10, search = false, cancel = false) => {
    let queryParam = "";
    if (conditionObj) {
      Object.keys(conditionObj).forEach((key) => {
        if (conditionObj[key] !== undefined && conditionObj[key] !== null && conditionObj[key] !== "") {
          queryParam += `&${key}=${encodeURIComponent(conditionObj[key])}`;
        }
      });
    }
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
    const { data: response } = await api.request({
      url: `/get-quizzes?page=${page}&size=${size}${queryParam}${searchParam}`,
      headers: {
        "x-access-token": getLocalStorage("auth")?.token,
      },
      method: "GET",
      signal: cancel && cancelApiObject.getAllQuizzes ? cancelApiObject.getAllQuizzes.handleRequestCancellation().signal : undefined,
    });
    return response;
  },

  getQuizById: async (id, cancel = false) => {
    const { data: response } = await api.request({
      url: `/get-by-pk/quiz/${id}`,
      headers: {
        "x-access-token": getLocalStorage("auth")?.token,
      },
      method: "GET",
      signal: cancel && cancelApiObject.getQuizById ? cancelApiObject.getQuizById.handleRequestCancellation().signal : undefined,
    });
    return response;
  },

  createQuiz: async (quiz, cancel = false) => {
    const { data: response } = await api.request({
      url: `/create-quiz`,
      headers: {
        "x-access-token": getLocalStorage("auth")?.token,
      },
      method: "POST",
      data: quiz,
      signal: cancel && cancelApiObject.createQuiz ? cancelApiObject.createQuiz.handleRequestCancellation().signal : undefined,
    });
    return response;
  },

  updateQuiz: async (fields, cancel = false) => {
    const { data: response } = await api.request({
      url: `/update-quiz`,
      headers: {
        "x-access-token": getLocalStorage("auth")?.token,
      },
      method: "PATCH",
      data: fields,
      signal: cancel && cancelApiObject.updateQuiz ? cancelApiObject.updateQuiz.handleRequestCancellation().signal : undefined,
    });
    return response;
  },

  deleteQuiz: async (id, cancel = false) => {
    const { data: response } = await api.request({
      url: `/delete-by-pk/quiz/${id}`,
      headers: {
        "x-access-token": getLocalStorage("auth")?.token,
      },
      method: "DELETE",
      signal: cancel && cancelApiObject.deleteQuiz ? cancelApiObject.deleteQuiz.handleRequestCancellation().signal : undefined,
    });
    return response;
  },

  // ─── Quiz Question APIs ──────────────────────────────────────────────────
  getQuizQuestions: async (quizId, review = false, cancel = false) => {
    const { data: response } = await api.request({
      url: `/get-quiz-questions?quiz_id=${quizId}${review ? "&review=true" : ""}`,
      headers: {
        "x-access-token": getLocalStorage("auth")?.token,
      },
      method: "GET",
      signal: cancel && cancelApiObject.getQuizQuestions ? cancelApiObject.getQuizQuestions.handleRequestCancellation().signal : undefined,
    });
    return response;
  },

  createQuizQuestions: async (data, cancel = false) => {
    const { data: response } = await api.request({
      url: `/create-quiz-questions`,
      headers: {
        "x-access-token": getLocalStorage("auth")?.token,
      },
      method: "POST",
      data,
      signal: cancel && cancelApiObject.createQuizQuestions ? cancelApiObject.createQuizQuestions.handleRequestCancellation().signal : undefined,
    });
    return response;
  },

  // ─── Quiz Attempt & Assessment APIs ──────────────────────────────────────
  startQuizAttempt: async (data, cancel = false) => {
    const { data: response } = await api.request({
      url: `/start-quiz-attempt`,
      headers: {
        "x-access-token": getLocalStorage("auth")?.token,
      },
      method: "POST",
      data,
      signal: cancel && cancelApiObject.startQuizAttempt ? cancelApiObject.startQuizAttempt.handleRequestCancellation().signal : undefined,
    });
    return response;
  },

  submitQuizAttempt: async (data, cancel = false) => {
    const { data: response } = await api.request({
      url: `/submit-quiz-attempt`,
      headers: {
        "x-access-token": getLocalStorage("auth")?.token,
      },
      method: "POST",
      data,
      signal: cancel && cancelApiObject.submitQuizAttempt ? cancelApiObject.submitQuizAttempt.handleRequestCancellation().signal : undefined,
    });
    return response;
  },

  getQuizAttemptReview: async (attemptId, cancel = false) => {
    const { data: response } = await api.request({
      url: `/get-quiz-attempt-review?attempt_id=${attemptId}`,
      headers: {
        "x-access-token": getLocalStorage("auth")?.token,
      },
      method: "GET",
      signal: cancel && cancelApiObject.getQuizAttemptReview ? cancelApiObject.getQuizAttemptReview.handleRequestCancellation().signal : undefined,
    });
    return response;
  },

  getQuizStats: async (quizId, cancel = false) => {
    const { data: response } = await api.request({
      url: `/get-quiz-stats?quiz_id=${quizId}`,
      headers: {
        "x-access-token": getLocalStorage("auth")?.token,
      },
      method: "GET",
      signal: cancel && cancelApiObject.getQuizStats ? cancelApiObject.getQuizStats.handleRequestCancellation().signal : undefined,
    });
    return response;
  },

  // ─── Gift Reward Claim APIs ──────────────────────────────────────────────
  getGiftClaims: async (conditionObj = false, page = 0, size = 10, search = false, cancel = false) => {
    let queryParam = "";
    if (conditionObj) {
      Object.keys(conditionObj).forEach((key) => {
        if (conditionObj[key] !== undefined && conditionObj[key] !== null && conditionObj[key] !== "") {
          queryParam += `&${key}=${encodeURIComponent(conditionObj[key])}`;
        }
      });
    }
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
    const { data: response } = await api.request({
      url: `/get-gift-claims?page=${page}&size=${size}${queryParam}${searchParam}`,
      headers: {
        "x-access-token": getLocalStorage("auth")?.token,
      },
      method: "GET",
      signal: cancel && cancelApiObject.getGiftClaims ? cancelApiObject.getGiftClaims.handleRequestCancellation().signal : undefined,
    });
    return response;
  },

  claimGift: async (data, cancel = false) => {
    const { data: response } = await api.request({
      url: `/claim-gift`,
      headers: {
        "x-access-token": getLocalStorage("auth")?.token,
      },
      method: "POST",
      data,
      signal: cancel && cancelApiObject.claimGift ? cancelApiObject.claimGift.handleRequestCancellation().signal : undefined,
    });
    return response;
  },
};

const cancelApiObject = defineCancelApiObject(QuizAPI);

export default QuizAPI;
