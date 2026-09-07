import { NextRequest, NextResponse } from "next/server";
import { getOpenRouterClient, PARSE_MODEL } from "@/lib/openrouter";
import { buildParsePrompt } from "@/lib/prompts";
import { AnnouncementAnalysis, ParseResponse } from "@/types";

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

    if (fileName?.toLowerCase().endsWith(".pdf")) {
      // PDF → 텍스트 추출 (pdf-parse)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const buffer = Buffer.from(fileBase64, "base64");
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } else {
      extractedText = Buffer.from(fileBase64, "base64").toString("utf-8");
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

    const analysis: AnnouncementAnalysis = JSON.parse(jsonMatch[0]);
    analysis.rawText = extractedText.slice(0, 2000);

    return NextResponse.json<ParseResponse>({ success: true, analysis });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json<ParseResponse>(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
