import { NextRequest, NextResponse } from "next/server";
import { getOpenRouterClient, PARSE_MODEL } from "@/lib/openrouter";
import { TemplateSection } from "@/types";

export const maxDuration = 60;

interface ParseTemplateRequest {
  fileBase64: string;
  fileName: string;
}

interface ParseTemplateResponse {
  success: boolean;
  sections?: TemplateSection[];
  error?: string;
}

function buildParseTemplatePrompt(text: string): string {
  return `당신은 정부지원사업 신청서 양식 분석 전문가입니다.
다음 신청서 양식 텍스트를 분석하여 작성해야 할 섹션(항목) 목록을 추출해주세요.
**모든 섹션 제목은 원문 그대로 유지하세요.**

<양식>
${text.slice(0, 8000)}
</양식>

신청서에서 실제로 내용을 작성해야 하는 섹션만 추출하세요.
(목차, 안내문, 서명란, 첨부서류 목록 등은 제외)

JSON만 출력하고, 마크다운 코드 블록 없이 순수 JSON만 출력하세요:
{
  "sections": [
    {
      "title": "섹션 제목 (원문 그대로)",
      "charLimit": 500,
      "description": "작성 가이드라인 (있는 경우만)"
    }
  ]
}

참고: charLimit이 명시되지 않은 경우 0 또는 생략하세요.`;
}

export async function POST(request: NextRequest) {
  try {
    const { fileBase64, fileName }: ParseTemplateRequest = await request.json();

    if (!fileBase64) {
      return NextResponse.json<ParseTemplateResponse>(
        { success: false, error: "파일이 없습니다." },
        { status: 400 }
      );
    }

    let extractedText = "";

    if (fileName?.toLowerCase().endsWith(".pdf")) {
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

    extractedText = extractedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    if (!extractedText.trim()) {
      return NextResponse.json<ParseTemplateResponse>(
        { success: false, error: "양식에서 텍스트를 추출할 수 없습니다." },
        { status: 422 }
      );
    }

    const completion = await getOpenRouterClient().chat.completions.create({
      model: PARSE_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: buildParseTemplatePrompt(extractedText),
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json<ParseTemplateResponse>(
        { success: false, error: "양식 구조를 인식할 수 없습니다." },
        { status: 422 }
      );
    }

    let parsed: { sections: TemplateSection[] };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      const cleaned = jsonMatch[0].replace(/\r\n/g, " ").replace(/\r/g, " ").replace(/\n/g, " ").replace(/\t/g, " ");
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const stripped = cleaned.replace(/[\x00-\x1F\x7F]/g, " ");
        try {
          parsed = JSON.parse(stripped);
        } catch {
          return NextResponse.json<ParseTemplateResponse>(
            { success: false, error: "양식 구조를 인식할 수 없습니다. 다시 시도해주세요." },
            { status: 422 }
          );
        }
      }
    }

    const sections: TemplateSection[] = (parsed.sections ?? []).map((s) => ({
      title: s.title ?? "",
      charLimit: s.charLimit && s.charLimit > 0 ? s.charLimit : undefined,
      description: s.description || undefined,
    })).filter((s) => s.title.trim().length > 0);

    return NextResponse.json<ParseTemplateResponse>({ success: true, sections });
  } catch (error) {
    console.error("ParseTemplate error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json<ParseTemplateResponse>(
      { success: false, error: `서버 오류: ${msg}` },
      { status: 500 }
    );
  }
}
