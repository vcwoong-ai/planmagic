import OpenAI from "openai";

// 빌드 타임이 아닌 요청 시점에 클라이언트 생성
export function getOpenRouterClient() {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || "dummy",
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "PlanMagic",
    },
  });
}

// 공고문 파싱용 — 빠르고 저렴한 모델
export const PARSE_MODEL =
  process.env.OPENROUTER_PARSE_MODEL || "google/gemini-2.5-flash-lite";

// 사업계획서 생성용 — 고품질 모델
export const GENERATE_MODEL =
  process.env.OPENROUTER_GENERATE_MODEL || "google/gemini-2.5-flash";
