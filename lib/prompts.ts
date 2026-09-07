import { AnnouncementAnalysis, InterviewAnswers } from "@/types";

export function buildParsePrompt(text: string): string {
  return `당신은 정부지원사업 공고문 분석 전문가입니다.
다음 공고문 텍스트를 분석하여 JSON 형식으로 정보를 추출해주세요.

<공고문>
${text.slice(0, 8000)}
</공고문>

다음 JSON 스키마로 응답해주세요. JSON만 출력하고, 마크다운 코드 블록 없이 순수 JSON만 출력하세요:
{
  "title": "사업명",
  "agency": "주관기관",
  "budget": "지원금액",
  "deadline": "신청마감일",
  "targetAudience": "지원대상 요약",
  "evaluationCriteria": [
    {
      "category": "평가항목명",
      "weight": 배점(숫자),
      "description": "평가 설명",
      "keywords": ["핵심키워드1", "핵심키워드2"]
    }
  ],
  "requiredSections": ["필수 작성 섹션1", "섹션2"]
}`;
}

export function buildGeneratePrompt(
  analysis: AnnouncementAnalysis,
  answers: InterviewAnswers
): string {
  const criteriaText = analysis.evaluationCriteria
    .map((c) => `- ${c.category}(${c.weight}점): ${c.description}`)
    .join("\n");

  return `당신은 정부지원사업 사업계획서 작성 전문가입니다.
창업자가 제공한 정보를 바탕으로, 다음 공고의 평가기준에 최적화된 사업계획서 초안을 작성해주세요.

## 공고 정보
- 사업명: ${analysis.title}
- 주관기관: ${analysis.agency}
- 지원대상: ${analysis.targetAudience}

## 평가기준 (총 배점)
${criteriaText}

## 창업자 정보
- 창업자 배경: ${answers.founderBackground}
- 팀 구성: ${answers.teamMembers}
- 제품/서비스: ${answers.productDescription}
- 해결하는 문제: ${answers.problemSolving}
- 차별화 포인트: ${answers.uniqueValue}
- 목표시장: ${answers.targetMarket}
- 시장규모: ${answers.marketSize}
- 경쟁사: ${answers.competitors}
- 경쟁우위: ${answers.competitiveAdvantage}
- 수익모델: ${answers.revenueModel}
- 가격전략: ${answers.pricingStrategy}
- 현재 진행상황: ${answers.currentStatus}
- 주요 마일스톤: ${answers.milestones}
- 자금 사용계획: ${answers.fundUsage}
- 주요 성과/수상: ${answers.achievements}
- 파트너십/협력: ${answers.partnerships}

## 요청 사항
각 평가기준에 맞춰 섹션별로 사업계획서를 작성하되:
1. 평가위원이 높은 점수를 줄 수 있도록 핵심 키워드를 자연스럽게 포함
2. 구체적인 수치와 근거 제시
3. 창업자 본인의 입력 내용을 기반으로 과장 없이 작성
4. 각 섹션은 500-800자 분량

JSON 형식으로 응답 (순수 JSON, 마크다운 없음):
{
  "sections": [
    {
      "title": "섹션명",
      "content": "내용",
      "criterionCategory": "연결된 평가항목"
    }
  ],
  "selfDiagnostic": {
    "criteriaScores": [
      {
        "category": "평가항목",
        "weight": 배점,
        "estimatedScore": 예상점수,
        "feedback": "개선 피드백"
      }
    ],
    "strengths": ["강점1", "강점2"],
    "improvements": ["보완필요1", "보완필요2"]
  }
}`;
}
