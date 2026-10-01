import { NextRequest, NextResponse } from "next/server";
import { getOpenRouterClient, PARSE_MODEL } from "@/lib/openrouter";
import { extractText } from "@/lib/extract-text";
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
      try {
        extractedText = await extractText(fileBase64, fileName);
      } catch (e) {
        return NextResponse.json<ExtractProfileResponse>(
          { success: false, error: e instanceof Error ? e.message : "파일을 읽을 수 없습니다." },
          { status: 422 }
        );
      }
    }

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
