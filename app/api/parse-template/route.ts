import { NextRequest, NextResponse } from "next/server";
import { getOpenRouterClient, PARSE_MODEL } from "@/lib/openrouter";
import { extractText } from "@/lib/extract-text";
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
    try {
      extractedText = await extractText(fileBase64, fileName);
    } catch (e) {
      return NextResponse.json<ParseTemplateResponse>(
        { success: false, error: e instanceof Error ? e.message : "양식 파일을 읽을 수 없습니다." },
        { status: 422 }
      );
    }

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
