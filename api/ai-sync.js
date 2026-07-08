const ALLOWED_SUBJECTS = ["Higher Math", "Physics", "Chemistry", "Biology", "Bangla", "English", "ICT"];
const ALLOWED_CLASS_TYPES = ["Detailed", "Advanced", "Admission", "FRB", "One Shot", "Revision", "Custom"];
const DEFAULT_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    updates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          studyQuality: { type: "number", nullable: true },
          classDurationMinutes: { type: "number", nullable: true },
          studyDurationMinutes: { type: "number", nullable: true },
          selfStudyMinutes: { type: "number", nullable: true },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                subject: { type: "string" },
                paper: { type: "number", nullable: true },
                chapter: { type: "number", nullable: true },
                chapterLabel: { type: "string" },
                classType: { type: "string" },
                lectures: { type: "array", items: { type: "number" } },
                lectureRange: {
                  type: "object",
                  nullable: true,
                  properties: {
                    from: { type: "number" },
                    to: { type: "number" },
                  },
                },
                totalLectures: { type: "number", nullable: true },
                completionPercent: { type: "number" },
                isRevision: { type: "boolean" },
                rawLine: { type: "string" },
              },
            },
          },
          warnings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                message: { type: "string" },
                rawLine: { type: "string" },
              },
            },
          },
          questions: { type: "array", items: { type: "string" } },
        },
      },
    },
    globalWarnings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          message: { type: "string" },
          rawLine: { type: "string" },
        },
      },
    },
  },
};

const normalizeText = (value = "") =>
  String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const normalizeSubject = (subject = "") => {
  const key = normalizeText(subject);
  if (["math", "highermath", "hmath", "hm"].includes(key)) return "Higher Math";
  if (["physics", "phy"].includes(key)) return "Physics";
  if (["chemistry", "chem"].includes(key)) return "Chemistry";
  if (["biology", "bio"].includes(key)) return "Biology";
  if (["bangla", "bn", "bengali"].includes(key)) return "Bangla";
  if (["english", "eng", "en"].includes(key)) return "English";
  if (["ict", "informationcommunicationtechnology"].includes(key)) return "ICT";
  return "";
};

const normalizeClassType = (type = "") => {
  const key = normalizeText(type);
  if (["advanced", "adv"].includes(key)) return "Advanced";
  if (["admission", "adm"].includes(key)) return "Admission";
  if (key === "frb") return "FRB";
  if (["oneshot", "1shot", "oshot", "os"].includes(key)) return "One Shot";
  if (["revision", "rev"].includes(key)) return "Revision";
  if (key === "custom") return "Custom";
  if (["detailed", "detail", "dl"].includes(key)) return "Detailed";
  return "Detailed";
};

const warningObject = (message, rawLine = "") => ({
  message: String(message || ""),
  rawLine: String(rawLine || ""),
});

const normalizeWarning = (warning) => {
  if (!warning) return null;
  if (typeof warning === "string") return warningObject(warning);
  if (typeof warning === "object") {
    const message = warning.message ? String(warning.message) : "";
    const rawLine = warning.rawLine ? String(warning.rawLine) : "";
    return message ? warningObject(message, rawLine) : null;
  }
  return warningObject(String(warning));
};

const warningArray = (value) =>
  Array.isArray(value) ? value.map(normalizeWarning).filter(Boolean) : [];

const stringArray = (value) =>
  Array.isArray(value) ? value.map((item) => String(item || "")).filter(Boolean) : [];

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const intOrNull = (value) => {
  const n = numberOrNull(value);
  return n === null ? null : Math.round(n);
};

const clampPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const safeParseJson = (text) => {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("AI returned invalid JSON");
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const object = trimmed.match(/({[\s\S]*})/);
    const candidate = fenced?.[1] || object?.[1];
    if (!candidate) throw new Error("AI returned invalid JSON");
    return JSON.parse(candidate);
  }
};

const lectureKeysForItem = (item) => {
  const base = `${item.subject}|P${item.paper || "?"}|C${item.chapter || "?"}|${item.classType}`;
  if (item.lectureRange) {
    const keys = [];
    for (let n = item.lectureRange.from; n <= item.lectureRange.to; n += 1) {
      keys.push(`${base}|L${n}`);
    }
    return keys;
  }
  return (item.lectures || []).map((lecture) => `${base}|L${lecture}`);
};

