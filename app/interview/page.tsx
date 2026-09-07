"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Info } from "lucide-react";
import { AnnouncementAnalysis, InterviewAnswers } from "@/types";

const QUESTIONS: { key: keyof InterviewAnswers; label: string; placeholder: string; group: string }[] = [
  // 팀
  { key: "founderBackground", label: "창업자(대표) 배경", placeholder: "학력, 경력, 관련 분야 전문성을 구체적으로 작성해주세요.", group: "팀/창업자" },
  { key: "teamMembers", label: "팀 구성원", placeholder: "공동창업자, 핵심 인력의 역할과 전문성을 작성해주세요. 1인 창업이면 '1인 창업'으로 기재.", group: "팀/창업자" },
  // 제품
  { key: "productDescription", label: "제품/서비스 설명", placeholder: "무엇을 만드나요? 어떻게 작동하나요? 핵심 기능을 설명해주세요.", group: "제품/서비스" },
  { key: "problemSolving", label: "해결하는 문제", placeholder: "어떤 문제를 해결하나요? 현재 고객은 어떻게 이 문제를 해결하고 있나요?", group: "제품/서비스" },
  { key: "uniqueValue", label: "차별화 포인트 (USP)", placeholder: "경쟁사 대비 무엇이 다른가요? 왜 고객이 우리를 선택해야 하나요?", group: "제품/서비스" },
  // 시장
  { key: "targetMarket", label: "목표 고객/시장", placeholder: "누가 주요 고객인가요? B2B/B2C, 연령대, 업종 등을 구체적으로 작성해주세요.", group: "시장" },
  { key: "marketSize", label: "시장 규모", placeholder: "TAM/SAM/SOM 또는 관련 시장 규모 데이터를 작성해주세요.", group: "시장" },
  { key: "competitors", label: "주요 경쟁사", placeholder: "국내외 주요 경쟁 서비스 또는 대체재를 나열해주세요.", group: "시장" },
  { key: "competitiveAdvantage", label: "경쟁우위", placeholder: "경쟁사 대비 기술적·사업적 우위는 무엇인가요?", group: "시장" },
  // 비즈니스
  { key: "revenueModel", label: "수익 모델", placeholder: "어떻게 돈을 버나요? 구독, 거래 수수료, 광고 등 수익 구조를 설명해주세요.", group: "비즈니스 모델" },
  { key: "pricingStrategy", label: "가격 전략", placeholder: "가격 책정 방식과 근거를 설명해주세요.", group: "비즈니스 모델" },
  // 실행
  { key: "currentStatus", label: "현재 진행 상황", placeholder: "아이디어/시제품/MVP/매출 발생 중 어느 단계인가요? 현재까지 한 일을 작성해주세요.", group: "실행 계획" },
  { key: "milestones", label: "향후 마일스톤", placeholder: "지원금으로 달성할 6개월~1년의 주요 목표를 작성해주세요.", group: "실행 계획" },
  { key: "fundUsage", label: "자금 사용 계획", placeholder: "지원금을 어떻게 사용할 계획인가요? 항목별로 작성해주세요.", group: "실행 계획" },
  // 기타
  { key: "achievements", label: "주요 성과 / 수상 이력", placeholder: "특허, 수상, 언론 보도, 투자 유치 등 있다면 작성해주세요. 없으면 '해당 없음'.", group: "기타" },
  { key: "partnerships", label: "파트너십 / 협력 관계", placeholder: "주요 파트너사, MOU, 기관 협력 등이 있다면 작성해주세요. 없으면 '해당 없음'.", group: "기타" },
];

const GROUPS = ["팀/창업자", "제품/서비스", "시장", "비즈니스 모델", "실행 계획", "기타"];

const emptyAnswers = (): InterviewAnswers =>
  Object.fromEntries(QUESTIONS.map((q) => [q.key, ""])) as unknown as InterviewAnswers;

export default function InterviewPage() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnnouncementAnalysis | null>(null);
  const [answers, setAnswers] = useState<InterviewAnswers>(emptyAnswers());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("announcement");
    if (!saved) {
      router.push("/upload");
      return;
    }
    setAnalysis(JSON.parse(saved));
  }, [router]);

  const completedCount = Object.values(answers).filter((v) => v.trim().length > 20).length;
  const progress = Math.round((completedCount / QUESTIONS.length) * 100);

  const handleSubmit = async () => {
    const empty = QUESTIONS.filter((q) => !answers[q.key]?.trim());
    if (empty.length > 0) {
      setError(`${empty.length}개의 질문에 답변해주세요.`);
      return;
    }
    if (!analysis) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, answers }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "생성에 실패했습니다.");
        return;
      }

      sessionStorage.setItem("plan", JSON.stringify(data.plan));
      router.push("/result");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!analysis) return null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* 헤더 */}
        <div className="mb-6 text-center">
          <div className="mb-2 text-sm font-semibold text-blue-600">STEP 02 / 03</div>
          <h1 className="mb-1 text-2xl font-bold text-gray-900">사업 정보 입력</h1>
          <p className="text-sm text-gray-500">
            분석된 공고: <span className="font-medium text-gray-700">{analysis.title}</span>
          </p>
        </div>

        {/* 진행률 */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">답변 진행률</span>
            <span className="font-semibold text-blue-600">{completedCount} / {QUESTIONS.length}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 공고 요약 */}
        <div className="mb-6 rounded-xl bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
            <Info className="h-4 w-4" />
            공고 분석 결과
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
            <div><span className="opacity-70">주관기관:</span> {analysis.agency}</div>
            <div><span className="opacity-70">지원금액:</span> {analysis.budget}</div>
            <div><span className="opacity-70">마감일:</span> {analysis.deadline}</div>
            <div><span className="opacity-70">평가항목:</span> {analysis.evaluationCriteria.length}개</div>
          </div>
        </div>

        {/* 질문 그룹별 */}
        {GROUPS.map((group) => {
          const groupQs = QUESTIONS.filter((q) => q.group === group);
          return (
            <div key={group} className="mb-6">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">{group}</h2>
              <div className="space-y-4">
                {groupQs.map((q) => (
                  <div key={q.key} className="rounded-xl bg-white p-4 shadow-sm">
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      {q.label}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={q.placeholder}
                      value={answers[q.key]}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                      }
                      className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    {answers[q.key]?.trim().length > 0 && answers[q.key].trim().length < 20 && (
                      <p className="mt-1 text-xs text-orange-500">조금 더 자세히 작성해주세요.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* 에러 */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/upload")}
            className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            이전
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                사업계획서 생성 중... (약 30초)
              </>
            ) : (
              <>
                사업계획서 초안 생성하기
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
