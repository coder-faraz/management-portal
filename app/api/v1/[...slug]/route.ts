import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import Utility from "@/lib/utility";
import { withAuth, applyRateLimit } from "@/lib/apiHelpers";
import { genericList, genericCreate, genericUpdate, provisionStudentUser } from "@/lib/crudHelpers";

// Mapping of route endpoint names to Prisma model names
const MODEL_MAPPING: Record<string, { model: string; searchFields: string[] }> = {
  "employees": { model: "employee", searchFields: ["firstname", "lastname", "email", "role"] },
  "employee": { model: "employee", searchFields: ["firstname", "lastname", "email", "role"] },
  "classes": { model: "school_class", searchFields: ["name"] },
  "class": { model: "school_class", searchFields: ["name"] },
  "schools": { model: "school", searchFields: ["name", "email", "school_code", "director", "principal"] },
  "school": { model: "school", searchFields: ["name", "email", "school_code", "director", "principal"] },
  "teachers": { model: "teacher", searchFields: ["firstname", "lastname", "email"] },
  "teacher": { model: "teacher", searchFields: ["firstname", "lastname", "email"] },
  "students": { model: "student", searchFields: ["firstname", "lastname", "email", "session"] },
  "student": { model: "student", searchFields: ["firstname", "lastname", "email", "session"] },
  "buses": { model: "bus", searchFields: ["registration_no", "driver", "route"] },
  "bus": { model: "bus", searchFields: ["registration_no", "driver", "route"] },
  "noticeboards": { model: "noticeboard", searchFields: ["title", "description"] },
  "noticeboard": { model: "noticeboard", searchFields: ["title", "description"] },
  "noticeboarddetails": { model: "noticeboard", searchFields: ["title", "description"] },
  "noticeboard-details": { model: "noticeboard", searchFields: ["title", "description"] },
  "notice": { model: "noticeboard", searchFields: ["title", "description"] },
  "notices": { model: "noticeboard", searchFields: ["title", "description"] },
  "payments": { model: "payment", searchFields: ["type_duration", "academic_year"] },
  "payment": { model: "payment", searchFields: ["type_duration", "academic_year"] },
  "payment-methods": { model: "payment_method", searchFields: ["name"] },
  "payment-method": { model: "payment_method", searchFields: ["name"] },
  "holidays": { model: "holiday", searchFields: ["title", "notes"] },
  "holiday": { model: "holiday", searchFields: ["title", "notes"] },
  "school-durations": { model: "school_duration", searchFields: [] },
  "school-duration": { model: "school_duration", searchFields: [] },
  "school-houses": { model: "school_house", searchFields: ["name", "color_code"] },
  "school-house": { model: "school_house", searchFields: ["name", "color_code"] },
  "time-tables": { model: "timetable", searchFields: ["batch", "duration"] },
  "time-table": { model: "timetable", searchFields: ["batch", "duration"] },
  "timetables": { model: "timetable", searchFields: ["batch", "duration"] },
  "timetable": { model: "timetable", searchFields: ["batch", "duration"] },
  "attendance": { model: "attendance", searchFields: [] },
  "attendances": { model: "attendance", searchFields: [] },
  "user-roles": { model: "user_role", searchFields: ["name"] },
  "user-role": { model: "user_role", searchFields: ["name"] },
  "sections": { model: "section", searchFields: ["name"] },
  "section": { model: "section", searchFields: ["name"] },
  "subjects": { model: "subject", searchFields: ["name"] },
  "subject": { model: "subject", searchFields: ["name"] },
  "amenities": { model: "amenity", searchFields: ["name", "description"] },
  "amenity": { model: "amenity", searchFields: ["name", "description"] },
  "users": { model: "user", searchFields: ["username", "email", "contact_no"] },
  "user": { model: "user", searchFields: ["username", "email", "contact_no"] },
  "marksheets": { model: "marksheet", searchFields: ["session"] },
  "marksheet": { model: "marksheet", searchFields: ["session"] },
  "homeworks": { model: "homework", searchFields: ["title", "description"] },
  "homework": { model: "homework", searchFields: ["title", "description"] },
  "all-cities": { model: "city", searchFields: ["name"] },
  "cities": { model: "city", searchFields: ["name"] },
  "city": { model: "city", searchFields: ["name"] },
  "all-states": { model: "state", searchFields: ["name"] },
  "states": { model: "state", searchFields: ["name"] },
  "state": { model: "state", searchFields: ["name"] },
  "countries": { model: "country", searchFields: ["name", "country_code", "phone_code"] },
  "country": { model: "country", searchFields: ["name", "country_code", "phone_code"] },
  "address": { model: "address", searchFields: ["street", "landmark", "zipcode"] },
  "addresses": { model: "address", searchFields: ["street", "landmark", "zipcode"] },
  "image": { model: "image", searchFields: ["image_src"] },
  "images": { model: "image", searchFields: ["image_src"] },
  "question-banks": { model: "question_bank", searchFields: ["question_text", "chapter"] },
  "question-bank": { model: "question_bank", searchFields: ["question_text", "chapter"] },
  "questions": { model: "question_bank", searchFields: ["question_text", "chapter"] },
  "question": { model: "question_bank", searchFields: ["question_text", "chapter"] },
  "exam-papers": { model: "exam_paper", searchFields: ["title", "paper_code"] },
  "exam-paper": { model: "exam_paper", searchFields: ["title", "paper_code"] },
  "assessments": { model: "exam_paper", searchFields: ["title", "paper_code"] },
  "assessment": { model: "exam_paper", searchFields: ["title", "paper_code"] },
  "quizzes": { model: "quiz", searchFields: ["title", "description", "instructions"] },
  "quiz": { model: "quiz", searchFields: ["title", "description", "instructions"] },
  "quiz-questions": { model: "quiz_question", searchFields: ["question_text"] },
  "quiz-question": { model: "quiz_question", searchFields: ["question_text"] },
  "quiz-attempts": { model: "quiz_attempt", searchFields: ["result"] },
  "quiz-attempt": { model: "quiz_attempt", searchFields: ["result"] },
  "quiz-attempt-answers": { model: "quiz_attempt_answer", searchFields: [] },
  "quiz-attempt-answer": { model: "quiz_attempt_answer", searchFields: [] },
  "gift-claims": { model: "gift_claim", searchFields: ["gift_title", "claim_code", "remarks"] },
  "gift-claim": { model: "gift_claim", searchFields: ["gift_title", "claim_code", "remarks"] },
};

// ─── Resilient Quiz Database Helpers (with raw SQL fallbacks for dynamic client reload) ───
async function dbGetQuizQuestions(quizId: number): Promise<any[]> {
  try {
    if ((prisma as any).quiz_question?.findMany) {
      return await (prisma as any).quiz_question.findMany({
        where: { quiz_id: quizId },
        orderBy: { order_index: "asc" },
      });
    }
  } catch (err) {
    console.warn("Falling back to raw SQL for quiz_question findMany:", err);
  }
  return await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, quiz_id, question_bank_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, order_index
     FROM "public"."quiz_question"
     WHERE quiz_id = $1
     ORDER BY COALESCE(order_index, id) ASC`,
    quizId
  );
}

async function dbGetQuizAttempt(attemptId: number): Promise<any | null> {
  try {
    if ((prisma as any).quiz_attempt?.findUnique) {
      return await (prisma as any).quiz_attempt.findUnique({ where: { id: attemptId } });
    }
  } catch {}
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "public"."quiz_attempt" WHERE id = $1 LIMIT 1`,
    attemptId
  );
  return rows[0] || null;
}

async function dbGetQuizById(quizId: number): Promise<any | null> {
  try {
    if ((prisma as any).quiz?.findUnique) {
      return await (prisma as any).quiz.findUnique({ where: { id: quizId } });
    }
  } catch {}
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "public"."quiz" WHERE id = $1 LIMIT 1`,
    quizId
  );
  return rows[0] || null;
}

async function dbGetQuizAttemptAnswers(attemptId: number): Promise<any[]> {
  try {
    if ((prisma as any).quiz_attempt_answer?.findMany) {
      return await (prisma as any).quiz_attempt_answer.findMany({ where: { attempt_id: attemptId } });
    }
  } catch {}
  return await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "public"."quiz_attempt_answer" WHERE attempt_id = $1`,
    attemptId
  );
}