const validateParsed = (parsed) => {
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.updates)) {
    throw new Error("AI returned invalid JSON");
  }

  const globalWarnings = warningArray(parsed.globalWarnings);
  const updates = parsed.updates.map((update, updateIndex) => {
    if (!update || typeof update !== "object") {
      globalWarnings.push(warningObject(`Skipped invalid update block ${updateIndex + 1}.`));
      return null;
    }

    const date = String(update.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("AI returned invalid JSON");
    }

    const updateWarnings = warningArray(update.warnings);
    const items = Array.isArray(update.items) ? update.items.map((item, itemIndex) => {
      if (!item || typeof item !== "object") {
        updateWarnings.push(warningObject(`Skipped invalid item ${itemIndex + 1}.`));
        return null;
      }

      const subject = normalizeSubject(item.subject);
      if (!ALLOWED_SUBJECTS.includes(subject)) {
        updateWarnings.push(warningObject(`Skipped unknown subject "${item.subject || ""}".`, item.rawLine || ""));
        return null;
      }

      const classType = normalizeClassType(item.classType);
      const paper = intOrNull(item.paper);
      const chapter = intOrNull(item.chapter);
      const totalLectures = intOrNull(item.totalLectures);
      const lectures = Array.isArray(item.lectures)
        ? item.lectures.map((n) => parseInt(n, 10)).filter((n) => Number.isInteger(n) && n > 0)
        : [];
      const maybeRange = item.lectureRange && typeof item.lectureRange === "object"
        ? { from: intOrNull(item.lectureRange.from), to: intOrNull(item.lectureRange.to) }
        : null;
      const lectureRange = maybeRange && maybeRange.from && maybeRange.to && maybeRange.to >= maybeRange.from
        ? maybeRange
        : null;

      return {
        subject,
        paper: paper === 1 || paper === 2 ? paper : null,
        chapter: chapter && chapter > 0 ? chapter : null,
        chapterLabel: item.chapterLabel ? String(item.chapterLabel) : (chapter ? `C${chapter}` : ""),
        classType: ALLOWED_CLASS_TYPES.includes(classType) ? classType : "Detailed",
        lectures,
        lectureRange,
        totalLectures: totalLectures && totalLectures > 0 ? totalLectures : null,
        completionPercent: clampPercent(item.completionPercent),
        isRevision: item.isRevision === true || classType === "Revision",
        rawLine: String(item.rawLine || ""),
      };
    }).filter(Boolean) : [];

    const duplicateSeen = new Map();
    items.forEach((item) => {
      lectureKeysForItem(item).forEach((key) => {
        if (duplicateSeen.has(key)) {
          const previous = duplicateSeen.get(key);
          const highest = Math.max(previous.completionPercent || 0, item.completionPercent || 0);
          previous.completionPercent = highest;
          item.completionPercent = highest;
          updateWarnings.push(warningObject(
            `Duplicate lecture detected for ${item.subject} ${item.paper ? `P${item.paper}` : ""}${item.chapterLabel || ""} ${key.split("|").pop()}. Highest completion was kept.`,
            item.rawLine
          ));
        } else {
          duplicateSeen.set(key, item);
        }
      });
    });

    return {
      date,
      studyQuality: numberOrNull(update.studyQuality),
      classDurationMinutes: numberOrNull(update.classDurationMinutes),
      studyDurationMinutes: numberOrNull(update.studyDurationMinutes),
      selfStudyMinutes: numberOrNull(update.selfStudyMinutes),
      items,
      warnings: updateWarnings,
      questions: stringArray(update.questions),
    };
  }).filter(Boolean);

  return { updates, globalWarnings };
};

