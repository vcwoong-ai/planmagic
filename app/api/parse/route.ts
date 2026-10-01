import { NextRequest, NextResponse } from "next/server";
import { getOpenRouterClient, PARSE_MODEL } from "@/lib/openrouter";
import { extractText } from "@/lib/extract-text";
import { buildParsePrompt } from "@/lib/prompts";
import { AnnouncementAnalysis, ParseResponse } from "@/types";

// Vercel Hobby 플랜 기본 10초 → 60초로 확장
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { fileBase64, fileName } = await request.json();

    if (!fileBase64) {
      return NextResponse.json<ParseResponse>(
        { success: false, error: "파일이 없습니다." },
        { status: 400 }
      );
    }

    let extractedText = "";
    try {
      extractedText = await extractText(fileBase64, fileName);
    } catch (e) {
      return NextResponse.json<ParseResponse>(
        { success: false, error: e instanceof Error ? e.message : "파일을 읽을 수 없습니다." },
        { status: 422 }
      );
    }

    const completion = await getOpenRouterClient().chat.completions.create({
      model: PARSE_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: buildParsePrompt(extractedText),
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content ?? "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json<ParseResponse>(
        { success: false, error: "공고문 형식을 인식할 수 없습니다." },
        { status: 422 }
      );
    }

    // AI가 JSON 문자열 안에 개행문자를 그대로 넣는 경우 파싱 실패 → 정제 후 재시도
    let analysis: AnnouncementAnalysis;
    try {
      analysis = JSON.parse(jsonMatch[0]);
    } catch {
      // 1차: 개행/탭을 공백으로 치환
      const cleaned = jsonMatch[0].replace(/\r\n/g, " ").replace(/\r/g, " ").replace(/\n/g, " ").replace(/\t/g, " ");
      try {
        analysis = JSON.parse(cleaned);
      } catch {
        // 2차: 제어문자 전체 제거
        const stripped = cleaned.replace(/[\x00-\x1F\x7F]/g, " ");
        try {
          analysis = JSON.parse(stripped);
        } catch (finalErr) {
          return NextResponse.json<ParseResponse>(
            { success: false, error: "공고문 형식을 인식할 수 없습니다. 다시 시도해주세요." },
            { status: 422 }
          );
        }
      }
    }
    analysis.rawText = extractedText.slice(0, 2000);

    return NextResponse.json<ParseResponse>({ success: true, analysis });
  } catch (error) {
    console.error("Parse error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json<ParseResponse>(
      { success: false, error: `서버 오류: ${msg}` },
      { status: 500 }
    );
  }
}
