"use client";

import Stepper from "@/components/ui/Stepper";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Download, FileText, RotateCcw, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle,
  TrendingUp, Pencil, Sparkles, Loader2, Check, FolderOpen,
} from "lucide-react";
import { AnnouncementAnalysis, BusinessPlan, InterviewAnswers } from "@/types";
import { buildDocxBlob, buildText, downloadBlob, openPrintView, safeFileName } from "@/lib/export";
import { getCurrentProjectId, updateProject } from "@/lib/storage";

export default function ResultPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<BusinessPlan | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const [activeTab, setActiveTab] = useState<"plan" | "diagnostic">("plan");
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [busyDoc, setBusyDoc] = useState(false);
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [instructions, setInstructions] = useState<Record<number, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const ctx = useRef<{ analysis?: AnnouncementAnalysis; answers?: InterviewAnswers }>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("plan");
    if (!saved) {
      router.push("/upload");
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      parsed.createdAt = new Date(parsed.createdAt);
      setPlan(parsed);
      const a = sessionStorage.getItem("announcement");
      const ans = sessionStorage.getItem("answers");
      ctx.current = { analysis: a ? JSON.parse(a) : undefined, answers: ans ? JSON.parse(ans) : undefined };
    } catch {
      router.push("/upload");
    }
  }, [router]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // 수정 내용 자동 저장 (세션 + 브라우저 저장소)
  const persist = useCallback((next: BusinessPlan) => {
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { sessionStorage.setItem("plan", JSON.stringify(next)); } catch { /* ignore */ }
      const pid = getCurrentProjectId();
      if (pid) updateProject(pid, { plan: next });
      setSaveState("saved");
    }, 600);
  }, []);

  const updateContent = (i: number, content: string) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const next = { ...prev, sections: prev.sections.map((sec, idx) => (idx === i ? { ...sec, content } : sec)) };
      persist(next);
      return next;
    });
  };

  const handleRegenerate = async (i: number) => {
    if (!plan) return;
    const { analysis, answers } = ctx.current;
    if (!analysis || !answers) {
      showToast("원본 입력 정보가 없어 재작성할 수 없습니다. 인터뷰부터 다시 진행해주세요.");
      return;
    }
    setRegenIdx(i);
    try {
      const sec = plan.sections[i];
      const res = await fetch("/api/regenerate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis, answers,
          sectionTitle: sec.title,
          currentContent: sec.content,
          charLimit: sec.charLimit,
          instruction: instructions[i]?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error ?? "재작성에 실패했습니다.");
      } else {
        updateContent(i, data.content);
        showToast("섹션을 다시 작성했습니다.");
      }
    } catch {
      showToast("네트워크 오류가 발생했습니다.");
    } finally {
      setRegenIdx(null);
    }
  };

  const toggleSection = (i: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleDownloadDocx = async () => {
    if (!plan) return;
    setBusyDoc(true);
    try {
      downloadBlob(await buildDocxBlob(plan), safeFileName(plan, "docx"));
    } catch {
      showToast("DOCX 생성에 실패했습니다.");
    } finally {
      setBusyDoc(false);
    }
  };

  const handleDownloadPdf = () => {
    if (plan && !openPrintView(plan)) showToast("팝업이 차단되었습니다. 팝업을 허용해주세요.");
  };

  const handleDownloadText = () => {
    if (!plan) return;
    downloadBlob(new Blob([buildText(plan)], { type: "text/plain;charset=utf-8" }), safeFileName(plan, "txt"));
  };

  if (!plan) return null;

  const { selfDiagnosticReport: report } = plan;
  // 숫자 보장 (AI가 문자열로 반환했을 경우 대비)
  const totalScore = Number(report.totalScore) || 0;
  const maxScore = Number(report.maxScore) || 0;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : Number(report.percentage) || 0;
  const scoreColor =
    percentage >= 80
      ? "text-green-600"
      : percentage >= 60
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Stepper current={3} />
        {/* 헤더 */}
        <div className="mb-6 text-center">
          <h1 className="mb-1 text-2xl font-bold text-gray-900">사업계획서 초안 완성</h1>
          <p className="text-sm text-gray-500">{plan.announcementTitle}</p>
          <div className="mt-2 flex items-center justify-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              {saveState === "saving" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-500" />}
              {saveState === "saving" ? "저장 중..." : "이 브라우저에 자동 저장됨"}
            </span>
            <button onClick={() => router.push("/saved")} className="flex items-center gap-1 text-blue-600 hover:underline">
              <FolderOpen className="h-3 w-3" />저장한 계획서
            </button>
          </div>
        </div>

        {/* 점수 요약 카드 */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white p-4 text-center shadow-sm">
            <div className={`text-3xl font-bold ${scoreColor}`}>
              {percentage}%
            </div>
            <div className="mt-1 text-xs text-gray-500">예상 점수율</div>
          </div>
          <div className="rounded-xl bg-white p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-gray-800">
              {totalScore}
              <span className="text-lg text-gray-400">/{maxScore}점</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">예상 점수</div>
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
                    <textarea
                      value={section.content}
                      onChange={(e) => updateContent(i, e.target.value)}
                      rows={Math.min(18, Math.max(6, Math.ceil(section.content.length / 40)))}
                      className="w-full resize-y rounded-lg border border-gray-200 p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-gray-400"><Pencil className="h-3 w-3" />직접 수정할 수 있어요</span>
                      <span className={section.charLimit && section.content.length > section.charLimit ? "font-semibold text-red-600" : "text-gray-500"}>
                        {section.content.length.toLocaleString()}자{section.charLimit ? ` / ${section.charLimit.toLocaleString()}자` : ""}
                        {section.charLimit && section.content.length > section.charLimit ? " (초과)" : ""}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={instructions[i] ?? ""}
                        onChange={(e) => setInstructions((p) => ({ ...p, [i]: e.target.value }))}
                        placeholder="AI에게 요청 (예: 수치를 더 구체적으로, 더 짧게)"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                      />
                      <button
                        onClick={() => handleRegenerate(i)}
                        disabled={regenIdx !== null}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        {regenIdx === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {regenIdx === i ? "작성 중..." : "AI 재작성"}
                      </button>
                    </div>
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
              const score = Number(c.estimatedScore) || 0;
              const weight = Number(c.weight) || 0;
              const pct = weight > 0 ? Math.min(Math.round((score / weight) * 100), 100) : 0;
              const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-400" : "bg-red-400";
              return (
                <div key={i} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold text-gray-800">{c.category}</span>
                    <span className="text-sm text-gray-500">
                      {score}점 / {weight}점
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
                Word(.docx) 파일은 한글(HWP)에서도 열어 편집할 수 있습니다. 위 입력창에서 바로 수정하거나 AI 재작성도 가능해요.
              </p>
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="mt-6 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadDocx}
              disabled={busyDoc}
              className="disabled:opacity-60 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
            >
              {busyDoc ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
              Word(.docx) 다운로드
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              <Download className="h-5 w-5" />
              PDF 저장 (인쇄)
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/upload")}
              className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
              다른 공고 작성
            </button>
            <button
              onClick={handleDownloadText}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              TXT
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          ※ AI 초안은 반드시 본인이 검토·수정 후 제출하세요. 최종 제출 전 멘토링을 권장합니다.
        </p>
      </div>
      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-gray-900 px-5 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