const buildPrompt = ({ rawText, currentSyllabus, userTimezone }) => {
  const syllabusText = JSON.stringify(currentSyllabus || {}).slice(0, 20000);
  return `You are the AI Smart Sync parser for HSC Study OS.

Return JSON only. Do not return markdown. Do not return explanation.

Use this exact response schema:
{
  "updates": [
    {
      "date": "YYYY-MM-DD",
      "studyQuality": number or null,
      "classDurationMinutes": number or null,
      "studyDurationMinutes": number or null,
      "selfStudyMinutes": number or null,
      "items": [
        {
          "subject": "Higher Math | Physics | Chemistry | Biology | Bangla | English | ICT",
          "paper": 1 or 2 or null,
          "chapter": number or null,
          "chapterLabel": "C7",
          "classType": "Detailed | Advanced | Admission | FRB | One Shot | Revision | Custom",
          "lectures": [number],
          "lectureRange": {"from": number, "to": number} or null,
          "totalLectures": number or null,
          "completionPercent": number,
          "isRevision": boolean,
          "rawLine": string
        }
      ],
      "warnings": [{"message": string, "rawLine": string}],
      "questions": [string]
    }
  ],
  "globalWarnings": [{"message": string, "rawLine": string}]
}

Rules:
- User timezone: ${userTimezone || "Asia/Dhaka"}.
- Math means Higher Math.
- P1C7 means Paper 1 Chapter 7.
- Lec1/17 means lecture 1 out of 17.
- Lec1-10 Rev means revision, not new full class progress unless clearly stated.
- 4hrs = 240 minutes.
- 3:45hrs = 225 minutes.
- Multiple 🚀Update blocks must be parsed separately.
- If typo is likely, add warning or question.
- Example: Chemistry C2C2 probably means Chemistry P2C2.
- If duplicate lecture appears, keep the highest progress and add warning.
- completionPercent defaults to 100 when completed/checkmarked and no percentage is stated.
- Preserve every original parsed subject line in rawLine.

Current syllabus snapshot:
${syllabusText}

Raw study update text:
${rawText}`;
};

const buildRepairPrompt = (rawText) => `Repair this into valid JSON matching the HSC Study OS AI Smart Sync schema. Return JSON only. No markdown. No explanation.

Invalid response:
${rawText}`;

const callGemini = async ({ apiKey, model, prompt }) => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `Gemini request failed with HTTP ${response.status}.`;
    console.log("[ai-sync] Gemini error:", message);
    throw new Error(message);
  }

  return (payload?.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();
};

const getModelCandidates = () => {
  const configured = String(process.env.GEMINI_MODEL || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_MODELS;
};

const callGeminiWithFallback = async ({ apiKey, prompt }) => {
  const models = getModelCandidates();
  let lastError = null;
  for (const model of models) {
    try {
      console.log("[ai-sync] trying model:", model);
      const text = await callGemini({ apiKey, model, prompt });
      return { text, model };
    } catch (error) {
      lastError = error;
      console.log("[ai-sync] model failed:", model, error?.message || "Unknown model error");
    }
  }
  throw lastError || new Error("Gemini request failed.");
};

const parseRequestBody = (req) => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return {};
};

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Only POST is supported." });
  }

  console.log("[ai-sync] request received");

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("[ai-sync] Gemini API key missing");
      return res.status(500).json({ ok: false, message: "Gemini API key missing" });
    }

    const body = parseRequestBody(req);
    const rawText = String(body.rawText || "").trim();
    console.log("[ai-sync] rawText length:", rawText.length);

    if (!rawText) {
      return res.status(400).json({ ok: false, message: "rawText is required." });
    }
    if (rawText.length > 16000) {
      return res.status(400).json({ ok: false, message: "rawText is too long. Split the update into smaller batches." });
    }

    const prompt = buildPrompt({
      rawText,
      currentSyllabus: body.currentSyllabus || {},
      userTimezone: body.userTimezone || "Asia/Dhaka",
    });

    const first = await callGeminiWithFallback({ apiKey, prompt });
    const firstText = first.text;
    let parsed;

    try {
      parsed = validateParsed(safeParseJson(firstText));
    } catch (firstError) {
      console.log("[ai-sync] first parse failed:", firstError.message);
      const repairedText = await callGemini({ apiKey, model: first.model, prompt: buildRepairPrompt(firstText) });
      try {
        parsed = validateParsed(safeParseJson(repairedText));
      } catch (repairError) {
        console.log("[ai-sync] repair parse failed:", repairError.message);
        return res.status(502).json({ ok: false, message: "AI returned invalid JSON" });
      }
    }

    console.log("[ai-sync] parsed update blocks:", parsed.updates.length);
    return res.status(200).json({ ok: true, parsed });
  } catch (error) {
    console.log("[ai-sync] error:", error?.message || "Unknown AI Sync error");
    return res.status(500).json({
      ok: false,
      message: error?.message || "AI Smart Sync failed.",
    });
  }
};
