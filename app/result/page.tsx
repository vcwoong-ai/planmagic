"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Download, RotateCcw, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { BusinessPlan } from "@/types";

export default function ResultPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<BusinessPlan | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const [activeTab, setActiveTab] = useState<"plan" | "diagnostic">("plan");

  useEffect(() => {
    const saved = sessionStorage.getItem("plan");
    if (!saved) {
      router.push("/upload");
      return;
    }
    const parsed = JSON.parse(saved);
    parsed.createdAt = new Date(parsed.createdAt);
    setPlan(parsed);
  }, [router]);

  const toggleSection = (i: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleDownloadText = () => {
    if (!plan) return;
    const content = [
      `# ${plan.announcementTitle} — 사업계획서 초안`,
      `생성일: ${plan.createdAt.toLocaleDateString("ko-KR")}`,
      "",
      ...plan.sections.map(
        (s) => `## ${s.title}\n\n${s.content}`
      ),
      "",
      "---",
      "## 자가진단 리포트",
      `예상 점수: ${plan.selfDiagnosticReport.totalScore} / ${plan.selfDiagnosticReport.maxScore}점 (${plan.selfDiagnosticReport.percentage}%)`,
      "",
      "### 강점",
      ...plan.selfDiagnosticReport.strengths.map((s) => `- ${s}`),
      "",
      "### 보완 필요 사항",
      ...plan.selfDiagnosticReport.improvements.map((s) => `- ${s}`),
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `사업계획서_초안_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!plan) return null;

  const { selfDiagnosticReport: report } = plan;
  const scoreColor =
    report.percentage >= 80
      ? "text-green-600"
      : report.percentage >= 60
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {/* 헤더 */}
        <div className="mb-6 text-center">
          <div className="mb-2 text-sm font-semibold text-blue-600">STEP 03 / 03</div>
          <h1 className="mb-1 text-2xl font-bold text-gray-900">사업계획서 초안 완성</h1>
          <p className="text-sm text-gray-500">{plan.announcementTitle}</p>
        </div>

        {/* 점수 요약 카드 */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white p-4 text-center shadow-sm">
            <div className={`text-3xl font-bold ${scoreColor}`}>
              {report.percentage}%
            </div>
            <div className="mt-1 text-xs text-gray-500">예상 점수율</div>
          </div>
          <div className="rounded-xl bg-white p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-gray-800">
              {report.totalScore}
              <span className="text-lg text-gray-400">/{report.maxScore}</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">배점 합계</div>
          </div>
          <div className="rounded-xl bg-white p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-blue-600">{plan.sections.length}</div>
            <div className="mt-1 text-xs text-gray-500">작성 섹션 수</div>
          </div>
        </div>

        {/* 탭 */}
        <div className="mb-4 flex rounded-xl bg-white p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("plan")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              activeTab === "plan" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📄 사업계획서 초안
          </button>
          <button
            onClick={() => setActiveTab("diagnostic")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              activeTab === "diagnostic" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📊 자가진단 리포트
          </button>
        </div>

        {/* 사업계획서 탭 */}
        {activeTab === "plan" && (
          <div className="space-y-3">
            {plan.sections.map((section, i) => (
              <div key={i} className="overflow-hidden rounded-xl bg-white shadow-sm">
                <button
                  onClick={() => toggleSection(i)}
                  className="flex w-full items-center justify-between px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-gray-900">{section.title}</span>
                    {section.evaluationCriterion && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        {section.evaluationCriterion.weight}점
                      </span>
                    )}
                  </div>
                  {expandedSections.has(i) ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                {expandedSections.has(i) && (
                  <div className="border-t px-5 py-4">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
                      {section.content}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 자가진단 탭 */}
        {activeTab === "diagnostic" && (
          <div className="space-y-4">
            {/* 항목별 점수 */}
            {report.criteriaScores.map((c, i) => {
              const pct = Math.round((c.estimatedScore / c.weight) * 100);
              const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-400" : "bg-red-400";
              return (
                <div key={i} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold text-gray-800">{c.category}</span>
                    <span className="text-sm text-gray-500">
                      {c.estimatedScore} / {c.weight}점
                    </span>
                  </div>
                  <div className="mb-2 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-500">{c.feedback}</p>
                </div>
              );
            })}

            {/* 강점 */}
            {report.strengths.length > 0 && (
              <div className="rounded-xl bg-green-50 p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  강점
                </div>
                <ul className="space-y-1">
                  {report.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-green-800">• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 보완 필요 */}
            {report.improvements.length > 0 && (
              <div className="rounded-xl bg-orange-50 p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold text-orange-700">
                  <AlertTriangle className="h-4 w-4" />
                  보완 필요 사항
                </div>
                <ul className="space-y-1">
                  {report.improvements.map((s, i) => (
                    <li key={i} className="text-sm text-orange-800">• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl bg-blue-50 p-4">
              <div className="mb-1 flex items-center gap-2 font-semibold text-blue-700">
                <TrendingUp className="h-4 w-4" />
                다음 단계 추천
              </div>
              <p className="text-sm text-blue-800">
                보완 사항을 반영하여 각 섹션을 수정한 뒤, 가까운 창업지원기관에서 멘토링을 받아보세요.
                초안은 TXT로 다운로드해 HWP/Word에서 편집하실 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push("/upload")}
            className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            다른 공고 작성
          </button>
          <button
            onClick={handleDownloadText}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
          >
            <Download className="h-5 w-5" />
            TXT 다운로드
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          ※ AI 초안은 반드시 본인이 검토·수정 후 제출하세요. 최종 제출 전 멘토링을 권장합니다.
        </p>
      </div>
    </div>
  );
}
