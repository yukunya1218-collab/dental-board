import { VERDICTS, type Classification, type Verdict } from "@/lib/line/types";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// 呼べるモデルが変わっても止まらないよう、先頭から順に試して最初に成功したものを使う。
const DEFAULT_MODELS = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.0-flash"];

function modelCandidates(): string[] {
  const preferred = process.env.GEMINI_MODEL;
  const candidates = preferred ? [preferred] : [];
  for (const m of DEFAULT_MODELS) {
    if (!candidates.includes(m)) candidates.push(m);
  }
  return candidates;
}

/** ```json フェンスや前後の説明文が付いていても中のJSONを取り出す */
export function extractJsonObject(text: string): unknown {
  let body = text.trim();
  body = body.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`JSONが見つかりませんでした: ${text.slice(0, 200)}`);
  }
  return JSON.parse(body.slice(start, end + 1));
}

function toConfidence(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.min(1, Math.max(0, raw > 1 ? raw / 100 : raw));
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    const num = Number(trimmed.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(num) && trimmed.match(/[0-9]/)) {
      return Math.min(1, Math.max(0, num > 1 ? num / 100 : num));
    }
    if (trimmed.includes("高")) return 0.9;
    if (trimmed.includes("中")) return 0.6;
    if (trimmed.includes("低")) return 0.3;
  }
  return 0.5;
}

function toVerdict(raw: unknown): Verdict {
  const value = typeof raw === "string" ? raw.trim() : "";
  const hit = VERDICTS.find((v) => value === v || value.includes(v));
  // 判定不能な値でも取りこぼしを避けるため「依頼」ではなく「無関係」には落とさず、
  // 呼び出し側が未分類として扱えるようにここでは例外にする。
  if (!hit) throw new Error(`種別が不正です: ${value || "(空)"}`);
  return hit;
}

function toNullableString(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "null" || trimmed === "なし") return null;
  return trimmed;
}

export function normalizeClassification(parsed: unknown): Classification {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("JSONオブジェクトではありませんでした");
  }
  const obj = parsed as Record<string, unknown>;
  const deadlineRaw = toNullableString(obj["期限"]);
  const deadline = deadlineRaw && /^\d{4}-\d{2}-\d{2}/.test(deadlineRaw) ? deadlineRaw.slice(0, 10) : null;
  return {
    verdict: toVerdict(obj["種別"]),
    targetShortId: toNullableString(obj["対象依頼ID"]),
    deadline,
    confidence: toConfidence(obj["確度"]),
    reason: toNullableString(obj["理由"]) ?? "",
  };
}

function extractText(payload: unknown): string {
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates;
  const parts = candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  if (!text.trim()) throw new Error("Geminiの応答が空でした");
  return text;
}

export interface ClassifyOutcome {
  classification: Classification | null;
  model: string | null;
  error: string | null;
}

/**
 * Gemini を fetch で直接叩く。SDKは入れない。
 * 失敗しても例外は投げず error を返す（メッセージ自体を失わないため）。
 */
export async function classifyWithGemini(prompt: string): Promise<ClassifyOutcome> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { classification: null, model: null, error: "GEMINI_API_KEY が未設定です" };
  }

  let lastError = "原因不明";
  for (const model of modelCandidates()) {
    try {
      const res = await fetch(`${API_BASE}/${model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        const detail = (await res.text()).slice(0, 300);
        lastError = `${model}: HTTP ${res.status} ${detail}`;
        continue;
      }

      const classification = normalizeClassification(extractJsonObject(extractText(await res.json())));
      return { classification, model, error: null };
    } catch (err) {
      lastError = `${model}: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return { classification: null, model: null, error: lastError };
}
