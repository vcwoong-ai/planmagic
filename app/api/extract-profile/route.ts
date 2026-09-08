import { NextRequest, NextResponse } from "next/server";
import { getOpenRouterClient, PARSE_MODEL } from "@/lib/openrouter";
import { buildExtractProfilePrompt } from "@/lib/prompts";
import { InterviewAnswers } from "@/types";

export const maxDuration = 60;

interface ExtractProfileRequest {
  fileBase64?: string;
  fileName?: string;
  url?: string;
  announcementTitle: string;
}

interface ExtractProfileResponse {
  success: boolean;
  answers?: Partial<InterviewAnswers>;
  filledCount?: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { fileBase64, fileName, url, announcementTitle }: ExtractProfileRequest =
      await request.json();

    if (!fileBase64 && !url) {
      return NextResponse.json<ExtractProfileResponse>(
        { success: false, error: "파일 또는 URL이 필요합니다." },
        { status: 400 }
      );
    }

    let extractedText = "";

    if (url) {
      // URL에서 텍스트 추출
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; PlanMagic/1.0)" },
          signal: AbortSignal.timeout(10000),
        });
        const html = await res.text();
        // HTML 태그 제거, 스크립트/스타일 제거
        extractedText = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      } catch {
        return NextResponse.json<ExtractProfileResponse>(
          { success: false, error: "URL에 접근할 수 없습니다. 직접 URL을 확인해주세요." },
          { status: 422 }
        );
      }
    } else if (fileBase64) {
      if (fileName?.toLowerCase().endsWith(".pdf")) {
        // DOMMatrix polyfill
        if (typeof globalThis.DOMMatrix === "undefined") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (globalThis as any).DOMMatrix = class DOMMatrix {
            a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
            m11 = 1; m12 = 0; m13 = 0; m14 = 0;
            m21 = 0; m22 = 1; m23 = 0; m24 = 0;
            m31 = 0; m32 = 0; m33 = 1; m34 = 0;
            m41 = 0; m42 = 0; m43 = 0; m44 = 1;
            is2D = true; isIdentity = true;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            constructor(_init?: string | number[]) {}
            static fromMatrix() { return new DOMMatrix(); }
            static fromFloat32Array() { return new DOMMatrix(); }
            static fromFloat64Array() { return new DOMMatrix(); }
            multiply() { return this; }
            translate() { return this; }
            scale() { return this; }
            rotate() { return this; }
            rotateAxisAngle() { return this; }
            skewX() { return this; }
            skewY() { return this; }
            flipX() { return this; }
            flipY() { return this; }
            inverse() { return this; }
            transformPoint() { return { x: 0, y: 0, z: 0, w: 1 }; }
            toFloat32Array() { return new Float32Array(16); }
            toFloat64Array() { return new Float64Array(16); }
            toString() { return "matrix(1,0,0,1,0,0)"; }
            toJSON() { return {}; }
          };
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse");
        const buffer = Buffer.from(fileBase64, "base64");
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;
      } else {
        extractedText = Buffer.from(fileBase64, "base64").toString("utf-8");
      }
    }

    // 제어문자 제거 (AI JSON 생성 오류 방지)
    extractedText = extractedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    if (!extractedText.trim()) {
      return NextResponse.json<ExtractProfileResponse>(
        { success: false, error: "자료에서 텍스트를 추출할 수 없습니다." },
        { status: 422 }
      );
    }

    const completion = await getOpenRouterClient().chat.completions.create({
      model: PARSE_MODEL,
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: buildExtractProfilePrompt(extractedText, announcementTitle),
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json<ExtractProfileResponse>(
        { success: false, error: "자료에서 정보를 추출하지 못했습니다." },
        { status: 422 }
      );
    }

    let answers: Partial<InterviewAnswers>;
    try {
      answers = JSON.parse(jsonMatch[0]);
    } catch {
      const cleaned = jsonMatch[0].replace(/\r\n/g, " ").replace(/\r/g, " ").replace(/\n/g, " ").replace(/\t/g, " ");
      try {
        answers = JSON.parse(cleaned);
      } catch {
        const stripped = cleaned.replace(/[\x00-\x1F\x7F]/g, " ");
        try {
          answers = JSON.parse(stripped);
        } catch {
          return NextResponse.json<ExtractProfileResponse>(
            { success: false, error: "자료에서 정보를 추출하지 못했습니다. 다시 시도해주세요." },
            { status: 422 }
          );
        }
      }
    }

    // 빈 문자열 필드 제거
    const filledAnswers = Object.fromEntries(
      Object.entries(answers).filter(([, v]) => typeof v === "string" && v.trim().length > 0)
    ) as Partial<InterviewAnswers>;

    const filledCount = Object.keys(filledAnswers).length;

    return NextResponse.json<ExtractProfileResponse>({
      success: true,
      answers: filledAnswers,
      filledCount,
    });
  } catch (error) {
    console.error("ExtractProfile error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json<ExtractProfileResponse>(
      { success: false, error: `서버 오류: ${msg}` },
      { status: 500 }
    );
  }
}
