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

export async function POST(request: NextRequest) {
  try {
    const { analysis, answers }: GenerateRequest = await request.json();

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
          content: buildGeneratePrompt(analysis, answers),
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

    const generated = JSON.parse(jsonMatch[0]);

    const criteriaScores = generated.selfDiagnostic?.criteriaScores ?? [];
    const totalScore = criteriaScores.reduce(
      (sum: number, c: { estimatedScore: number }) => sum + c.estimatedScore,
      0
    );
    const maxScore = analysis.evaluationCriteria.reduce(
      (sum, c) => sum + c.weight,
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
    return NextResponse.json<GenerateResponse>(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
