import { NextRequest, NextResponse } from "next/server";
import { getOpenRouterClient, GENERATE_MODEL } from "@/lib/openrouter";
import { buildGeneratePrompt } from "@/lib/prompts";
import {
  BusinessPlan,
  BusinessPlanSection,
  GenerateRequest,
  GenerateResponse,
  SelfDiagnosticReport,
} from "@/types";
import { generateId } from "@/lib/utils";

// Vercel Hobby 플랜 기본 10초 → 60초로 확장
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { analysis, answers, templateSections }: GenerateRequest = await request.json();

    if (!analysis || !answers) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: "분석 결과 또는 답변이 없습니다." },
        { status: 400 }
      );
    }

    const completion = await getOpenRouterClient().chat.completions.create({
      model: GENERATE_MODEL,
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: buildGeneratePrompt(analysis, answers, templateSections),
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content ?? "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: "사업계획서 생성에 실패했습니다." },
        { status: 422 }
      );
    }

    let generated: ReturnType<typeof JSON.parse>;
    try {
      generated = JSON.parse(jsonMatch[0]);
    } catch {
      const cleaned = jsonMatch[0].replace(/\r\n/g, " ").replace(/\r/g, " ").replace(/\n/g, " ").replace(/\t/g, " ");
      try {
        generated = JSON.parse(cleaned);
      } catch {
        const stripped = cleaned.replace(/[\x00-\x1F\x7F]/g, " ");
        try {
          generated = JSON.parse(stripped);
        } catch {
          return NextResponse.json<GenerateResponse>(
            { success: false, error: "사업계획서 생성에 실패했습니다. 다시 시도해주세요." },
            { status: 422 }
          );
        }
      }
    }

    const rawCriteriaScores = generated.selfDiagnostic?.criteriaScores ?? [];

    // AI가 "23%" 같은 문자열로 반환할 수 있으므로 숫자로 정제
    const criteriaScores = rawCriteriaScores.map(
      (c: { category: string; weight: unknown; estimatedScore: unknown; feedback: string }) => ({
        category: c.category,
        feedback: c.feedback,
        weight: parseFloat(String(c.weight).replace(/[^0-9.]/g, "")) || 0,
        estimatedScore: parseFloat(String(c.estimatedScore).replace(/[^0-9.]/g, "")) || 0,
      })
    );

    const totalScore = criteriaScores.reduce(
      (sum: number, c: { estimatedScore: number }) => sum + c.estimatedScore,
      0
    );
    // evaluationCriteria weight도 숫자로 정제
    const maxScore = analysis.evaluationCriteria.reduce(
      (sum, c) => sum + (parseFloat(String(c.weight).replace(/[^0-9.]/g, "")) || 0),
      0
    );

    const selfDiagnosticReport: SelfDiagnosticReport = {
      totalScore,
      maxScore,
      percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      criteriaScores,
      strengths: generated.selfDiagnostic?.strengths ?? [],
      improvements: generated.selfDiagnostic?.improvements ?? [],
    };

    const sections: BusinessPlanSection[] = (
      generated.sections as {
        title: string;
        content: string;
        criterionCategory: string;
      }[]
    ).map((s) => ({
      title: s.title,
      content: s.content,
      evaluationCriterion: analysis.evaluationCriteria.find(
        (c) => c.category === s.criterionCategory
      ),
    }));

    const plan: BusinessPlan = {
      id: generateId(),
      createdAt: new Date(),
      announcementTitle: analysis.title,
      sections,
      selfDiagnosticReport,
    };

    return NextResponse.json<GenerateResponse>({ success: true, plan });
  } catch (error) {
    console.error("Generate error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json<GenerateResponse>(
      { success: false, error: `서버 오류: ${msg}` },
      { status: 500 }
    );
  }
}
