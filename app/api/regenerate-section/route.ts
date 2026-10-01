import { NextRequest, NextResponse } from "next/server";
import { getOpenRouterClient, GENERATE_MODEL } from "@/lib/openrouter";
import { RegenerateSectionRequest, RegenerateSectionResponse } from "@/types";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { analysis, answers, sectionTitle, currentContent, charLimit, instruction }: RegenerateSectionRequest =
      await request.json();

    if (!analysis || !answers || !sectionTitle) {
      return NextResponse.json<RegenerateSectionResponse>({ success: false, error: "필수 정보가 없습니다." }, { status: 400 });
    }

    const criteria = analysis.evaluationCriteria
      .map((c) => `- ${c.category}(${c.weight}점): ${c.description} [키워드: ${(c.keywords ?? []).join(", ")}]`)
      .join("\n");
    const profile = Object.entries(answers)
      .filter(([, v]) => String(v ?? "").trim())
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    const prompt = `당신은 정부지원사업 사업계획서 작성 전문가입니다.
아래 섹션 하나만 다시 작성해주세요. **한국어로만** 작성하고, 본문 텍스트만 출력하세요(제목·마크다운·따옴표 없이).

## 공고
- 사업명: ${analysis.title}
- 주관기관: ${analysis.agency}
## 평가기준
${criteria}
## 창업자 정보
${profile}

## 다시 쓸 섹션: ${sectionTitle}
${charLimit ? `- 글자수 제한: ${charLimit}자 이내 (반드시 준수)\n` : "- 분량: 500~800자\n"}${instruction ? `- 사용자 요청: ${instruction}\n` : "- 기존보다 구체적이고 설득력 있게 개선\n"}
## 기존 내용
${currentContent || "(없음)"}

입력된 정보에 없는 수치나 사실을 지어내지 마세요. 근거가 부족하면 [작성 필요: …] 형태로 표시하세요.`;

    const completion = await getOpenRouterClient().chat.completions.create({
      model: GENERATE_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    let content = (completion.choices[0]?.message?.content ?? "").trim();
    content = content.replace(/^```[a-z]*\n?|```$/g, "").trim();
    if (!content) {
      return NextResponse.json<RegenerateSectionResponse>({ success: false, error: "재작성에 실패했습니다." }, { status: 422 });
    }
    if (charLimit && content.length > charLimit) content = content.slice(0, charLimit);

    return NextResponse.json<RegenerateSectionResponse>({ success: true, content });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json<RegenerateSectionResponse>({ success: false, error: `서버 오류: ${msg}` }, { status: 500 });
  }
}