async function dbGetQuizAttempts(quizId: number): Promise<any[]> {
  try {
    if ((prisma as any).quiz_attempt?.findMany) {
      return await (prisma as any).quiz_attempt.findMany({
        where: { quiz_id: quizId },
        orderBy: { score: "desc" },
      });
    }
  } catch {}
  return await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "public"."quiz_attempt" WHERE quiz_id = $1 ORDER BY COALESCE(score, 0) DESC`,
    quizId
  );
}

async function handleGet(req: NextRequest, endpoint: string, params: string[]) {
  // Test endpoint
  if (endpoint === "test") {
    return new NextResponse("API Working Fine.", { status: 200 });
  }

  // ─── Student Profile (Public / Private Dual Resolver: Enrollment No or Student ID) ──
  if (endpoint === "student-profile" || endpoint.startsWith("student-profile/")) {
    try {
      const { searchParams } = new URL(req.url);
      let identifier = searchParams.get("identifier") || searchParams.get("id") || "";
      if (!identifier && endpoint.startsWith("student-profile/")) {
        identifier = endpoint.replace("student-profile/", "").trim();
      }
      const isPublic = searchParams.get("public") === "true";

      if (!identifier) {
        return NextResponse.json(Utility.formatResponse(400, "Identifier (enrollment number or student ID) is required"), { status: 400 });
      }

      const numId = parseInt(identifier, 10);
      const studentFilter: any[] = [];
      if (!isNaN(numId)) {
        studentFilter.push({ enrollment_no: numId });
        studentFilter.push({ id: numId });
      }

      const student = await prisma.student.findFirst({
        where: {
          OR: studentFilter.length > 0 ? studentFilter : [{ id: -1 }],
        },
      });

      if (!student) {
        return NextResponse.json(Utility.formatResponse(404, "Student not found"), { status: 404 });
      }

      // School info
      const school = student.school_id
        ? await prisma.school.findUnique({
            where: { id: student.school_id },
            select: {
              id: true,
              name: true,
              school_code: true,
              email: true,
              contact_no_1: true,
              contact_no_2: true,
              board: true,
              affiliation_no: true,
              principal: true,
              director: true,
            },
          })
        : null;

      const schoolAddr = school?.id ? await prisma.address.findFirst({
        where: { parent: "school" as any, parent_id: school.id },
      }) : null;

      // Class and Section
      const classRecord = student.class ? await prisma.school_class.findUnique({ where: { id: student.class } }) : null;
      const sectionRecord = student.section ? await prisma.section.findUnique({ where: { id: student.section } }) : null;

      // Student Image
      const studentImg = await prisma.image.findFirst({
        where: {
          parent: "student" as any,
          parent_id: student.id,
        },
        orderBy: { id: "desc" },
      });

      // Student Address
      const studentAddr = await prisma.address.findFirst({
        where: {
          OR: [
            { parent: "student" as any, parent_id: student.id },
            ...(student.parent_id ? [{ parent: "user" as any, parent_id: student.parent_id }] : []),
          ],
        },
        orderBy: { id: "desc" },
      });

      // City / State / Country names
      let cityName = "";
      let stateName = "";
      let countryName = "";
      if (studentAddr?.city) {
        const city = await prisma.city.findUnique({ where: { id: studentAddr.city } });
        if (city?.name) cityName = city.name;
      }
      if (studentAddr?.state) {
        const state = await prisma.state.findUnique({ where: { id: studentAddr.state } });
        if (state?.name) stateName = state.name;
      }
      if (studentAddr?.country) {
        const country = await prisma.country.findUnique({ where: { id: studentAddr.country } });
        if (country?.name) countryName = country.name;
      }

      // Attendance statistics
      const attendanceRows = await prisma.attendance.findMany({
        where: {
          parent: "student" as any,
          parent_id: student.id,
        },
        select: {
          id: true,
          status: true,
          date: true,
          remark: true,
        },
        orderBy: { date: "desc" },
      });

      const totalAttendance = attendanceRows.length;
      const presentCount = attendanceRows.filter((a) => String(a.status).toLowerCase() === "present").length;
      const lateCount = attendanceRows.filter((a) => String(a.status).toLowerCase() === "late").length;
      const absentCount = attendanceRows.filter((a) => String(a.status).toLowerCase() === "absent").length;
      const halfDayCount = attendanceRows.filter((a) => String(a.status).toLowerCase() === "halfday" || String(a.status).toLowerCase() === "half_day").length;
      const attendancePercentage = totalAttendance > 0 ? Number(((presentCount / totalAttendance) * 100).toFixed(1)) : 100.0;

      // Marksheets
      const marksheets = await prisma.marksheet.findMany({
        where: {
          student_id: student.id,
        },
        orderBy: { id: "desc" },
        take: 5,
      });

      // Latest Payment
      const latestPayment = await prisma.payment.findFirst({
        where: {
          student_id: student.id,
        },
        orderBy: { id: "desc" },
      });

      let paymentMethodName = "Digital / Bank";
      if (latestPayment?.method) {
        const pMethod = await prisma.payment_method.findUnique({ where: { id: latestPayment.method } });
        if (pMethod?.name) paymentMethodName = pMethod.name;
      }

      // House name and color lookup from school_house table
      let houseName = "";
      let houseColorCode: string | null = null;
      if (student.house) {
        const houseId = parseInt(String(student.house), 10);
        if (!isNaN(houseId)) {
          const houseRec = await prisma.school_house.findUnique({ where: { id: houseId } });
          if (houseRec?.name) houseName = houseRec.name;
          if (houseRec?.color_code) houseColorCode = houseRec.color_code.trim();
        }
        if (!houseName) houseName = String(student.house);
        if (!houseColorCode) {
          const houseRecByName = await prisma.school_house.findFirst({
            where: {
              name: { equals: houseName, mode: "insensitive" },
              ...(student.school_id ? { school_id: student.school_id } : {}),
            },
          });
          if (houseRecByName?.color_code) {
            houseColorCode = houseRecByName.color_code.trim();
          }
        }
      }

      // Timetable
      let timetableSlots: any[] = [];
      if (student.class && student.section) {
        const schoolFilter = student.school_id
          ? Prisma.sql`AND tt.school_id = ${student.school_id}`
          : Prisma.sql``;

        timetableSlots = await prisma.$queryRaw<any[]>(Prisma.sql`
          SELECT
            tt.id,
            tt.day::text AS day,
            tt.period,
            tt.duration,
            tt.batch,
            sub.name AS subject_name
          FROM timetable tt
          LEFT JOIN subject sub ON sub.id = tt.subject_id
          WHERE tt.class_id = ${student.class}
            AND tt.section_id = ${student.section}
            ${schoolFilter}
          ORDER BY
            CASE LOWER(tt.day::text)
              WHEN 'monday' THEN 1
              WHEN 'tuesday' THEN 2
              WHEN 'wednesday' THEN 3
              WHEN 'thursday' THEN 4
              WHEN 'friday' THEN 5
              WHEN 'saturday' THEN 6
              WHEN 'sunday' THEN 7
              ELSE 8
            END ASC,
            tt.period ASC
          LIMIT 100
        `);
      }

      const maskPhone = (phone: any) => {
        if (!phone) return null;
        const str = String(phone);
        if (str.length <= 4) return "••••";
        return str.slice(0, 2) + "••••••" + str.slice(-2);
      };

      const payload = {
        id: student.id,
        enrollment_no: student.enrollment_no,
        roll_no: student.roll_no,
        firstname: student.firstname,
        lastname: student.lastname,
        fullName: `${student.firstname || ""} ${student.lastname || ""}`.trim(),
        dob: student.dob,
        gender: student.gender,
        blood_group: student.blood_group,
        religion: student.religion,
        nationality: student.nationality,
        aadhaar_no: student.aadhaar_no ? (isPublic ? "••••••••" + String(student.aadhaar_no).slice(-4) : String(student.aadhaar_no)) : null,
        birth_mark: student.birth_mark,
        caste_group: student.caste_group,
        admission_type: student.admission_type || "regular",
        is_specially_abled: Boolean(student.is_specially_abled),
        is_taking_bus: Boolean(student.is_taking_bus),
        is_fee_waiver: Boolean(student.is_fee_waiver),
        fee_waiver_type: student.fee_waiver_type,
        waived_fees: student.waived_fees ? Number(student.waived_fees) : 0,
        session: student.session || "2025-2026",
        admission_date: student.admission_date || student.created_at,
        class_id: student.class,
        class_name: classRecord?.name || "V",
        section_id: student.section,
        section_name: sectionRecord?.name || "A",
        house: houseName || "Yellow House",
        house_name: houseName || "Yellow House",
        house_color: houseColorCode || null,
        house_color_code: houseColorCode || null,
        photo_url: studentImg?.image_src || null,
        school: school ? {
          id: school.id,
          name: school.name,
          school_code: school.school_code,
          email: school.email,
          contact_no: school.contact_no_1 || school.contact_no_2,
          address: schoolAddr?.street || "Main Campus Road",
          city: cityName || "New Delhi",
          state: stateName || "Delhi",
          affiliation: school.affiliation_no ? `${school.board || "CBSE"} Affiliated • ${school.affiliation_no}` : (school.board || "CBSE Affiliated"),
          principal: school.principal,
          director: school.director,
        } : null,
        address: studentAddr ? {
          street: isPublic ? "••••••••••••••" : studentAddr.street,
          landmark: isPublic ? null : studentAddr.landmark,
          city: cityName || "New Delhi",
          state: stateName || "Delhi",
          country: countryName || "India",
          zipcode: isPublic ? "••••••" : studentAddr.zipcode,
        } : null,
        parents: {
          father_name: student.father_name,
          father_contact_no: student.father_contact_no ? (isPublic ? maskPhone(student.father_contact_no) : String(student.father_contact_no).split('.')[0]) : null,
          father_aadhar: student.father_aadhar ? (isPublic ? "••••••••" + String(student.father_aadhar).split('.')[0].slice(-4) : String(student.father_aadhar).split('.')[0]) : null,
          mother_name: student.mother_name,
          mother_contact_no: student.mother_contact_no ? (isPublic ? maskPhone(student.mother_contact_no) : String(student.mother_contact_no).split('.')[0]) : null,
          mother_aadhar: student.mother_aadhar ? (isPublic ? "••••••••" + String(student.mother_aadhar).split('.')[0].slice(-4) : String(student.mother_aadhar).split('.')[0]) : null,
          guardian_name: student.guardian_name,
          guardian_contact_no: student.guardian_contact_no ? (isPublic ? maskPhone(student.guardian_contact_no) : String(student.guardian_contact_no).split('.')[0]) : null,
          guardian_aadhar: student.guardian_aadhar ? (isPublic ? "••••••••" + String(student.guardian_aadhar).split('.')[0].slice(-4) : String(student.guardian_aadhar).split('.')[0]) : null,
        },
        contact_no: student.contact_no ? (isPublic ? maskPhone(student.contact_no) : String(student.contact_no)) : null,
        email: isPublic ? (student.email ? student.email.replace(/(.{2})(.*)(?=@)/, "$1****") : null) : student.email,
        attendance: {
          total: totalAttendance,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          halfday: halfDayCount,
          percentage: attendancePercentage,
          recent: attendanceRows.slice(0, 10),
        },
        marksheets: marksheets.map((m) => ({
          id: m.id,
          term: m.term,
          session: m.session,
          result: m.result,
          co_scholastic_data: m.co_scholastic_data,
          discipline_data: m.discipline_data,
          overall_remark: m.overall_remark,
          created_at: m.created_at,
        })),
        payment: latestPayment ? {
          id: latestPayment.id,
          type: latestPayment.type,
          type_duration: latestPayment.type_duration,
          amount: isPublic ? "PAID / VERIFIED" : Number(latestPayment.final_amount || latestPayment.amount || 0),
          academic_year: latestPayment.academic_year,
          paid_date: latestPayment.created_at,
          status: latestPayment.status || "Paid",
          reference_no: isPublic ? "REF••••••••" : (latestPayment.reference_no || `REC-${latestPayment.id}`),
          method: paymentMethodName,
        } : null,
        timetable: timetableSlots.map((tt) => ({
          id: tt.id,
          day: tt.day,
          period: tt.period,
          duration: tt.duration,
          subject: tt.subject_name || "Subject",
          batch: tt.batch,
        })),
        isPublic,
      };

      return NextResponse.json(Utility.formatResponse(200, payload), { status: 200 });
    } catch (err: any) {
      console.error("student-profile error:", err);
      return NextResponse.json({ status: 500, message: String(err?.message || err) }, { status: 200 });
    }
  }

  // ─── School Profile (Public / Private Dual Resolver: School Code or School ID) ──
  if (endpoint === "school-profile" || endpoint.startsWith("school-profile/")) {
    try {
      const { searchParams } = new URL(req.url);
      let identifier = searchParams.get("identifier") || searchParams.get("id") || "";
      if (!identifier && endpoint.startsWith("school-profile/")) {
        identifier = endpoint.replace("school-profile/", "").trim();
      }
      const isPublic = searchParams.get("public") === "true";

      // If no identifier provided and not public, check auth token
      if (!identifier && !isPublic) {
        const authHeader = req.headers.get("x-access-token") || req.headers.get("authorization");
        if (authHeader) {
          const verified = Utility.verifyTokenString(authHeader as string);
          if (verified && (verified as any).id) {
            const user = await prisma.user.findUnique({
              where: { id: (verified as any).id },
              select: { school_id: true }
            });
            if (user?.school_id) {
              identifier = String(user.school_id);
            }
          }
        }
      }

      if (!identifier) {
        // Fallback: pick the first school
        const firstSchool = await prisma.school.findFirst();
        if (firstSchool) {
          identifier = String(firstSchool.id);
        } else {
          return NextResponse.json(Utility.formatResponse(400, "Identifier (school code or school ID) is required"), { status: 400 });
        }
      }

      const numId = parseInt(identifier, 10);
      const schoolFilter: any[] = [];
      schoolFilter.push({ school_code: identifier });
      if (!isNaN(numId)) {
        schoolFilter.push({ id: numId });
      }

      let school = await prisma.school.findFirst({
        where: {
          OR: schoolFilter,
        },
      });

      if (!school) {
        school = await prisma.school.findFirst();
      }

      if (!school) {
        return NextResponse.json(Utility.formatResponse(404, "School not found"), { status: 404 });
      }

      // School Address
      const schoolAddr = await prisma.address.findFirst({
        where: { parent: "school" as any, parent_id: school.id },
      });

      // City & State details if available
      let cityName = "Bareilly";
      let stateName = "Uttar Pradesh";
      let countryName = "India";
      if (schoolAddr?.city) {
        const cityObj = await prisma.city.findUnique({ where: { id: schoolAddr.city } }).catch(() => null);
        if (cityObj?.name) cityName = cityObj.name;
      }
      if (schoolAddr?.state) {
        const stateObj = await prisma.state.findUnique({ where: { id: schoolAddr.state } }).catch(() => null);
        if (stateObj?.name) stateName = stateObj.name;
      }
      if (schoolAddr?.country) {
        const countryObj = await prisma.country.findUnique({ where: { id: schoolAddr.country } }).catch(() => null);
        if (countryObj?.name) countryName = countryObj.name;
      }

      // Images (logo / display & banner)
      const schoolLogo = await prisma.image.findFirst({
        where: { parent: "school" as any, parent_id: school.id, type: "display" as any },
        orderBy: { id: "desc" },
      });
      const schoolBanner = await prisma.image.findFirst({
        where: { parent: "school" as any, parent_id: school.id, type: "banner" as any },
        orderBy: { id: "desc" },
      });

      // Counts
      const totalStudents = await prisma.student.count({ where: { school_id: school.id } });
      const totalTeachers = await prisma.teacher.count({ where: { school_id: school.id } });
      const totalBuses = await prisma.bus.count({ where: { school_id: school.id } });

      // Classes offered
      const schoolClasses = await prisma.school_class.findMany({
        where: { status: "active" as any },
        select: {
          id: true,
          name: true,
        },
        orderBy: { id: "asc" },
      });

      // Sections
      const sections = await prisma.section.findMany({
        where: { status: "active" as any },
        select: {
          id: true,
          name: true,
        },
      });

      // Amenities parsing
      let amenitiesList: any[] = [];
      if (school.amenities) {
        const amenityIds = school.amenities.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        if (amenityIds.length > 0) {
          amenitiesList = await prisma.amenity.findMany({
            where: { id: { in: amenityIds } },
          });
        }
      }
      if (amenitiesList.length === 0) {
        amenitiesList = await prisma.amenity.findMany({
          take: 12,
        });
      }

      // Houses
      const houses = await prisma.school_house.findMany({
        where: { school_id: school.id },
      });

      const payload = {
        ...school,
        fullName: school.name || "Delhi Public School",
        address: schoolAddr ? {
          ...schoolAddr,
          cityName,
          stateName,
          countryName,
        } : {
          street: "846, MG Road",
          city: cityName,
          cityName,
          state: stateName,
          stateName,
          country: countryName,
          countryName,
          zipcode: "243001",
        },
        logo_url: schoolLogo?.image_src || null,
        banner_url: schoolBanner?.image_src || null,
        stats: {
          totalStudents: totalStudents || 1240,
          totalTeachers: totalTeachers || 68,
          totalBuses: totalBuses || 14,
          totalClasses: schoolClasses.length || 14,
          capacity: school.capacity || 2500,
          boardingCapacity: school.boarding_capacity || 350,
          ratio: "18:1",
        },
        classes: schoolClasses.map(c => ({
          ...c,
          sections: sections,
        })),
        amenitiesList,
        houses,
        isPublic,
      };

      return NextResponse.json(Utility.formatResponse(200, payload), { status: 200 });
    } catch (err: any) {
      console.error("school-profile error:", err);
      return NextResponse.json({ status: 500, message: String(err?.message || err) }, { status: 200 });
    }
  }

  // Verify Token
  if (endpoint === "verify-token") {
    const authHeader = req.headers.get("x-access-token") || req.headers.get("authorization");
    const payload = Utility.verifyTokenString(authHeader as string);
    if (!payload) return NextResponse.json(Utility.formatResponse(401, "Unauthorized"), { status: 401 });
    return NextResponse.json(Utility.formatResponse(200, "Verified"), { status: 200 });
  }

  // Countries list
  if (endpoint === "get-countries" || endpoint === "countries") {
    try {
      const countries = await prisma.country.findMany({
        orderBy: { id: "asc" }
      });
      return NextResponse.json(Utility.formatResponse(200, { list: countries, rows: countries, count: countries.length }), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // States list (by country parent_id, or all states)
  if (endpoint.startsWith("get-states/") || endpoint === "get-states" || endpoint === "get-all-states" || endpoint === "states" || endpoint === "all-states") {
    try {
      let parentId = params[1] || "";
      if (endpoint.startsWith("get-states/")) {
        parentId = endpoint.replace("get-states/", "");
      }
      
      if (parentId && parentId !== "null" && parentId !== "undefined" && parentId !== "0" && parentId !== "all") {
        const states = await prisma.state.findMany({
          where: { country_id: String(parentId) },
          orderBy: { name: "asc" }
        });
        return NextResponse.json(Utility.formatResponse(200, { list: states, rows: states, count: states.length }), { status: 200 });
      } else if (parentId === "null" || parentId === "undefined" || parentId === "0") {
        return NextResponse.json(Utility.formatResponse(200, { list: [], rows: [], count: 0 }), { status: 200 });
      } else {
        const states = await prisma.state.findMany({
          orderBy: { name: "asc" }
        });
        return NextResponse.json(Utility.formatResponse(200, { list: states, rows: states, count: states.length }), { status: 200 });
      }
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // State ID by name
  if (endpoint.startsWith("get-state-by-name/")) {
    try {
      const name = decodeURIComponent(endpoint.replace("get-state-by-name/", "")).trim();
      const state = await prisma.state.findFirst({
        where: { name: { equals: name, mode: "insensitive" } }
      });
      return NextResponse.json(Utility.formatResponse(200, state ? state.id : null), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Cities list (by state parent_id, or all cities)
  if (endpoint.startsWith("get-cities/") || endpoint === "get-cities" || endpoint === "get-all-cities" || endpoint === "cities" || endpoint === "all-cities") {
    try {
      let parentId = params[1] || "";
      if (endpoint.startsWith("get-cities/")) {
        parentId = endpoint.replace("get-cities/", "");
      }

      if (parentId && parentId !== "null" && parentId !== "undefined" && parentId !== "0" && parentId !== "all") {
        const cities = await prisma.city.findMany({
          where: { state_id: String(parentId) },
          orderBy: { name: "asc" }
        });
        return NextResponse.json(Utility.formatResponse(200, { list: cities, rows: cities, count: cities.length }), { status: 200 });
      } else if (parentId === "null" || parentId === "undefined" || parentId === "0") {
        return NextResponse.json(Utility.formatResponse(200, { list: [], rows: [], count: 0 }), { status: 200 });
      } else {
        const cities = await prisma.city.findMany({
          orderBy: { name: "asc" }
        });
        return NextResponse.json(Utility.formatResponse(200, { list: cities, rows: cities, count: cities.length }), { status: 200 });
      }
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // City ID by name
  if (endpoint.startsWith("get-city-by-name/")) {
    try {
      const name = decodeURIComponent(endpoint.replace("get-city-by-name/", "")).trim();
      const city = await prisma.city.findFirst({
        where: { name: { equals: name, mode: "insensitive" } }
      });
      return NextResponse.json(Utility.formatResponse(200, city ? city.id : null), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Address by parent and parent_id (e.g., get-address/student/265)
  if (endpoint.startsWith("get-address/")) {
    try {
      const parts = endpoint.split("/");
      const parent = parts[1];
      const parentId = parts[2];
      if (!parentId || parentId === "null" || parentId === "undefined" || parentId === "0") {
        return NextResponse.json(Utility.formatResponse(200, null), { status: 200 });
      }
      const address = await prisma.address.findFirst({
        where: { parent: parent as any, parent_id: parseInt(parentId, 10) },
        orderBy: { id: "desc" }
      });
      return NextResponse.json(Utility.formatResponse(200, address || null), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Image by parent and parent_id (e.g., get-image/student/265)
  if (endpoint.startsWith("get-image/")) {
    try {
      const parts = endpoint.split("/");
      const parent = parts[1];
      const parentId = parts[2];
      if (!parentId || parentId === "null" || parentId === "undefined" || parentId === "0") {
        return NextResponse.json(Utility.formatResponse(200, null), { status: 200 });
      }
      const isSchool = parent === "school";
      const images = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, school_id, parent::text, parent_id, priority, type::text, image_src, created_at, updated_at, created_by, updated_by
         FROM "public"."image"
         WHERE "parent" = CAST($1::text AS "public"."ImageParent") AND "parent_id" = $2
         ORDER BY priority ASC, id DESC` + (isSchool ? "" : " LIMIT 1"),
        parent,
        parseInt(parentId, 10)
      );
      if (isSchool) {
        return NextResponse.json(Utility.formatResponse(200, images), { status: 200 });
      }
      const image = images[0] || null;
      return NextResponse.json(Utility.formatResponse(200, image), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Dashboard counts
  if (endpoint.startsWith("get-dashboard-count/") || endpoint === "get-dashboard-count") {
    const table = params[1] || endpoint.replace("get-dashboard-count/", "");
    const modelName = table === "school_class" ? "school_class" : table;
    try {
      const count = await (prisma as any)[modelName]?.count() || 0;
      return NextResponse.json(Utility.formatResponse(200, count), { status: 200 });
    } catch {
      return NextResponse.json(Utility.formatResponse(200, 0), { status: 200 });
    }
  }

  // Dashboard student graph data
  if (endpoint === "get-student-graph-data") {
    try {
      const data = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          CONCAT(cs.name) AS class_name, 
          COUNT(*) AS total_students,
          CAST((COUNT(CASE WHEN result = 'pass' THEN 1 END)::float / COUNT(*)) * 100 AS INTEGER) AS passing_percentage
        FROM marksheet
        JOIN class cs ON marksheet.class_id = cs.id
        GROUP BY marksheet.class_id, cs.name
      `);
      return NextResponse.json(Utility.formatResponse(200, data), { status: 200 });
    } catch {
      return NextResponse.json(Utility.formatResponse(200, []), { status: 200 });
    }
  }

  // School Classes mapping list
  if (endpoint === "get-school-classes" || endpoint === "get-teacher-classes") {
    try {
      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const { searchParams } = new URL(req.url);
      const schoolId = searchParams.get("school_id")
        ? parseInt(searchParams.get("school_id")!)
        : (schoolCond.school_id ? parseInt(String(schoolCond.school_id)) : undefined);

      const where = schoolId ? Prisma.sql`WHERE scd.school_id = ${schoolId}` : Prisma.empty;
      const data = await prisma.$queryRaw`
        SELECT scd.id, scd.class_fee, scd.class_capacity, scd.late_fee, scd.late_fee_duration, scd.subject_ids,
               cl.id AS class_id, cl.name AS class_name,
               se.id AS section_id, se.name AS section_name
        FROM school_class_data scd
        LEFT JOIN class cl ON cl.id = scd.class_id
        LEFT JOIN section se ON se.id = scd.section_id
        ${where}
      `;
      return NextResponse.json(Utility.formatResponse(200, data), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Teacher detail by ID
  if (endpoint.startsWith("get-teacher-detail/")) {
    try {
      const teacherId = parseInt(endpoint.replace("get-teacher-detail/", ""), 10);
      const data = await prisma.$queryRaw`
        SELECT tcss.subject_ids, cl.id AS class_id, cl.name AS class_name, 
               se.id AS section_id, se.name AS section_name
        FROM teacher_class_section_subject tcss
        LEFT JOIN class cl ON cl.id = tcss.class_id
        LEFT JOIN section se ON se.id = tcss.section_id
        WHERE tcss.teacher_id = ${teacherId}
      `;
      return NextResponse.json(Utility.formatResponse(200, data), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Marksheet data by ID
  if (endpoint.startsWith("get-marksheet-data/")) {
    try {
      const marksheetId = parseInt(endpoint.replace("get-marksheet-data/", ""), 10);
      const data = await prisma.marksheet_data.findMany({
        where: { marksheet_id: marksheetId },
        orderBy: { subject_id: "asc" },
      });
      const formattedData = (data || []).map((row: any) => ({
        ...row,
        marks_obtained: row.marks,
        total_marks: row.max_marks,
      }));
      return NextResponse.json(Utility.formatResponse(200, formattedData), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Payment data by class and section (e.g., get-payment-data/5/2)
  if (endpoint.startsWith("get-payment-data/")) {
    try {
      const parts = endpoint.split("/");
      const cId = parseInt(parts[1], 10);
      const sId = parseInt(parts[2], 10);
      if (isNaN(cId) || isNaN(sId)) {
        return NextResponse.json(Utility.formatResponse(400, "Invalid classId or sectionId"), { status: 400 });
      }

      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = schoolCond.school_id ? parseInt(String(schoolCond.school_id)) : undefined;

      const school = schoolId ? await prisma.school.findFirst({
        where: { id: schoolId },
        select: {
          id: true,
          session_start: true,
          payment_date: true,
          payment_methods: true,
        },
      }) : await prisma.school.findFirst({
        select: {
          id: true,
          session_start: true,
          payment_date: true,
          payment_methods: true,
        },
      });

      const classDataFilter: Record<string, unknown> = {
        class_id: cId,
        section_id: sId,
      };
      if (schoolId) classDataFilter.school_id = schoolId;

      const classData = await prisma.school_class_data.findFirst({
        where: classDataFilter,
        select: {
          class_fee: true,
          late_fee: true,
          late_fee_duration: true,
        },
      });

      let methodNames: string[] = [];
      if (school?.payment_methods) {
        const methodIds = school.payment_methods
          .split(",")
          .map((id: string) => parseInt(id.trim(), 10))
          .filter((id: number) => !isNaN(id));

        if (methodIds.length > 0) {
          const methods = await prisma.payment_method.findMany({
            where: { id: { in: methodIds } },
            select: { name: true },
          });
          methodNames = methods.map((m: { name: string | null }) => m.name ?? "").filter(Boolean);
        }
      }

      const result = {
        id: school?.id || 1,
        session_start: school?.session_start,
        payment_date: school?.payment_date,
        payment_methods: school?.payment_methods,
        class_fee: classData?.class_fee ?? 0,
        classLateFee: classData?.late_fee ?? 0,
        late_fee_duration: classData?.late_fee_duration ?? "monthly",
        methodName: methodNames.join(", "),
      };

      return NextResponse.json(Utility.formatResponse(200, [result]), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Search Parents for Sibling Linking
  if (endpoint === "search-parents") {
    try {
      const { searchParams } = new URL(req.url);
      const search = (searchParams.get("search") || searchParams.get("q") || "").trim();
      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = schoolCond.school_id ? parseInt(String(schoolCond.school_id), 10) : null;

      if (!search || search.length < 2) {
        return NextResponse.json(Utility.formatResponse(200, []), { status: 200 });
      }

      const searchWild = `%${search}%`;
      const schoolClause = schoolId ? Prisma.sql`AND s.school_id = ${schoolId}` : Prisma.sql``;

      // 1. Find existing students and their parent user info
      const matchedStudents = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          s.id AS student_id,
          s.parent_id,
          s.firstname,
          s.lastname,
          s.roll_no,
          s.father_name,
          s.father_contact_no,
          s.father_aadhar,
          s.mother_name,
          s.mother_contact_no,
          s.mother_aadhar,
          s.guardian_name,
          s.guardian_contact_no,
          s.guardian_aadhar,
          s.contact_no,
          s.email,
          cl.name AS class_name,
          sec.name AS section_name,
          u.username AS parent_username,
          u.email AS parent_user_email,
          u.contact_no AS parent_user_contact
        FROM student s
        LEFT JOIN "user" u ON u.id = s.parent_id
        LEFT JOIN class cl ON cl.id = s.class
        LEFT JOIN section sec ON sec.id = s.section
        WHERE s.parent_id IS NOT NULL
          ${schoolClause}
          AND (
            s.father_name ILIKE ${searchWild} OR
            s.mother_name ILIKE ${searchWild} OR
            s.guardian_name ILIKE ${searchWild} OR
            s.contact_no ILIKE ${searchWild} OR
            CAST(s.father_contact_no AS TEXT) ILIKE ${searchWild} OR
            CAST(s.mother_contact_no AS TEXT) ILIKE ${searchWild} OR
            CAST(s.father_aadhar AS TEXT) ILIKE ${searchWild} OR
            CAST(s.mother_aadhar AS TEXT) ILIKE ${searchWild} OR
            u.contact_no ILIKE ${searchWild} OR
            u.username ILIKE ${searchWild} OR
            u.email ILIKE ${searchWild} OR
            s.firstname ILIKE ${searchWild} OR
            s.lastname ILIKE ${searchWild}
          )
        ORDER BY s.updated_at DESC
        LIMIT 50
      `);

      // 2. Group by parent_id
      const parentMap = new Map<number, any>();
      for (const row of matchedStudents) {
        const pid = Number(row.parent_id);
        if (!parentMap.has(pid)) {
          parentMap.set(pid, {
            parent_id: pid,
            father_name: row.father_name || "",
            father_contact_no: row.father_contact_no ? String(row.father_contact_no) : "",
            father_aadhar: row.father_aadhar ? String(row.father_aadhar) : "",
            mother_name: row.mother_name || "",
            mother_contact_no: row.mother_contact_no ? String(row.mother_contact_no) : "",
            mother_aadhar: row.mother_aadhar ? String(row.mother_aadhar) : "",
            guardian_name: row.guardian_name || "",
            guardian_contact_no: row.guardian_contact_no ? String(row.guardian_contact_no) : "",
            guardian_aadhar: row.guardian_aadhar ? String(row.guardian_aadhar) : "",
            contact_no: row.contact_no || row.parent_user_contact || "",
            email: row.email || row.parent_user_email || "",
            parent_username: row.parent_username || "",
            student_ids: [row.student_id],
            children: []
          });
        } else {
          const existing = parentMap.get(pid);
          if (!existing.student_ids.includes(row.student_id)) {
            existing.student_ids.push(row.student_id);
          }
        }
        const parentEntry = parentMap.get(pid);
        parentEntry.children.push({
          id: row.student_id,
          name: `${row.firstname || ""} ${row.lastname || ""}`.trim(),
          class_name: row.class_name || "",
          section_name: row.section_name || "",
          roll_no: row.roll_no || null
        });
      }

      // 3. Also include parent users (role 5) matching the search if not already grouped
      const matchedUsers = await prisma.user.findMany({
        where: {
          role: 5,
          status: "active",
          ...(schoolId ? { school_id: schoolId } : {}),
          OR: [
            { username: { contains: search, mode: "insensitive" } },
            { contact_no: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ]
        },
        take: 20
      });

      for (const u of matchedUsers) {
        if (!parentMap.has(u.id)) {
          parentMap.set(u.id, {
            parent_id: u.id,
            father_name: u.username || "",
            father_contact_no: u.contact_no || "",
            father_aadhar: "",
            mother_name: "",
            mother_contact_no: "",
            mother_aadhar: "",
            guardian_name: "",
            guardian_contact_no: "",
            guardian_aadhar: "",
            contact_no: u.contact_no || "",
            email: u.email || "",
            parent_username: u.username || "",
            student_ids: [],
            children: []
          });
        }
      }

      const parentList = Array.from(parentMap.values());
      const parentIds = parentList.map(p => p.parent_id);
      const allStudentIds = parentList.flatMap(p => p.student_ids);

      // 4. Attach address if available
      if (parentIds.length > 0) {
        const addresses = await prisma.address.findMany({
          where: {
            OR: [
              { parent: "user" as any, parent_id: { in: parentIds } },
              ...(allStudentIds.length > 0 ? [{ parent: "student" as any, parent_id: { in: allStudentIds } }] : [])
            ]
          },
          orderBy: { updated_at: "desc" }
        });

        for (const p of parentList) {
          const addr = addresses.find(a => 
            (a.parent === "user" && a.parent_id === p.parent_id) ||
            (a.parent === "student" && p.student_ids.includes(a.parent_id!))
          );
          p.address = addr ? {
            street: addr.street || "",
            landmark: addr.landmark || "",
            zipcode: addr.zipcode || "",
            city: addr.city || 0,
            state: addr.state || 0,
            country: addr.country || 1
          } : null;
        }
      }

      return NextResponse.json(Utility.formatResponse(200, parentList), { status: 200 });
    } catch (err) {
      console.error("Error in search-parents:", err);
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // ICard Details
  if (endpoint === "get-icard-details") {
    try {
      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = schoolCond.school_id ? parseInt(String(schoolCond.school_id)) : undefined;
      const data = await prisma.school.findFirst({
        where: schoolId ? { id: schoolId } : {},
        select: { id: true, name: true, contact_no_1: true, email: true, board: true },
      });
      return NextResponse.json(Utility.formatResponse(200, data), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Generic get-by-pk handler
  if (endpoint.startsWith("get-by-pk/")) {
    try {
      const parts = endpoint.split("/");
      const table = parts[1];
      const id = parts[2];
      const modelName = Utility.getPrismaModelName(table) || table;
      if (!modelName) {
        return NextResponse.json(Utility.formatResponse(400, "Invalid table"), { status: 400 });
      }
      const model = (prisma as any)[modelName];
      let data = null;
      if (model?.findUnique) {
        data = await model.findUnique({ where: { id: parseInt(id) } });
      } else {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "public"."${modelName}" WHERE id = $1 LIMIT 1`,
          parseInt(id)
        );
        data = rows[0] || null;
      }
      if (!data) {
        return NextResponse.json(Utility.formatResponse(404, "Data Not Found"), { status: 404 });
      }

      if (table === "student" && data) {
        // 1. Resolve House Name
        if (data.house) {
          const houseId = parseInt(String(data.house), 10);
          if (!isNaN(houseId)) {
            const houseRecord = await prisma.school_house.findUnique({
              where: { id: houseId },
              select: { name: true, color_code: true },
            });
            if (houseRecord) {
              data.house_name = houseRecord.name;
              data.house_color = houseRecord.color_code;
            }
          }
        }

        // 2. Resolve Subjects if string of IDs or fallback to school_class_data
        let subjectIdsList: number[] = [];
        if (typeof data.subjects === "string" && data.subjects.trim()) {
          subjectIdsList = data.subjects
            .split(",")
            .map((s: string) => parseInt(s.trim(), 10))
            .filter((n: number) => !isNaN(n));
        } else if (Array.isArray(data.subjects)) {
          subjectIdsList = data.subjects
            .map((s: any) => (typeof s === "object" ? (s.id ?? s.subject_id) : parseInt(String(s), 10)))
            .filter((n: number) => !isNaN(n));
        }

        if (subjectIdsList.length === 0 && data.class && data.section) {
          const classSectionData = await prisma.school_class_data.findFirst({
            where: {
              class_id: data.class,
              section_id: data.section,
              ...(data.school_id ? { school_id: data.school_id } : {}),
            },
            select: { subject_ids: true },
          });
          if (classSectionData?.subject_ids) {
            subjectIdsList = classSectionData.subject_ids
              .split(",")
              .map((s: string) => parseInt(s.trim(), 10))
              .filter((n: number) => !isNaN(n));
          }
        }

        if (subjectIdsList.length > 0) {
          const subjects = await prisma.subject.findMany({
            where: { id: { in: subjectIdsList } },
            select: { id: true, name: true },
          });
          data.resolved_subjects = subjects;
          data.subjects_display = subjects.map((s: any) => s.name).join(", ");
        }
      }

      if ((table === "school_house" || table === "school-house") && data) {
        const houseIdStr = String(data.id);
        const [captainStudent, viceCaptainStudent, teacherIncharge, houseMembers] = await Promise.all([
          data.captain ? prisma.student.findUnique({
            where: { id: Number(data.captain) },
            select: { id: true, firstname: true, lastname: true, roll_no: true, enrollment_no: true, class: true, section: true, contact_no: true, email: true, gender: true }
          }) : null,
          data.vice_captain ? prisma.student.findUnique({
            where: { id: Number(data.vice_captain) },
            select: { id: true, firstname: true, lastname: true, roll_no: true, enrollment_no: true, class: true, section: true, contact_no: true, email: true, gender: true }
          }) : null,
          data.teacher_incharge ? prisma.teacher.findUnique({
            where: { id: Number(data.teacher_incharge) },
            select: { id: true, firstname: true, lastname: true, email: true, contact_no: true, qualification: true, grade: true, gender: true }
          }) : null,
          prisma.student.findMany({
            where: { house: houseIdStr },
            select: { id: true, firstname: true, lastname: true, roll_no: true, enrollment_no: true, class: true, section: true, gender: true },
            take: 50,
            orderBy: { id: "asc" }
          })
        ]);

        data.captain_details = captainStudent;
        data.vice_captain_details = viceCaptainStudent;
        data.teacher_details = teacherIncharge;
        data.student_members = houseMembers;
        data.actual_strength = houseMembers?.length || 0;
      }

      return NextResponse.json(Utility.formatResponse(200, data), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Enriched teacher listing with JOINed class, section, subject names
  if (endpoint === "get-teachers") {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") || "0");
      const size = parseInt(searchParams.get("size") || "10");
      const search = (searchParams.get("search") || "").trim();
      const { limit, offset } = Utility.getPagination(page, size);
      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = schoolCond.school_id ? parseInt(String(schoolCond.school_id)) : null;

      const searchWild = `%${search}%`;
      const schoolClause = schoolId ? Prisma.sql`AND t.school_id = ${schoolId}` : Prisma.sql``;
      const searchClause = search
        ? Prisma.sql`AND (t.firstname ILIKE ${searchWild} OR t.lastname ILIKE ${searchWild} OR t.email ILIKE ${searchWild} OR t.status ILIKE ${searchWild})`
        : Prisma.sql``;

      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          t.id,
          t.school_id,
          t.firstname,
          t.lastname,
          CONCAT(t.firstname, ' ', COALESCE(t.lastname, '')) AS "teacherName",
          t.email,
          t.contact_no,
          t.gender,
          t.grade,
          t.qualification,
          t.is_class_teacher,
          t.status,
          t.created_at,
          t.updated_at,

          CASE
            WHEN t.is_class_teacher = true THEN
              CONCAT(COALESCE(ct_cls.name, ''), '-', COALESCE(ct_sec.name, ''))
            ELSE NULL
          END AS class_section_name,

          (
            SELECT STRING_AGG(DISTINCT CONCAT(mc.name, '-', ms.name), ',' ORDER BY CONCAT(mc.name, '-', ms.name))
            FROM teacher_class_section_subject tcss
            JOIN class mc ON mc.id = tcss.class_id
            JOIN section ms ON ms.id = tcss.section_id
            WHERE tcss.teacher_id = t.id AND tcss.school_id = t.school_id
          ) AS classnames,

          (
            SELECT STRING_AGG(DISTINCT sub.name, ',' ORDER BY sub.name)
            FROM teacher_class_section_subject tcss2
            JOIN subject sub ON sub.id = ANY(string_to_array(tcss2.subject_ids, ',')::int[])
            WHERE tcss2.teacher_id = t.id AND tcss2.school_id = t.school_id
          ) AS subjects,

          COUNT(*) OVER() AS count

        FROM teacher t
        LEFT JOIN class   ct_cls ON ct_cls.id = t.class
        LEFT JOIN section ct_sec ON ct_sec.id = t.section

        WHERE 1=1
          ${schoolClause}
          ${searchClause}

        ORDER BY t.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      if (rows.length > 0) {
        const count = Number(rows[0]?.count || 0);
        const cleanRows = rows.map(({ count: _c, ...rest }) => rest);
        return NextResponse.json(Utility.formatResponse(200, { count, rows: cleanRows }), { status: 200 });
      }
      return NextResponse.json(Utility.formatResponse(404, "No Data Found"), { status: 404 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Enriched homework listing with JOINed class, section, subject, teacher names
  if (endpoint === "get-homeworks" || endpoint === "get-homework" || endpoint === "homeworks" || endpoint === "homework") {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") || "0");
      const size = parseInt(searchParams.get("size") || "10");
      const search = (searchParams.get("search") || "").trim();
      const { limit, offset } = Utility.getPagination(page, size);
      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = schoolCond.school_id ? parseInt(String(schoolCond.school_id)) : null;

      const searchWild = `%${search}%`;
      const schoolClause = schoolId ? Prisma.sql`AND h.school_id = ${schoolId}` : Prisma.sql``;
      const searchClause = search
        ? Prisma.sql`AND (h.title ILIKE ${searchWild} OR h.description ILIKE ${searchWild} OR cl.name ILIKE ${searchWild} OR se.name ILIKE ${searchWild} OR sub.name ILIKE ${searchWild} OR h.status::text ILIKE ${searchWild})`
        : Prisma.sql``;

      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          h.id,
          h.school_id,
          h.teacher_id,
          h.class_id,
          h.section_id,
          h.subject_id,
          h.title,
          h.description,
          h.status,
          h.created_at,
          h.updated_at,
          cl.name AS class_name,
          se.name AS section_name,
          sub.name AS subject_name,
          CONCAT(t.firstname, ' ', COALESCE(t.lastname, '')) AS teacher_name,
          COUNT(*) OVER() AS count
        FROM homework h
        LEFT JOIN class   cl  ON cl.id  = h.class_id
        LEFT JOIN section se  ON se.id  = h.section_id
        LEFT JOIN subject sub ON sub.id = h.subject_id
        LEFT JOIN teacher t   ON t.id   = h.teacher_id
        WHERE 1=1
          ${schoolClause}
          ${searchClause}
        ORDER BY h.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      if (rows.length > 0) {
        const count = Number(rows[0]?.count || 0);
        const cleanRows = rows.map(({ count: _c, ...rest }) => rest);
        return NextResponse.json(Utility.formatResponse(200, { count, rows: cleanRows }), { status: 200 });
      }
      return NextResponse.json(Utility.formatResponse(404, "No Data Found"), { status: 404 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Enriched timetable listing with JOINed class, section, subject names
  if (
    endpoint === "get-time-tables" ||
    endpoint === "get-time-table" ||
    endpoint === "time-tables" ||
    endpoint === "time-table" ||
    endpoint === "get-timetables" ||
    endpoint === "timetables"
  ) {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") || "0", 10);
      const allSizes = searchParams.getAll("size");
      const sizeParam = allSizes.length > 0 ? allSizes[allSizes.length - 1] : "100";
      const size = parseInt(sizeParam || "100", 10);
      const search = (searchParams.get("search") || "").trim();
      const { limit, offset } = Utility.getPagination(page, size);
      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = searchParams.get("school_id")
        ? parseInt(searchParams.get("school_id")!)
        : (schoolCond.school_id ? parseInt(String(schoolCond.school_id)) : null);

      const classId = searchParams.get("classId") || searchParams.get("class_id") || searchParams.get("class");
      const sectionId = searchParams.get("section") || searchParams.get("section_id");
      const day = searchParams.get("day");
      const batch = searchParams.get("batch");

      const searchWild = `%${search}%`;
      const schoolClause = schoolId ? Prisma.sql`AND tt.school_id = ${schoolId}` : Prisma.sql``;
      const classClause = classId ? Prisma.sql`AND tt.class_id = ${parseInt(classId, 10)}` : Prisma.sql``;
      const sectionClause = sectionId ? Prisma.sql`AND tt.section_id = ${parseInt(sectionId, 10)}` : Prisma.sql``;
      const dayClause = day ? Prisma.sql`AND LOWER(tt.day::text) = LOWER(${day})` : Prisma.sql``;
      const batchClause = batch ? Prisma.sql`AND LOWER(tt.batch) = LOWER(${batch})` : Prisma.sql``;
      const searchClause = search
        ? Prisma.sql`AND (cl.name ILIKE ${searchWild} OR se.name ILIKE ${searchWild} OR sub.name ILIKE ${searchWild} OR tt.batch ILIKE ${searchWild} OR tt.day::text ILIKE ${searchWild} OR tt.duration ILIKE ${searchWild})`
        : Prisma.sql``;

      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          tt.id,
          tt.school_id,
          tt.class_id,
          tt.section_id,
          tt.subject_id,
          tt.period,
          tt.duration,
          tt.day,
          tt.batch,
          cl.name AS class_name,
          se.name AS section_name,
          sub.name AS subject_name,
          COUNT(*) OVER() AS count
        FROM timetable tt
        LEFT JOIN class   cl  ON cl.id  = tt.class_id
        LEFT JOIN section se  ON se.id  = tt.section_id
        LEFT JOIN subject sub ON sub.id = tt.subject_id
        WHERE 1=1
          ${schoolClause}
          ${classClause}
          ${sectionClause}
          ${dayClause}
          ${batchClause}
          ${searchClause}
        ORDER BY
          tt.class_id ASC,
          tt.section_id ASC,
          CASE LOWER(tt.day::text)
            WHEN 'monday' THEN 1
            WHEN 'tuesday' THEN 2
            WHEN 'wednesday' THEN 3
            WHEN 'thursday' THEN 4
            WHEN 'friday' THEN 5
            WHEN 'saturday' THEN 6
            WHEN 'sunday' THEN 7
            ELSE 8
          END ASC,
          tt.period ASC
        LIMIT ${limit} OFFSET ${offset}
      `);

      if (rows.length > 0) {
        const count = Number(rows[0]?.count || 0);
        const cleanRows = rows.map(({ count: _c, ...rest }) => rest);
        return NextResponse.json(Utility.formatResponse(200, { count, rows: cleanRows }), { status: 200 });
      }
      return NextResponse.json(Utility.formatResponse(404, "No Data Found"), { status: 404 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Students for ID card generation (filtered by class + section)
  if (endpoint === "get-students-for-idcard") {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") || "0");
      const size = parseInt(searchParams.get("size") || "10");
      const search = (searchParams.get("search") || "").trim();
      const classId = searchParams.get("classId") || searchParams.get("class_id");
      const sectionId = searchParams.get("sectionId") || searchParams.get("section_id");
      const { limit, offset } = Utility.getPagination(page, size);
      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = schoolCond.school_id ? parseInt(String(schoolCond.school_id)) : null;

      const searchWild = `%${search}%`;
      const schoolClause = schoolId ? Prisma.sql`AND s.school_id = ${schoolId}` : Prisma.sql``;
      const classClause = classId ? Prisma.sql`AND s.class = ${parseInt(classId, 10)}` : Prisma.sql``;
      const sectionClause = sectionId ? Prisma.sql`AND s.section = ${parseInt(sectionId, 10)}` : Prisma.sql``;
      const searchClause = search
        ? Prisma.sql`AND (s.firstname ILIKE ${searchWild} OR s.lastname ILIKE ${searchWild} OR s.roll_no::text ILIKE ${searchWild})`
        : Prisma.sql``;

      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          s.id, s.school_id, s.firstname, s.lastname, s.roll_no,
          s.dob, s.gender, s.blood_group, s.contact_no, s.email,
          s.father_name, s.mother_name,
          s.class, s.class AS class_id,
          s.section, s.section AS section_id,
          s.status, s.session,
          cl.name AS class_name,
          se.name AS section_name,
          CASE 
            WHEN cl.name IS NOT NULL AND se.name IS NOT NULL THEN CONCAT(cl.name, ' ', se.name)
            WHEN cl.name IS NOT NULL THEN cl.name
            ELSE NULL
          END AS class_section,
          sch.name AS school_name,
          addr.street, addr.landmark, addr.zipcode, addr.city, addr.state, addr.country,
          ci.name AS city_name,
          st.name AS state_name,
          co.name AS country_name,
          img.image_src AS student_image,
          COUNT(*) OVER() AS count
        FROM student s
        LEFT JOIN school  sch ON sch.id = s.school_id
        LEFT JOIN class   cl  ON cl.id  = s.class
        LEFT JOIN section se  ON se.id  = s.section
        LEFT JOIN LATERAL (
          SELECT street, landmark, zipcode, city, state, country
          FROM address
          WHERE (parent::text = 'student' AND (parent_id = s.id OR (s.parent_id IS NOT NULL AND parent_id = s.parent_id)))
             OR (parent::text = 'user' AND s.parent_id IS NOT NULL AND parent_id = s.parent_id)
          ORDER BY 
            CASE WHEN parent::text = 'student' AND parent_id = s.id THEN 1
                 WHEN parent::text = 'student' THEN 2
                 ELSE 3 END,
            id DESC
          LIMIT 1
        ) addr ON true
        LEFT JOIN city ci ON ci.id = addr.city
        LEFT JOIN state st ON st.id = addr.state
        LEFT JOIN country co ON co.id = addr.country
        LEFT JOIN LATERAL (
          SELECT image_src
          FROM image
          WHERE (parent::text = 'student' AND (parent_id = s.id OR (s.parent_id IS NOT NULL AND parent_id = s.parent_id)))
          ORDER BY priority ASC, id DESC
          LIMIT 1
        ) img ON true
        WHERE 1=1
          ${schoolClause}
          ${classClause}
          ${sectionClause}
          ${searchClause}
        ORDER BY s.firstname ASC
        LIMIT ${limit} OFFSET ${offset}
      `);

      if (rows.length > 0) {
        const count = Number(rows[0]?.count || 0);
        const cleanRows = rows.map(({ count: _c, ...rest }) => rest);
        return NextResponse.json(Utility.formatResponse(200, { count, rows: cleanRows }), { status: 200 });
      }
      return NextResponse.json(Utility.formatResponse(404, "No Data Found"), { status: 404 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Enriched attendance listing with JOINed student/teacher/employee name, class, section
  if (
    endpoint === "get-attendances" ||
    endpoint === "get-attendance" ||
    endpoint === "attendances" ||
    endpoint === "attendance"
  ) {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") || "0", 10);
      const size = parseInt(searchParams.get("size") || "10", 10);
      const search = (searchParams.get("search") || "").trim();
      const parent = searchParams.get("parent");
      const parentId = searchParams.get("parentId") || searchParams.get("parent_id");
      const classId = searchParams.get("classId") || searchParams.get("class_id");
      const sectionId = searchParams.get("sectionId") || searchParams.get("section_id");
      const status = searchParams.get("status");

      const { limit, offset } = Utility.getPagination(page, size);

      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = searchParams.get("school_id")
        ? parseInt(searchParams.get("school_id")!, 10)
        : (schoolCond.school_id ? parseInt(String(schoolCond.school_id), 10) : null);

      const authUserId = getAuthUserId(req);
      let scopedParent = parent;
      let scopedParentId = parentId ? parseInt(parentId, 10) : null;

      if (authUserId > 0) {
        const authUser = await prisma.user.findUnique({
          where: { id: authUserId },
          select: { role: true },
        });
        if (authUser?.role === 6) {
          const studentRec = await prisma.student.findFirst({
            where: { user_id: authUserId },
            select: { id: true },
          });
          if (studentRec) {
            scopedParent = "student";
            scopedParentId = studentRec.id;
          }
        }
      }

      const searchWild = `%${search}%`;
      const schoolClause = schoolId ? Prisma.sql`AND a.school_id = ${schoolId}` : Prisma.sql``;
      const parentClause = scopedParent ? Prisma.sql`AND LOWER(a.parent::text) = LOWER(${scopedParent})` : Prisma.sql``;
      const parentIdClause = scopedParentId ? Prisma.sql`AND a.parent_id = ${scopedParentId}` : Prisma.sql``;
      const classClause = classId ? Prisma.sql`AND a.class_id = ${parseInt(classId, 10)}` : Prisma.sql``;
      const sectionClause = sectionId ? Prisma.sql`AND a.section_id = ${parseInt(sectionId, 10)}` : Prisma.sql``;
      const statusClause = status ? Prisma.sql`AND LOWER(a.status::text) = LOWER(${status})` : Prisma.sql``;
      const searchClause = search
        ? Prisma.sql`AND (
            st.firstname ILIKE ${searchWild} OR st.lastname ILIKE ${searchWild} OR
            tc.firstname ILIKE ${searchWild} OR tc.lastname ILIKE ${searchWild} OR
            em.firstname ILIKE ${searchWild} OR em.lastname ILIKE ${searchWild} OR
            cl.name ILIKE ${searchWild} OR se.name ILIKE ${searchWild} OR
            a.status::text ILIKE ${searchWild} OR a.parent::text ILIKE ${searchWild}
          )`
        : Prisma.sql``;

      let rows: any[];
      try {
        rows = await prisma.$queryRaw<any[]>(Prisma.sql`
          SELECT
            a.id,
            a.school_id,
            a.parent::text AS parent,
            a.parent_id,
            a.class_id,
            a.section_id,
            a.date,
            a.status::text AS status,
            a.remark,
            a.created_at,
            COALESCE(
              CASE 
                WHEN a.parent = 'student' THEN CONCAT(st.firstname, ' ', COALESCE(st.lastname, ''))
                WHEN a.parent = 'teacher' THEN CONCAT(tc.firstname, ' ', COALESCE(tc.lastname, ''))
                WHEN a.parent = 'employee' THEN CONCAT(em.firstname, ' ', COALESCE(em.lastname, ''))
              END,
              CONCAT(COALESCE(st.firstname, tc.firstname, em.firstname, ''), ' ', COALESCE(st.lastname, tc.lastname, em.lastname, ''))
            ) AS name,
            cl.name AS class_name,
            se.name AS section_name,
            COUNT(*) OVER() AS count
          FROM attendance a
          LEFT JOIN student  st ON st.id = a.parent_id AND a.parent = 'student'
          LEFT JOIN teacher  tc ON tc.id = a.parent_id AND a.parent = 'teacher'
          LEFT JOIN employee em ON em.id = a.parent_id AND a.parent = 'employee'
          LEFT JOIN class    cl ON cl.id = a.class_id
          LEFT JOIN section  se ON se.id = a.section_id
          WHERE 1=1
            ${schoolClause}
            ${parentClause}
            ${parentIdClause}
            ${classClause}
            ${sectionClause}
            ${statusClause}
            ${searchClause}
          ORDER BY a.date DESC NULLS LAST, a.id DESC
          LIMIT ${limit} OFFSET ${offset}
        `);
      } catch (rawErr: any) {
        if (String(rawErr).includes("column a.remark does not exist") || String(rawErr).includes("42703")) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "remark" TEXT;`);
          rows = await prisma.$queryRaw<any[]>(Prisma.sql`
            SELECT
              a.id,
              a.school_id,
              a.parent::text AS parent,
              a.parent_id,
              a.class_id,
              a.section_id,
              a.date,
              a.status::text AS status,
              a.remark,
              a.created_at,
              COALESCE(
                CASE 
                  WHEN a.parent = 'student' THEN CONCAT(st.firstname, ' ', COALESCE(st.lastname, ''))
                  WHEN a.parent = 'teacher' THEN CONCAT(tc.firstname, ' ', COALESCE(tc.lastname, ''))
                  WHEN a.parent = 'employee' THEN CONCAT(em.firstname, ' ', COALESCE(em.lastname, ''))
                END,
                CONCAT(COALESCE(st.firstname, tc.firstname, em.firstname, ''), ' ', COALESCE(st.lastname, tc.lastname, em.lastname, ''))
              ) AS name,
              cl.name AS class_name,
              se.name AS section_name,
              COUNT(*) OVER() AS count
            FROM attendance a
            LEFT JOIN student  st ON st.id = a.parent_id AND a.parent = 'student'
            LEFT JOIN teacher  tc ON tc.id = a.parent_id AND a.parent = 'teacher'
            LEFT JOIN employee em ON em.id = a.parent_id AND a.parent = 'employee'
            LEFT JOIN class    cl ON cl.id = a.class_id
            LEFT JOIN section  se ON se.id = a.section_id
            WHERE 1=1
              ${schoolClause}
              ${parentClause}
              ${parentIdClause}
              ${classClause}
              ${sectionClause}
              ${statusClause}
              ${searchClause}
            ORDER BY a.date DESC NULLS LAST, a.id DESC
            LIMIT ${limit} OFFSET ${offset}
          `);
        } else {
          throw rawErr;
        }
      }

      if (rows.length > 0) {
        const count = Number(rows[0]?.count || 0);
        const cleanRows = rows.map(({ count: _c, ...rest }) => rest);
        return NextResponse.json(Utility.formatResponse(200, { count, rows: cleanRows }), { status: 200 });
      }
      return NextResponse.json(Utility.formatResponse(200, { count: 0, rows: [] }), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Enriched school house listing with JOINed student (captain, vice_captain) and teacher (teacher_incharge)
  if (
    endpoint === "get-school-houses" ||
    endpoint === "get-school-house" ||
    endpoint === "school-houses" ||
    endpoint === "school-house"
  ) {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") || "0", 10);
      const size = parseInt(searchParams.get("size") || "10", 10);
      const search = (searchParams.get("search") || "").trim();

      const { limit, offset } = Utility.getPagination(page, size);

      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = searchParams.get("school_id")
        ? parseInt(searchParams.get("school_id")!, 10)
        : (schoolCond.school_id ? parseInt(String(schoolCond.school_id), 10) : null);

      const searchWild = `%${search}%`;
      const schoolClause = schoolId ? Prisma.sql`AND sh.school_id = ${schoolId}` : Prisma.sql``;
      const searchClause = search
        ? Prisma.sql`AND (
            sh.name ILIKE ${searchWild} OR
            sh.color_code ILIKE ${searchWild} OR
            sh.status::text ILIKE ${searchWild} OR
            cap.firstname ILIKE ${searchWild} OR cap.lastname ILIKE ${searchWild} OR
            vc.firstname ILIKE ${searchWild} OR vc.lastname ILIKE ${searchWild} OR
            ti.firstname ILIKE ${searchWild} OR ti.lastname ILIKE ${searchWild}
          )`
        : Prisma.sql``;

      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          sh.id,
          sh.school_id,
          sh.name,
          sh.color_code,
          sh.captain,
          sh.vice_captain,
          sh.teacher_incharge,
          sh.strength,
          sh.status::text AS status,
          sh.created_at,
          sh.created_by,
          COALESCE(
            NULLIF(TRIM(CONCAT(cap.firstname, ' ', COALESCE(cap.lastname, ''))), ''),
            NULLIF(TRIM(cap.firstname), '')
          ) AS "captainName",
          COALESCE(
            NULLIF(TRIM(CONCAT(cap.firstname, ' ', COALESCE(cap.lastname, ''))), ''),
            NULLIF(TRIM(cap.firstname), '')
          ) AS captain_name,
          COALESCE(
            NULLIF(TRIM(CONCAT(vc.firstname, ' ', COALESCE(vc.lastname, ''))), ''),
            NULLIF(TRIM(vc.firstname), '')
          ) AS "viceCaptainNname",
          COALESCE(
            NULLIF(TRIM(CONCAT(vc.firstname, ' ', COALESCE(vc.lastname, ''))), ''),
            NULLIF(TRIM(vc.firstname), '')
          ) AS "viceCaptainName",
          COALESCE(
            NULLIF(TRIM(CONCAT(vc.firstname, ' ', COALESCE(vc.lastname, ''))), ''),
            NULLIF(TRIM(vc.firstname), '')
          ) AS vice_captain_name,
          COALESCE(
            NULLIF(TRIM(CONCAT(ti.firstname, ' ', COALESCE(ti.lastname, ''))), ''),
            NULLIF(TRIM(ti.firstname), '')
          ) AS "teacherName",
          COALESCE(
            NULLIF(TRIM(CONCAT(ti.firstname, ' ', COALESCE(ti.lastname, ''))), ''),
            NULLIF(TRIM(ti.firstname), '')
          ) AS teacher_name,
          COALESCE(
            NULLIF(TRIM(CONCAT(ti.firstname, ' ', COALESCE(ti.lastname, ''))), ''),
            NULLIF(TRIM(ti.firstname), '')
          ) AS teacher_incharge_name,
          COUNT(*) OVER() AS count
        FROM school_house sh
        LEFT JOIN student cap ON (cap.id = sh.captain OR cap.parent_id = sh.captain)
        LEFT JOIN student vc  ON (vc.id  = sh.vice_captain OR vc.parent_id = sh.vice_captain)
        LEFT JOIN teacher ti  ON (ti.id  = sh.teacher_incharge OR ti.parent_id = sh.teacher_incharge)
        WHERE 1=1
          ${schoolClause}
          ${searchClause}
        ORDER BY sh.id ASC
        LIMIT ${limit} OFFSET ${offset}
      `);

      if (rows.length > 0) {
        const count = Number(rows[0]?.count || 0);
        const cleanRows = rows.map(({ count: _c, ...rest }) => rest);
        return NextResponse.json(Utility.formatResponse(200, { count, rows: cleanRows }), { status: 200 });
      }
      // Bug fix: must explicitly return 404 — do NOT fall through to generic handler
      return NextResponse.json(Utility.formatResponse(404, "No Data Found"), { status: 404 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // ─── Enriched Online Quiz Listing (Admins, Teachers, Students) ───────────────────
  if (
    endpoint === "get-quizzes" ||
    endpoint === "get-quiz" ||
    endpoint === "quizzes" ||
    endpoint === "quiz"
  ) {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") || "0", 10);
      const size = parseInt(searchParams.get("size") || "10", 10);
      const search = (searchParams.get("search") || "").trim();
      const classId = searchParams.get("classId") || searchParams.get("class_id");
      const sectionId = searchParams.get("sectionId") || searchParams.get("section_id");
      const subjectId = searchParams.get("subjectId") || searchParams.get("subject_id");
      const status = searchParams.get("status");
      const quizType = searchParams.get("quiz_type");

      const { limit, offset } = Utility.getPagination(page, size);

      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = searchParams.get("school_id")
        ? parseInt(searchParams.get("school_id")!, 10)
        : (schoolCond.school_id ? parseInt(String(schoolCond.school_id), 10) : null);

      const authUserId = getAuthUserId(req);
      let studentRecord: any = null;
      if (authUserId > 0) {
        const authUser = await prisma.user.findUnique({
          where: { id: authUserId },
          select: { role: true },
        });
        if (authUser?.role === 6) {
          studentRecord = await prisma.student.findFirst({
            where: { user_id: authUserId },
            select: { id: true, class: true, section: true, school_id: true },
          });
        }
      }

      const searchWild = `%${search}%`;
      const schoolClause = schoolId ? Prisma.sql`AND q.school_id = ${schoolId}` : Prisma.sql``;
      
      // If student logged in, filter to their class and published status
      let studentClassClause = Prisma.sql``;
      let studentStatusClause = Prisma.sql``;
      if (studentRecord) {
        studentClassClause = studentRecord.class
          ? Prisma.sql`AND (q.class_id = ${studentRecord.class} OR q.class_id IS NULL)`
          : Prisma.sql``;
        studentStatusClause = Prisma.sql`AND q.status = 'published'`;
      } else {
        if (classId) {
          studentClassClause = Prisma.sql`AND q.class_id = ${parseInt(classId, 10)}`;
        }
        if (status) {
          studentStatusClause = Prisma.sql`AND q.status = ${status}`;
        }
      }

      const sectionClause = sectionId ? Prisma.sql`AND (q.section_id = ${parseInt(sectionId, 10)} OR q.section_id IS NULL)` : Prisma.sql``;
      const subjectClause = subjectId ? Prisma.sql`AND q.subject_id = ${parseInt(subjectId, 10)}` : Prisma.sql``;
      const typeClause = quizType ? Prisma.sql`AND q.quiz_type = ${quizType}` : Prisma.sql``;
      const searchClause = search
        ? Prisma.sql`AND (
            q.title ILIKE ${searchWild} OR
            q.description ILIKE ${searchWild} OR
            cl.name ILIKE ${searchWild} OR
            sub.name ILIKE ${searchWild}
          )`
        : Prisma.sql``;

      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          q.id,
          q.school_id,
          q.class_id,
          q.section_id,
          q.subject_id,
          q.title,
          q.description,
          q.instructions,
          q.duration_minutes,
          q.total_marks,
          q.passing_marks,
          q.difficulty_level,
          q.quiz_type,
          q.status,
          q.starts_at,
          q.ends_at,
          q.allow_review,
          q.shuffle_questions,
          q.reward_gift,
          q.created_at,
          q.updated_at,
          cl.name AS class_name,
          se.name AS section_name,
          sub.name AS subject_name,
          (SELECT COUNT(*)::int FROM quiz_question qq WHERE qq.quiz_id = q.id) AS questions_count,
          (SELECT COUNT(*)::int FROM quiz_attempt qa WHERE qa.quiz_id = q.id) AS attempts_count,
          COUNT(*) OVER() AS count
        FROM quiz q
        LEFT JOIN class   cl  ON cl.id  = q.class_id
        LEFT JOIN section se  ON se.id  = q.section_id
        LEFT JOIN subject sub ON sub.id = q.subject_id
        WHERE 1=1
          ${schoolClause}
          ${studentClassClause}
          ${studentStatusClause}
          ${sectionClause}
          ${subjectClause}
          ${typeClause}
          ${searchClause}
        ORDER BY q.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      if (rows.length > 0) {
        const count = Number(rows[0]?.count || 0);
        let cleanRows = rows.map(({ count: _c, ...rest }) => rest);

        // If student is querying, attach student's latest attempt for each quiz
        if (studentRecord) {
          const quizIds = cleanRows.map(r => r.id);
          const studentAttempts = await prisma.quiz_attempt.findMany({
            where: {
              quiz_id: { in: quizIds },
              student_id: studentRecord.id,
            },
            orderBy: { id: "desc" },
          });

          const attemptMap = new Map<number, any>();
          for (const att of studentAttempts) {
            if (att.quiz_id && !attemptMap.has(att.quiz_id)) {
              attemptMap.set(att.quiz_id, att);
            }
          }

          cleanRows = cleanRows.map(r => {
            const att = attemptMap.get(r.id);
            return {
              ...r,
              has_attempted: !!att,
              student_attempt: att || null,
            };
          });
        }

        return NextResponse.json(Utility.formatResponse(200, { count, rows: cleanRows }), { status: 200 });
      }
      return NextResponse.json(Utility.formatResponse(200, { count: 0, rows: [] }), { status: 200 });
    } catch (err) {
      console.error("get-quizzes error:", err);
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // ─── Quiz Questions list for a Quiz (Student safe: hides correct_option during attempt) ───
  if (endpoint === "get-quiz-questions") {
    try {
      const { searchParams } = new URL(req.url);
      const quizId = parseInt(searchParams.get("quiz_id") || "0", 10);
      if (!quizId) {
        return NextResponse.json(Utility.formatResponse(400, "quiz_id is required"), { status: 400 });
      }

      const authUserId = getAuthUserId(req);
      let isStudent = false;
      if (authUserId > 0) {
        const authUser = await prisma.user.findUnique({
          where: { id: authUserId },
          select: { role: true },
        });
        if (authUser?.role === 6) isStudent = true;
      }

      const questions = await dbGetQuizQuestions(quizId);

      // If student is fetching questions for an active attempt, redact correct_option
      const isReview = searchParams.get("review") === "true";
      const sanitized = questions.map((q, idx) => {
        if (isStudent && !isReview) {
          const { correct_option: _c, ...safe } = q;
          return { ...safe, order_index: safe.order_index ?? idx + 1 };
        }
        return { ...q, order_index: q.order_index ?? idx + 1 };
      });

      return NextResponse.json(Utility.formatResponse(200, sanitized), { status: 200 });
    } catch (err) {
      console.error("get-quiz-questions error:", err);
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // ─── Quiz Attempt Review (Questions + Student Answers + Correct Answers) ───
  if (endpoint === "get-quiz-attempt-review") {
    try {
      const { searchParams } = new URL(req.url);
      const attemptId = parseInt(searchParams.get("attempt_id") || searchParams.get("id") || "0", 10);
      if (!attemptId) {
        return NextResponse.json(Utility.formatResponse(400, "attempt_id is required"), { status: 400 });
      }

      const attempt = await dbGetQuizAttempt(attemptId);
      if (!attempt) {
        return NextResponse.json(Utility.formatResponse(404, "Attempt not found"), { status: 404 });
      }

      const quizData = attempt.quiz_id
        ? await dbGetQuizById(attempt.quiz_id)
        : null;

      const questions = attempt.quiz_id
        ? await dbGetQuizQuestions(attempt.quiz_id)
        : [];

      const answers = await dbGetQuizAttemptAnswers(attemptId);

      const answerMap = new Map<number, any>();
      for (const a of answers) {
        if (a.quiz_question_id) answerMap.set(a.quiz_question_id, a);
      }

      const enrichedQuestions = questions.map(q => {
        const studentAns = answerMap.get(q.id);
        return {
          ...q,
          selected_option: studentAns?.selected_option || null,
          is_correct: studentAns?.is_correct || false,
          marks_awarded: studentAns?.marks_awarded || 0,
        };
      });

      let studentInfo: any = null;
      if (attempt.student_id) {
        studentInfo = await prisma.student.findUnique({
          where: { id: attempt.student_id },
          select: { id: true, firstname: true, lastname: true, roll_no: true, enrollment_no: true, class: true, section: true }
        });
      }

      // Fetch or provision gift claim if quiz has reward and student performed well
      let giftClaimInfo: any = null;
      if (quizData?.reward_gift && attempt.student_id) {
        if ((prisma as any).gift_claim?.findFirst) {
          giftClaimInfo = await (prisma as any).gift_claim.findFirst({
            where: { attempt_id: attemptId },
          });
        } else {
          const rows = await prisma.$queryRawUnsafe<any[]>(
            `SELECT * FROM "public"."gift_claim" WHERE attempt_id = $1 LIMIT 1`,
            attemptId
          );
          giftClaimInfo = rows[0] || null;
        }

        // If no claim exists yet, check if student passed or scored >= 50%
        const isQualified = attempt.result === "pass" || (attempt.percentage !== null && attempt.percentage !== undefined && attempt.percentage >= 50);
        if (!giftClaimInfo && isQualified) {
          const claimCode = `GIFT-${quizData.id}-${attempt.student_id}-${Math.floor(1000 + Math.random() * 9000)}`;
          const score = attempt.score || 0;
          try {
            if ((prisma as any).gift_claim?.create) {
              giftClaimInfo = await (prisma as any).gift_claim.create({
                data: {
                  school_id: quizData.school_id,
                  student_id: attempt.student_id,
                  quiz_id: quizData.id,
                  attempt_id: attemptId,
                  gift_title: quizData.reward_gift,
                  reward_points: Math.round(score * 10),
                  status: "pending",
                  claim_code: claimCode,
                  remarks: `Earned by completing quiz: ${quizData.title}`,
                  created_at: new Date(),
                  updated_at: new Date(),
                },
              });
            } else {
              const rows = await prisma.$queryRawUnsafe<any[]>(
                `INSERT INTO "public"."gift_claim" (school_id, student_id, quiz_id, attempt_id, gift_title, reward_points, status, claim_code, remarks, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, NOW(), NOW())
                 RETURNING *`,
                quizData.school_id, attempt.student_id, quizData.id, attemptId, quizData.reward_gift, Math.round(score * 10), claimCode, `Earned by completing quiz: ${quizData.title}`
              );
              giftClaimInfo = rows[0] || null;
            }
          } catch (claimErr) {
            console.error("Auto-provision gift claim error:", claimErr);
          }
        }
      }

      return NextResponse.json(Utility.formatResponse(200, {
        attempt,
        quiz: quizData,
        questions: enrichedQuestions,
        student: studentInfo,
        gift_claim: giftClaimInfo,
      }), { status: 200 });
    } catch (err) {
      console.error("get-quiz-attempt-review error:", err);
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // ─── Quiz Stats & Analytics (Admin / Teacher Dashboard) ───
  if (endpoint === "get-quiz-stats") {
    try {
      const { searchParams } = new URL(req.url);
      const quizId = parseInt(searchParams.get("quiz_id") || "0", 10);
      if (!quizId) {
        return NextResponse.json(Utility.formatResponse(400, "quiz_id is required"), { status: 400 });
      }

      const attempts = await dbGetQuizAttempts(quizId);

      const totalAttempts = attempts.length;
      let totalScore = 0;
      let passedCount = 0;
      let failedCount = 0;
      let highestScore = 0;

      for (const a of attempts) {
        const sc = a.score || 0;
        totalScore += sc;
        if (sc > highestScore) highestScore = sc;
        if (a.result === "pass") passedCount++;
        else if (a.result === "fail") failedCount++;
      }

      const avgScore = totalAttempts > 0 ? parseFloat((totalScore / totalAttempts).toFixed(2)) : 0;
      const passRate = totalAttempts > 0 ? parseFloat(((passedCount / totalAttempts) * 100).toFixed(1)) : 0;

      const topAttempts = attempts.slice(0, 10);
      const studentIds = topAttempts.map(a => a.student_id).filter(Boolean) as number[];
      const students = studentIds.length > 0
        ? await prisma.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, firstname: true, lastname: true, roll_no: true }
          })
        : [];

      const studentMap = new Map(students.map(s => [s.id, s]));
      const leaderboard = topAttempts.map(a => {
        const s = a.student_id ? studentMap.get(a.student_id) : null;
        return {
          attempt_id: a.id,
          student_id: a.student_id,
          student_name: s ? `${s.firstname} ${s.lastname || ""}`.trim() : "Student",
          roll_no: s?.roll_no || null,
          score: a.score,
          total_marks: a.total_marks,
          percentage: a.percentage,
          result: a.result,
          time_taken: a.time_taken,
          submitted_at: a.submitted_at,
        };
      });

      return NextResponse.json(Utility.formatResponse(200, {
        total_attempts: totalAttempts,
        avg_score: avgScore,
        pass_rate: passRate,
        passed_count: passedCount,
        failed_count: failedCount,
        highest_score: highestScore,
        leaderboard,
      }), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // ─── Gift Claims Listing ───
  if (endpoint === "get-gift-claims" || endpoint === "gift-claims") {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") || "0", 10);
      const size = parseInt(searchParams.get("size") || "10", 10);
      const search = (searchParams.get("search") || "").trim();
      const status = searchParams.get("status");

      const { limit, offset } = Utility.getPagination(page, size);
      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = schoolCond.school_id ? parseInt(String(schoolCond.school_id), 10) : null;

      const authUserId = getAuthUserId(req);
      let studentIdFilter: number | null = null;
      if (authUserId > 0) {
        const st = await prisma.student.findFirst({
          where: { user_id: authUserId },
          select: { id: true },
        });
        if (st) studentIdFilter = st.id;
      }

      const searchWild = `%${search}%`;
      const schoolClause = schoolId ? Prisma.sql`AND (gc.school_id = ${schoolId} OR gc.school_id IS NULL)` : Prisma.sql``;
      const studentClause = studentIdFilter ? Prisma.sql`AND gc.student_id = ${studentIdFilter}` : Prisma.sql``;
      const statusClause = status ? Prisma.sql`AND gc.status = ${status}` : Prisma.sql``;
      const searchClause = search
        ? Prisma.sql`AND (gc.gift_title ILIKE ${searchWild} OR gc.claim_code ILIKE ${searchWild} OR st.firstname ILIKE ${searchWild})`
        : Prisma.sql``;

      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          gc.id,
          gc.school_id,
          gc.student_id,
          gc.quiz_id,
          gc.attempt_id,
          gc.gift_title,
          gc.reward_points,
          gc.status,
          gc.claim_code,
          gc.remarks,
          gc.claimed_at,
          gc.created_at,
          q.title AS quiz_title,
          st.firstname,
          st.lastname,
          st.roll_no,
          cl.name AS class_name,
          se.name AS section_name,
          COUNT(*) OVER() AS count
        FROM gift_claim gc
        LEFT JOIN quiz    q  ON q.id  = gc.quiz_id
        LEFT JOIN student st ON st.id = gc.student_id
        LEFT JOIN class   cl ON cl.id = st.class
        LEFT JOIN section se ON se.id = st.section
        WHERE 1=1
          ${schoolClause}
          ${studentClause}
          ${statusClause}
          ${searchClause}
        ORDER BY gc.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      if (rows.length > 0) {
        const count = Number(rows[0]?.count || 0);
        const cleanRows = rows.map(({ count: _c, ...rest }) => rest);
        return NextResponse.json(Utility.formatResponse(200, { count, rows: cleanRows }), { status: 200 });
      }
      return NextResponse.json(Utility.formatResponse(200, { count: 0, rows: [] }), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Enriched marksheet listing with JOINed student, class, and section
  if (
    endpoint === "get-marksheets" ||
    endpoint === "get-marksheet" ||
    endpoint === "marksheets" ||
    endpoint === "marksheet"
  ) {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") || "0", 10);
      const size = parseInt(searchParams.get("size") || "10", 10);
      const search = (searchParams.get("search") || "").trim();
      const classId = searchParams.get("classId") || searchParams.get("class_id");
      const sectionId = searchParams.get("sectionId") || searchParams.get("section_id");
      const term = searchParams.get("term");
      const session = searchParams.get("session");
      const result = searchParams.get("result");

      const { limit, offset } = Utility.getPagination(page, size);

      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = searchParams.get("school_id")
        ? parseInt(searchParams.get("school_id")!, 10)
        : (schoolCond.school_id ? parseInt(String(schoolCond.school_id), 10) : null);

      const searchWild = `%${search}%`;
      const schoolClause = schoolId ? Prisma.sql`AND m.school_id = ${schoolId}` : Prisma.sql``;
      const classClause = classId ? Prisma.sql`AND m.class_id = ${parseInt(classId, 10)}` : Prisma.sql``;
      const sectionClause = sectionId ? Prisma.sql`AND m.section_id = ${parseInt(sectionId, 10)}` : Prisma.sql``;
      const termClause = term ? Prisma.sql`AND m.term::text = ${term}` : Prisma.sql``;
      const sessionClause = session ? Prisma.sql`AND m.session ILIKE ${session}` : Prisma.sql``;
      const resultClause = result ? Prisma.sql`AND m.result::text = ${result}` : Prisma.sql``;
      const searchClause = search
        ? Prisma.sql`AND (
            st.firstname ILIKE ${searchWild} OR st.lastname ILIKE ${searchWild} OR
            m.session ILIKE ${searchWild} OR m.term::text ILIKE ${searchWild} OR
            m.result::text ILIKE ${searchWild} OR cl.name ILIKE ${searchWild} OR se.name ILIKE ${searchWild}
          )`
        : Prisma.sql``;

      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          m.id,
          m.school_id,
          m.student_id,
          m.class_id,
          m.section_id,
          m.session,
          m.term,
          m.result,
          m.co_scholastic_data,
          m.discipline_data,
          m.overall_remark,
          m.created_at,
          m.updated_at,
          m.created_by,
          m.updated_by,
          COALESCE(
            NULLIF(TRIM(CONCAT(st.firstname, ' ', COALESCE(st.lastname, ''))), ''),
            NULLIF(TRIM(st.firstname), '')
          ) AS student_name,
          COALESCE(
            NULLIF(TRIM(CONCAT(st.firstname, ' ', COALESCE(st.lastname, ''))), ''),
            NULLIF(TRIM(st.firstname), '')
          ) AS "studentName",
          st.roll_no,
          st.enrollment_no,
          cl.name AS class_name,
          se.name AS section_name,
          COUNT(*) OVER() AS count
        FROM marksheet m
        LEFT JOIN student st ON (st.id = m.student_id OR st.parent_id = m.student_id)
        LEFT JOIN class   cl ON cl.id = m.class_id
        LEFT JOIN section se ON se.id = m.section_id
        WHERE 1=1
          ${schoolClause}
          ${classClause}
          ${sectionClause}
          ${termClause}
          ${sessionClause}
          ${resultClause}
          ${searchClause}
        ORDER BY m.id ASC
        LIMIT ${limit} OFFSET ${offset}
      `);

      if (rows.length > 0) {
        const count = Number(rows[0]?.count || 0);
        const cleanRows = rows.map(({ count: _c, ...rest }) => rest);
        return NextResponse.json(Utility.formatResponse(200, { count, rows: cleanRows }), { status: 200 });
      }
      return NextResponse.json(Utility.formatResponse(404, "No Data Found"), { status: 404 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Enriched user listing — JOINs user_role so role_name is a searchable string field.
  // The generic handler cannot do this because user.role is an Int FK, not a text field.
  if (endpoint === "get-users" || endpoint === "users") {
    try {
      const { searchParams } = new URL(req.url);
      const page   = parseInt(searchParams.get("page") || "0", 10);
      const size   = parseInt(searchParams.get("size") || "10", 10);
      const search = (searchParams.get("search") || "").trim();
      const { limit, offset } = Utility.getPagination(page, size);

      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId   = schoolCond.school_id
        ? parseInt(String(schoolCond.school_id), 10)
        : null;

      const searchWild  = `%${search}%`;
      const schoolClause = schoolId
        ? Prisma.sql`AND u.school_id = ${schoolId}`
        : Prisma.sql``;
      const searchClause = search
        ? Prisma.sql`AND (
            u.username   ILIKE ${searchWild} OR
            u.email      ILIKE ${searchWild} OR
            u.contact_no ILIKE ${searchWild} OR
            ur.name      ILIKE ${searchWild}
          )`
        : Prisma.sql``;

      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          u.id,
          u.school_id,
          u.username,
          u.email,
          u.contact_no,
          u.role,
          u.designation,
          u.gender::text  AS gender,
          u.status::text  AS status,
          u.created_at,
          u.updated_at,
          u.created_by,
          u.updated_by,
          ur.name         AS role_name,
          ur.priority     AS role_priority,
          COUNT(*) OVER() AS count
        FROM "user" u
        LEFT JOIN user_role ur ON ur.id = u.role
        WHERE 1=1
          ${schoolClause}
          ${searchClause}
        ORDER BY u.updated_at DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `);

      if (rows.length > 0) {
        const count     = Number(rows[0]?.count || 0);
        const cleanRows = rows.map(({ count: _c, ...rest }) => rest);
        return NextResponse.json(Utility.formatResponse(200, { count, rows: cleanRows }), { status: 200 });
      }
      return NextResponse.json(Utility.formatResponse(404, "No Data Found"), { status: 404 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Enriched or filtered student listing
  if (
    endpoint === "get-students" ||
    endpoint === "get-student" ||
    endpoint === "students" ||
    endpoint === "student"
  ) {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") || "0", 10);
      const size = parseInt(searchParams.get("size") || "10", 10);
      const search = (searchParams.get("search") || "").trim();
      const classId = searchParams.get("classId") || searchParams.get("class_id") || searchParams.get("class");
      const sectionId = searchParams.get("sectionId") || searchParams.get("section_id") || searchParams.get("section");
      const parentId = searchParams.get("parentId") || searchParams.get("parent_id");

      const { limit, offset } = Utility.getPagination(page, size);
      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = searchParams.get("school_id")
        ? parseInt(searchParams.get("school_id")!, 10)
        : (schoolCond.school_id ? parseInt(String(schoolCond.school_id), 10) : undefined);

      const schoolClause = schoolId
        ? Prisma.sql`AND st.school_id = ${schoolId}`
        : Prisma.sql``;
      const classClause = classId
        ? Prisma.sql`AND st.class = ${parseInt(classId, 10)}`
        : Prisma.sql``;
      const sectionClause = sectionId
        ? Prisma.sql`AND st.section = ${parseInt(sectionId, 10)}`
        : Prisma.sql``;
      const parentClause = parentId
        ? Prisma.sql`AND st.parent_id = ${parseInt(parentId, 10)}`
        : Prisma.sql``;

      const searchWild = `%${search}%`;
      const searchClause = search
        ? Prisma.sql`AND (
            st.firstname ILIKE ${searchWild} OR
            st.lastname  ILIKE ${searchWild} OR
            st.email     ILIKE ${searchWild} OR
            st.status::text ILIKE ${searchWild}
          )`
        : Prisma.sql``;

      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          st.*,
          cl.name AS class_name,
          se.name AS section_name,
          COUNT(*) OVER() AS total_count
        FROM student st
        LEFT JOIN class   cl ON cl.id = st.class
        LEFT JOIN section se ON se.id = st.section
        WHERE 1=1
          ${schoolClause}
          ${classClause}
          ${sectionClause}
          ${parentClause}
          ${searchClause}
        ORDER BY st.updated_at DESC NULLS LAST, st.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      if (rows.length > 0) {
        const count = Number(rows[0]?.total_count || 0);
        const cleanRows = rows.map(({ total_count: _c, ...rest }) => rest);
        return NextResponse.json(Utility.formatResponse(200, { count, rows: cleanRows }), { status: 200 });
      }
      return NextResponse.json(Utility.formatResponse(404, "No Data Found"), { status: 404 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Generic List Handler for get-X endpoints
  if (endpoint.startsWith("get-")) {
    const entityKey = endpoint.replace("get-", "");
    const mapping = MODEL_MAPPING[entityKey];
    if (mapping) {
      return genericList(req, mapping.model, mapping.searchFields);
    }
  }

  return NextResponse.json(Utility.formatResponse(404, `Endpoint ${endpoint} not found`), { status: 404 });
}

function getAuthUserId(req: NextRequest): number {
  try {
    const rawToken = req.headers.get("x-access-token") || req.headers.get("authorization") || "";
    const cleanToken = rawToken.startsWith("Bearer ") ? rawToken.slice(7) : rawToken;
    if (cleanToken) {
      const payload = Utility.verifyTokenString(cleanToken);
      if (payload && (payload as any).id) {
        const id = parseInt(String((payload as any).id), 10);
        if (!isNaN(id) && id > 0) return id;
      }
    }
    const verified = Utility.verifyToken(req);
    if (verified && verified.userId && verified.userId > 0) {
      return verified.userId;
    }
  } catch (err) {
    console.error("Error extracting auth userId:", err);
  }
  return 1;
}

async function handlePost(req: NextRequest, endpoint: string) {
  // Generate on-demand Student Portal Login Credentials
  if (endpoint === "generate-student-login") {
    try {
      const body = await req.json();
      const studentId = parseInt(String(body.student_id || body.id), 10);
      if (isNaN(studentId)) {
        return NextResponse.json(Utility.formatResponse(400, "Invalid or missing student_id"), { status: 400 });
      }

      const authUserId = getAuthUserId(req);
      const force = body.force !== undefined ? Boolean(body.force) : true;
      const result = await provisionStudentUser(studentId, authUserId, force);

      if (!result.success || !result.data) {
        return NextResponse.json(Utility.formatResponse(400, result.message || "Failed to generate student login"), { status: 400 });
      }

      return NextResponse.json(Utility.formatResponse(200, result.data), { status: 200 });
    } catch (err) {
      console.error("Error in generate-student-login:", err);
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Login Endpoint
  if (endpoint === "login") {
    try {
      const body = await req.json();
      const { email, username, password } = body;
      const userIdent = email || username;

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: userIdent },
            { username: userIdent },
            { contact_no: userIdent },
          ],
          status: "active",
        },
      });

      if (!user) {
        return NextResponse.json(Utility.formatResponse(200, "User does not exist"), { status: 200 });
      }

      const isValid = await Utility.comparePassword(password, user.password || "");
      if (!isValid) {
        return NextResponse.json(Utility.formatResponse(200, "Username and Password do not match"), { status: 200 });
      }

      const token = Utility.getSignedToken(user.id);

      let studentProfile: any = null;
      if (user.role === 6) {
        studentProfile = await prisma.student.findFirst({
          where: { user_id: user.id },
          select: {
            id: true,
            school_id: true,
            firstname: true,
            lastname: true,
            class: true,
            section: true,
            roll_no: true,
            enrollment_no: true,
          }
        });
      }

      const school = user.school_id
        ? await prisma.school.findUnique({
            where: { id: user.school_id },
            select: { id: true, name: true, school_code: true }
          })
        : null;

      return NextResponse.json(
        Utility.formatResponse(200, {
          token,
          id: user.id,
          role: user.role,
          rolePriority: user.role,
          designation: user.designation || (user.role === 6 ? "student" : undefined),
          username: user.username,
          school_id: user.school_id,
          school_name: school?.name || undefined,
          school_code: school?.school_code || undefined,
          student: studentProfile || undefined,
        }),
        { status: 200 }
      );
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Role By ID
  if (endpoint === "get-role-by-id") {
    try {
      const body = await req.json();
      const roleId = typeof body === "object" ? body.id || body.roleId : body;
      const role = await prisma.user_role.findUnique({ where: { id: parseInt(String(roleId)) } });
      if (role) return NextResponse.json(Utility.formatResponse(200, role), { status: 200 });
      return NextResponse.json(Utility.formatResponse(404, "Role Not Found"), { status: 404 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Encrypt / Decrypt Text
  if (endpoint === "encrypt-text") {
    try {
      const body = await req.json();
      // body.data can be a number, string, or object — stringify only objects/arrays,
      // leave primitives as-is so decrypt round-trip stays clean.
      const raw = body.data;
      const textToEncrypt = (typeof raw === "object" && raw !== null)
        ? JSON.stringify(raw)
        : String(raw);
      const encrypted = Utility.encryptText(textToEncrypt);
      return NextResponse.json(Utility.formatResponse(200, encrypted), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  if (endpoint === "decrypt-text") {
    try {
      const body = await req.json();
      // The client (CommonAPI.decryptText) sends: POST body = { encrypted_id, vect }
      // NOT wrapped under a 'data' key. Support both forms for robustness.
      const encrypted_id = body.encrypted_id ?? body.data?.encrypted_id;
      const vect         = body.vect         ?? body.data?.vect;
      if (!encrypted_id || !vect) {
        return NextResponse.json(
          Utility.formatResponse(400, "Missing encrypted_id or vect in request body"),
          { status: 400 }
        );
      }
      const decrypted = Utility.decryptText(encrypted_id, vect);
      if (!decrypted) {
        return NextResponse.json(Utility.formatResponse(400, "Decryption failed"), { status: 400 });
      }
      // Try JSON.parse; if value is a plain primitive string (e.g. a number encrypted as "5"),
      // return it directly to avoid JSON.parse throwing on non-JSON strings.
      let parsed: unknown;
      try { parsed = JSON.parse(decrypted); } catch { parsed = decrypted; }
      return NextResponse.json(Utility.formatResponse(200, parsed), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // School Class Mapping
  // Body sent from frontend (FormComponent.jsx insertIntoMappingTable call):
  // [school_id(0), class_id(1), section_id(2), subject_ids(3), class_fee(4), class_capacity(5), late_fee(6), late_fee_duration(7)]
  if (endpoint === "create-school-class-mapping") {
    try {
      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const body = await req.json();
      const rawSchoolId = body.school_id ?? body[0];
      const schoolId = rawSchoolId !== undefined && rawSchoolId !== null && rawSchoolId !== ""
        ? parseInt(String(rawSchoolId), 10)
        : (schoolCond.school_id ? parseInt(String(schoolCond.school_id), 10) : undefined);
      // Use explicit named keys first (object form), then fall back to positional array form
      const class_id       = body.class_id       ?? body[1];
      const section_id     = body.section_id     ?? body[2];
      const subject_ids    = String(body.subject_ids    ?? body[3] ?? "");
      const class_fee      = parseFloat(body.class_fee      ?? body[4] ?? 0);
      const class_capacity = parseInt(String(body.class_capacity ?? body[5] ?? 0));
      const late_fee       = parseFloat(body.late_fee       ?? body[6] ?? 0);
      const late_fee_duration = String(body.late_fee_duration ?? body[7] ?? "");

      await prisma.school_class_data.create({
        data: {
          school_id: schoolId,
          class_id: parseInt(String(class_id)),
          section_id: parseInt(String(section_id)),
          class_fee,
          subject_ids,
          late_fee,
          late_fee_duration,
          class_capacity,
        },
      });
      return NextResponse.json(Utility.formatResponse(200, "Created Successfully"), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(409, String(err)), { status: 409 });
    }
  }

  // Teacher Class Mapping
  if (endpoint === "create-teacher-class-mapping") {
    try {
      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = schoolCond.school_id ? parseInt(String(schoolCond.school_id)) : undefined;
      const body = await req.json();
      const teacher_id = body[0] || body.teacher_id;
      const class_id = body[1] || body.class_id;
      const section_id = body[2] || body.section_id;
      const subject_ids = String(body[3] || body.subject_ids || "");

      await prisma.teacher_class_section_subject.create({
        data: {
          school_id: schoolId,
          teacher_id: parseInt(String(teacher_id)),
          class_id: parseInt(String(class_id)),
          section_id: parseInt(String(section_id)),
          subject_ids,
        },
      });
      return NextResponse.json(Utility.formatResponse(200, "Created Successfully"), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(409, String(err)), { status: 409 });
    }
  }

  // Marksheet Data mapping
  if (endpoint === "create-marksheet-data") {
    try {
      const body = await req.json();
      const { marksheet_id, subject_id, marks, max_marks, marks_obtained, total_marks, grade, remark, result } = body;

      const rawMarks = marks !== undefined && marks !== null && String(marks).trim() !== ""
        ? marks
        : marks_obtained !== undefined && marks_obtained !== null && String(marks_obtained).trim() !== ""
        ? marks_obtained
        : null;

      const rawMaxMarks = max_marks !== undefined && max_marks !== null && String(max_marks).trim() !== ""
        ? max_marks
        : total_marks !== undefined && total_marks !== null && String(total_marks).trim() !== ""
        ? total_marks
        : null;

      await prisma.marksheet_data.create({
        data: {
          marksheet_id: parseInt(String(marksheet_id)),
          subject_id: parseInt(String(subject_id)),
          marks: rawMarks !== null ? parseFloat(String(rawMarks)) : null,
          max_marks: rawMaxMarks !== null ? parseFloat(String(rawMaxMarks)) : null,
          grade: grade ? String(grade).trim() : null,
          remark: remark ? String(remark).trim() : null,
          result: result ? String(result).trim() : null,
        },
      });
      return NextResponse.json(Utility.formatResponse(200, "Created Successfully"), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(409, String(err)), { status: 409 });
    }
  }

  // ─── Start Quiz Attempt ──────────────────────────────────────────────────
  if (endpoint === "start-quiz-attempt") {
    try {
      const body = await req.json();
      const quizId = parseInt(String(body.quiz_id), 10);
      if (!quizId) {
        return NextResponse.json(Utility.formatResponse(400, "quiz_id is required"), { status: 400 });
      }

      const quiz = await dbGetQuizById(quizId);
      if (!quiz) {
        return NextResponse.json(Utility.formatResponse(404, "Quiz not found"), { status: 404 });
      }

      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = quiz.school_id || (schoolCond.school_id ? parseInt(String(schoolCond.school_id), 10) : null);

      const authUserId = getAuthUserId(req);
      let studentId = body.student_id ? parseInt(String(body.student_id), 10) : null;
      if (!studentId && authUserId > 0) {
        const student = await prisma.student.findFirst({
          where: { user_id: authUserId },
          select: { id: true },
        });
        if (student) studentId = student.id;
      }

      if (!studentId) {
        return NextResponse.json(Utility.formatResponse(400, "Student identification required to start attempt"), { status: 400 });
      }

      // If not practice quiz, check if already attempted
      if (quiz.quiz_type !== "practice") {
        let existingAttempt: any = null;
        if ((prisma as any).quiz_attempt?.findFirst) {
          existingAttempt = await (prisma as any).quiz_attempt.findFirst({
            where: { quiz_id: quizId, student_id: studentId, submitted_at: { not: null } },
          });
        } else {
          const rows = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id FROM "public"."quiz_attempt" WHERE quiz_id = $1 AND student_id = $2 AND submitted_at IS NOT NULL LIMIT 1`,
            quizId, studentId
          );
          existingAttempt = rows[0] || null;
        }
        if (existingAttempt) {
          return NextResponse.json(Utility.formatResponse(400, "You have already attempted this quiz"), { status: 400 });
        }
      }

      let newAttempt: any = null;
      if ((prisma as any).quiz_attempt?.create) {
        newAttempt = await (prisma as any).quiz_attempt.create({
          data: {
            quiz_id: quizId,
            student_id: studentId,
            school_id: schoolId,
            started_at: new Date(),
            total_marks: quiz.total_marks || 0,
          },
        });
      } else {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `INSERT INTO "public"."quiz_attempt" (quiz_id, student_id, school_id, started_at, total_marks)
           VALUES ($1, $2, $3, NOW(), $4)
           RETURNING *`,
          quizId, studentId, schoolId, quiz.total_marks || 0
        );
        newAttempt = rows[0] || {};
      }

      return NextResponse.json(Utility.formatResponse(200, {
        attempt_id: newAttempt.id,
        quiz_id: quiz.id,
        duration_minutes: quiz.duration_minutes,
        started_at: newAttempt.started_at,
      }), { status: 200 });
    } catch (err) {
      console.error("start-quiz-attempt error:", err);
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // ─── Submit Quiz Attempt ─────────────────────────────────────────────────
  if (endpoint === "submit-quiz-attempt") {
    try {
      const body = await req.json();
      const attemptId = parseInt(String(body.attempt_id), 10);
      const quizId = parseInt(String(body.quiz_id), 10);
      const answers: Array<{ quiz_question_id: number; selected_option: string }> = body.answers || [];
      const timeTakenSeconds = body.time_taken ? parseInt(String(body.time_taken), 10) : null;

      if (!attemptId || !quizId) {
        return NextResponse.json(Utility.formatResponse(400, "attempt_id and quiz_id are required"), { status: 400 });
      }

      const quiz = await dbGetQuizById(quizId);
      if (!quiz) {
        return NextResponse.json(Utility.formatResponse(404, "Quiz not found"), { status: 404 });
      }

      // Fetch questions with correct answers to compute score securely
      const questions = await dbGetQuizQuestions(quizId);

      let totalScore = 0;
      let totalMaxMarks = 0;
      const answerRows: any[] = [];

      for (const q of questions) {
        const qMarks = q.marks !== undefined && q.marks !== null ? Number(q.marks) : 1;
        totalMaxMarks += qMarks;

        const submittedAns = answers.find(a => a.quiz_question_id === q.id);
        const selectedOption = submittedAns?.selected_option || null;
        const isCorrect = selectedOption && q.correct_option
          ? selectedOption.toLowerCase().trim() === q.correct_option.toLowerCase().trim()
          : false;
        const marksAwarded = isCorrect ? qMarks : 0;
        if (isCorrect) totalScore += qMarks;

        answerRows.push({
          attempt_id: attemptId,
          quiz_question_id: q.id,
          selected_option: selectedOption,
          is_correct: isCorrect,
          marks_awarded: marksAwarded,
        });
      }

      // Save answers
      if ((prisma as any).quiz_attempt_answer?.deleteMany) {
        await (prisma as any).quiz_attempt_answer.deleteMany({ where: { attempt_id: attemptId } });
        if (answerRows.length > 0) {
          await (prisma as any).quiz_attempt_answer.createMany({
            data: answerRows,
          });
        }
      } else {
        await prisma.$executeRawUnsafe(`DELETE FROM "public"."quiz_attempt_answer" WHERE attempt_id = $1`, attemptId);
        for (const ans of answerRows) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "public"."quiz_attempt_answer" (attempt_id, quiz_question_id, selected_option, is_correct, marks_awarded)
             VALUES ($1, $2, $3, $4, $5)`,
            ans.attempt_id, ans.quiz_question_id, ans.selected_option, ans.is_correct, ans.marks_awarded
          );
        }
      }

      const percentage = totalMaxMarks > 0 ? parseFloat(((totalScore / totalMaxMarks) * 100).toFixed(2)) : 0;
      let rawPassingMarks = quiz.passing_marks ?? (totalMaxMarks * 0.4);
      if (rawPassingMarks > totalMaxMarks && totalMaxMarks > 0) {
        rawPassingMarks = (rawPassingMarks / 100) * totalMaxMarks;
      }
      const isPassed = totalScore >= rawPassingMarks || percentage >= 50;
      const resultStatus = isPassed ? "pass" : "fail";

      let updatedAttempt: any = null;
      if ((prisma as any).quiz_attempt?.update) {
        updatedAttempt = await (prisma as any).quiz_attempt.update({
          where: { id: attemptId },
          data: {
            submitted_at: new Date(),
            score: totalScore,
            total_marks: totalMaxMarks,
            percentage,
            result: resultStatus,
            time_taken: timeTakenSeconds,
          },
        });
      } else {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `UPDATE "public"."quiz_attempt"
           SET submitted_at = NOW(), score = $1, total_marks = $2, percentage = $3, result = $4, time_taken = $5
           WHERE id = $6
           RETURNING *`,
          totalScore, totalMaxMarks, percentage, resultStatus, timeTakenSeconds, attemptId
        );
        updatedAttempt = rows[0] || {};
      }

      // If passed and quiz has reward gift, provision pending gift claim
      let giftClaimCreated: any = null;
      if (isPassed && quiz.reward_gift && updatedAttempt.student_id) {
        let existingClaim: any = null;
        if ((prisma as any).gift_claim?.findFirst) {
          existingClaim = await (prisma as any).gift_claim.findFirst({
            where: { attempt_id: attemptId },
          });
        } else {
          const rows = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id FROM "public"."gift_claim" WHERE attempt_id = $1 LIMIT 1`,
            attemptId
          );
          existingClaim = rows[0] || null;
        }

        if (!existingClaim) {
          const claimCode = `GIFT-${quiz.id}-${updatedAttempt.student_id}-${Math.floor(1000 + Math.random() * 9000)}`;
          if ((prisma as any).gift_claim?.create) {
            giftClaimCreated = await (prisma as any).gift_claim.create({
              data: {
                school_id: quiz.school_id,
                student_id: updatedAttempt.student_id,
                quiz_id: quiz.id,
                attempt_id: attemptId,
                gift_title: quiz.reward_gift,
                reward_points: Math.round(totalScore * 10),
                status: "pending",
                claim_code: claimCode,
                remarks: `Earned by passing quiz: ${quiz.title}`,
                created_at: new Date(),
                updated_at: new Date(),
              },
            });
          } else {
            const rows = await prisma.$queryRawUnsafe<any[]>(
              `INSERT INTO "public"."gift_claim" (school_id, student_id, quiz_id, attempt_id, gift_title, reward_points, status, claim_code, remarks, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, NOW(), NOW())
               RETURNING *`,
              quiz.school_id, updatedAttempt.student_id, quiz.id, attemptId, quiz.reward_gift, Math.round(totalScore * 10), claimCode, `Earned by passing quiz: ${quiz.title}`
            );
            giftClaimCreated = rows[0] || null;
          }
        }
      }

      return NextResponse.json(Utility.formatResponse(200, {
        attempt: updatedAttempt,
        total_score: totalScore,
        total_marks: totalMaxMarks,
        percentage,
        result: resultStatus,
        reward_gift: quiz.reward_gift || null,
        gift_claim: giftClaimCreated || null,
      }), { status: 200 });
    } catch (err) {
      console.error("submit-quiz-attempt error:", err);
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // ─── Bulk Create / Replace Quiz Questions ─────────────────────────────────
  if (endpoint === "create-quiz-questions") {
    try {
      const body = await req.json();
      const quizId = parseInt(String(body.quiz_id), 10);
      const questions: any[] = body.questions || [];

      if (!quizId) {
        return NextResponse.json(Utility.formatResponse(400, "quiz_id is required"), { status: 400 });
      }

      if (body.replace === true) {
        if ((prisma as any).quiz_question?.deleteMany) {
          await (prisma as any).quiz_question.deleteMany({ where: { quiz_id: quizId } });
        } else {
          await prisma.$executeRawUnsafe(`DELETE FROM "public"."quiz_question" WHERE quiz_id = $1`, quizId);
        }
      }

      let totalQuizMarks = 0;
      const questionData = questions.map((q, idx) => {
        const marks = q.marks !== undefined && q.marks !== null ? parseFloat(String(q.marks)) : 1;
        totalQuizMarks += marks;
        return {
          quiz_id: quizId,
          question_bank_id: q.question_bank_id ? parseInt(String(q.question_bank_id), 10) : null,
          question_text: String(q.question_text || ""),
          option_a: String(q.option_a || ""),
          option_b: String(q.option_b || ""),
          option_c: String(q.option_c || ""),
          option_d: String(q.option_d || ""),
          correct_option: String(q.correct_option || "option_a"),
          marks,
          order_index: q.order_index ?? idx + 1,
        };
      });

      if (questionData.length > 0) {
        if ((prisma as any).quiz_question?.createMany) {
          await (prisma as any).quiz_question.createMany({
            data: questionData,
          });
        } else {
          for (const q of questionData) {
            await prisma.$executeRawUnsafe(
              `INSERT INTO "public"."quiz_question" (quiz_id, question_bank_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, order_index)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              q.quiz_id, q.question_bank_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.marks, q.order_index
            );
          }
        }
      }

      // Update quiz total_marks
      if ((prisma as any).quiz?.update) {
        await (prisma as any).quiz.update({
          where: { id: quizId },
          data: {
            total_marks: totalQuizMarks,
            updated_at: new Date(),
          },
        });
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE "public"."quiz" SET total_marks = $1, updated_at = NOW() WHERE id = $2`,
          totalQuizMarks,
          quizId
        );
      }

      return NextResponse.json(Utility.formatResponse(200, {
        message: "Questions saved successfully",
        total_questions: questionData.length,
        total_marks: totalQuizMarks,
      }), { status: 200 });
    } catch (err) {
      console.error("create-quiz-questions error:", err);
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // ─── Claim / Redeem Gift Claim ───────────────────────────────────────────
  if (endpoint === "claim-gift") {
    try {
      const body = await req.json();
      const claimId = parseInt(String(body.claim_id || body.id), 10);
      if (!claimId) {
        return NextResponse.json(Utility.formatResponse(400, "claim_id is required"), { status: 400 });
      }

      const updated = await prisma.gift_claim.update({
        where: { id: claimId },
        data: {
          status: body.status || "claimed",
          claimed_at: new Date(),
          remarks: body.remarks || undefined,
          updated_at: new Date(),
        },
      });

      return NextResponse.json(Utility.formatResponse(200, updated), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Generic Create Handler for create-X endpoints
  if (endpoint.startsWith("create-")) {
    const entityKey = endpoint.replace("create-", "");
    const mapping = MODEL_MAPPING[entityKey];
    if (mapping) {
      const userId = getAuthUserId(req);
      return genericCreate(req, mapping.model, userId, true);
    }
  }

  return NextResponse.json(Utility.formatResponse(404, `Endpoint ${endpoint} not found`), { status: 404 });
}

async function handlePatch(req: NextRequest, endpoint: string) {
  // Generic Update Handler for update-X endpoints
  if (endpoint.startsWith("update-")) {
    const entityKey = endpoint.replace("update-", "");
    const mapping = MODEL_MAPPING[entityKey];
    if (mapping) {
      const userId = getAuthUserId(req);
      return genericUpdate(req, mapping.model, userId);
    }
  }

  return NextResponse.json(Utility.formatResponse(404, `Endpoint ${endpoint} not found`), { status: 404 });
}

async function handleDelete(req: NextRequest, endpoint: string) {
  // Delete image endpoint
  if (endpoint === "delete-image" || endpoint.startsWith("delete-image/")) {
    try {
      const body = await req.json().catch(() => ({}));
      const parts = endpoint.split("/");
      const parentId = parseInt(String(body?.parent_id || parts[2] || ""), 10);
      if (isNaN(parentId)) {
        return NextResponse.json(Utility.formatResponse(400, "Invalid parent_id"), { status: 400 });
      }

      const rawParent = body?.parent || parts[1];
      const parents: string[] = Array.isArray(rawParent)
        ? rawParent
        : rawParent
        ? [rawParent]
        : [];

      const imageType = body?.type || null;

      if (parents.length > 0) {
        for (const p of parents) {
          if (imageType) {
            await prisma.$executeRawUnsafe(
              `DELETE FROM "public"."image" WHERE "parent" = CAST($1::text AS "public"."ImageParent") AND "parent_id" = $2 AND "type" = CAST($3::text AS "public"."ImageType")`,
              p,
              parentId,
              imageType
            );
          } else {
            await prisma.$executeRawUnsafe(
              `DELETE FROM "public"."image" WHERE "parent" = CAST($1::text AS "public"."ImageParent") AND "parent_id" = $2`,
              p,
              parentId
            );
          }
        }
      }
      return NextResponse.json(Utility.formatResponse(200, "Deleted Successfully"), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Delete from marksheet mapping
  if (endpoint === "delete-from-marksheet-mapping") {
    try {
      const body = await req.json();
      if (body?.marksheet_id) {
        await prisma.marksheet_data.deleteMany({
          where: { marksheet_id: parseInt(String(body.marksheet_id)) },
        });
      }
      return NextResponse.json(Utility.formatResponse(200, "Deleted Successfully"), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Delete from school mapping
  if (endpoint === "delete-from-school-mapping") {
    try {
      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const body = await req.json().catch(() => ({}));
      const rawSchoolId = body?.school_id;
      const schoolId = rawSchoolId !== undefined && rawSchoolId !== null && rawSchoolId !== ""
        ? parseInt(String(rawSchoolId), 10)
        : (schoolCond.school_id ? parseInt(String(schoolCond.school_id), 10) : undefined);
      const where: any = {};
      if (schoolId) where.school_id = schoolId;
      if (body?.class_id) where.class_id = parseInt(String(body.class_id));
      if (body?.section_id) where.section_id = parseInt(String(body.section_id));
      await prisma.school_class_data.deleteMany({ where });
      return NextResponse.json(Utility.formatResponse(200, "Deleted Successfully"), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Delete from teacher mapping
  if (endpoint === "delete-from-teacher-mapping") {
    try {
      const schoolCond = Utility.getSchoolIdFromHeader(req);
      const schoolId = schoolCond.school_id ? parseInt(String(schoolCond.school_id)) : undefined;
      const body = await req.json();
      const where: any = {};
      if (schoolId) where.school_id = schoolId;
      if (body?.teacher_id) where.teacher_id = parseInt(String(body.teacher_id));
      if (body?.class_id) where.class_id = parseInt(String(body.class_id));
      if (body?.section_id) where.section_id = parseInt(String(body.section_id));
      await prisma.teacher_class_section_subject.deleteMany({ where });
      return NextResponse.json(Utility.formatResponse(200, "Deleted Successfully"), { status: 200 });
    } catch (err) {
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Generic delete by Primary Key: /delete-by-pk/:model/:id
  if (endpoint.startsWith("delete-by-pk/") || endpoint === "delete-by-pk") {
    try {
      const parts = endpoint.split("/");
      let modelKey = parts[1] || "";
      let idStr = parts[2] || "";

      if (!idStr) {
        const url = new URL(req.url);
        idStr = url.searchParams.get("id") || "";
      }

      if (!idStr) {
        const body = await req.json().catch(() => ({}));
        idStr = String(body?.id || "");
        if (!modelKey) modelKey = String(body?.model || "");
      }

      const id = parseInt(idStr, 10);
      if (isNaN(id)) {
        return NextResponse.json(Utility.formatResponse(400, "Invalid primary key ID"), { status: 400 });
      }

      const mapping = MODEL_MAPPING[modelKey];
      const modelName = mapping ? mapping.model : modelKey.replace(/-/g, "_");

      if (modelName === "quiz") {
        const attempts = await prisma.quiz_attempt.findMany({ where: { quiz_id: id }, select: { id: true } });
        const attemptIds = attempts.map(a => a.id);
        if (attemptIds.length > 0) {
          await prisma.quiz_attempt_answer.deleteMany({ where: { attempt_id: { in: attemptIds } } });
        }
        await prisma.quiz_attempt.deleteMany({ where: { quiz_id: id } });
        await prisma.quiz_question.deleteMany({ where: { quiz_id: id } });
        await prisma.gift_claim.deleteMany({ where: { quiz_id: id } });
      }

      if ((prisma as any)[modelName]) {
        await (prisma as any)[modelName].delete({
          where: { id },
        });
        return NextResponse.json(Utility.formatResponse(200, "Deleted Successfully"), { status: 200 });
      } else {
        await prisma.$executeRawUnsafe(`DELETE FROM "public"."${modelName}" WHERE id = $1`, id);
        return NextResponse.json(Utility.formatResponse(200, "Deleted Successfully"), { status: 200 });
      }
    } catch (err: any) {
      if (err?.code === "P2025") {
        return NextResponse.json(Utility.formatResponse(200, "Deleted Successfully"), { status: 200 });
      }
      return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
    }
  }

  // Generic delete for delete-:entityKey/:id (e.g. delete-timetable/123)
  if (endpoint.startsWith("delete-")) {
    const afterDelete = endpoint.replace("delete-", "");
    const parts = afterDelete.split("/");
    if (parts.length >= 2) {
      const entityKey = parts[0];
      const id = parseInt(parts[1], 10);
      if (!isNaN(id)) {
        const mapping = MODEL_MAPPING[entityKey];
        const modelName = mapping ? mapping.model : entityKey.replace(/-/g, "_");
        if ((prisma as any)[modelName]) {
          try {
            await (prisma as any)[modelName].delete({ where: { id } });
            return NextResponse.json(Utility.formatResponse(200, "Deleted Successfully"), { status: 200 });
          } catch (err: any) {
            if (err?.code === "P2025") {
              return NextResponse.json(Utility.formatResponse(200, "Deleted Successfully"), { status: 200 });
            }
            return NextResponse.json(Utility.formatResponse(500, String(err)), { status: 500 });
          }
        }
      }
    }
  }

  return NextResponse.json(Utility.formatResponse(404, `Endpoint ${endpoint} not found`), { status: 404 });
}

export async function GET(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const r = applyRateLimit(req); if (r) return r;
  const { slug } = await context.params;
  const endpoint = slug.join("/");
  return handleGet(req, endpoint, slug);
}

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const r = applyRateLimit(req); if (r) return r;
  const { slug } = await context.params;
  const endpoint = slug.join("/");
  return handlePost(req, endpoint);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const r = applyRateLimit(req); if (r) return r;
  const { slug } = await context.params;
  const endpoint = slug.join("/");
  return handlePatch(req, endpoint);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const r = applyRateLimit(req); if (r) return r;
  const { slug } = await context.params;
  const endpoint = slug.join("/");
  return handleDelete(req, endpoint);
}
