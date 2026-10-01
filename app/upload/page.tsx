"use client";

import Stepper from "@/components/ui/Stepper";
import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, AlertCircle, Loader2, ArrowRight, ClipboardList, X, CheckCircle } from "lucide-react";
import { fileToBase64 } from "@/lib/utils";
import { AnnouncementAnalysis, TemplateSection } from "@/types";
import { createProject } from "@/lib/storage";

export default function UploadPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 신청서 양식
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!/\.(pdf|txt|hwp|hwpx|docx)$/i.test(f.name)) {
      setError("PDF, HWP, HWPX, DOCX, TXT 파일만 업로드 가능합니다.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError("파일 크기는 20MB 이하여야 합니다.");
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleTemplateFile = (f: File) => {
    if (!/\.(pdf|txt|hwp|hwpx|docx)$/i.test(f.name)) {
      return;
    }
    if (f.size > 20 * 1024 * 1024) return;
    setTemplateFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, fileName: file.name }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "분석에 실패했습니다.");
        return;
      }

      sessionStorage.setItem(
        "announcement",
        JSON.stringify(data.analysis as AnnouncementAnalysis)
      );

      // 신청서 양식도 파싱
      sessionStorage.removeItem("templateNotice");
      if (templateFile) {
        try {
          const templateBase64 = await fileToBase64(templateFile);
          const tRes = await fetch("/api/parse-template", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileBase64: templateBase64, fileName: templateFile.name }),
          });
          const tData = await tRes.json();
          if (tData.success && tData.sections?.length > 0) {
            sessionStorage.setItem("templateSections", JSON.stringify(tData.sections as TemplateSection[]));
          } else {
            sessionStorage.removeItem("templateSections");
            sessionStorage.setItem("templateNotice", tData.error ?? "양식 구조를 인식하지 못해 기본 구성으로 작성합니다.");
          }
        } catch {
          // 양식 파싱 실패해도 계속 진행
          sessionStorage.removeItem("templateSections");
          sessionStorage.setItem("templateNotice", "양식 분석에 실패해 기본 구성으로 작성합니다.");
        }
      } else {
        sessionStorage.removeItem("templateSections");
      }

      sessionStorage.removeItem("answers");
      sessionStorage.removeItem("plan");
      let sections: TemplateSection[] | undefined;
      try {
        const t = sessionStorage.getItem("templateSections");
        if (t) sections = JSON.parse(t);
      } catch { /* ignore */ }
      createProject({ analysis: data.analysis as AnnouncementAnalysis, templateSections: sections });

      router.push("/interview");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`네트워크 오류가 발생했습니다. 다시 시도해주세요. (${msg})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <Stepper current={1} />
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">공고문 업로드</h1>
          <p className="text-gray-600">
            지원하려는 정부지원사업의 공고문 PDF를 업로드해주세요.
            <br />
            평가기준과 배점을 자동으로 추출합니다.
          </p>
        </div>

        {/* 공고문 업로드 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`relative mb-4 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
            dragging
              ? "border-blue-400 bg-blue-50"
              : file
              ? "border-green-400 bg-green-50"
              : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
          }`}
        >
          <input
            type="file"
            accept=".pdf,.txt,.hwp,.hwpx,.docx"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-12 w-12 text-green-500" />
              <p className="font-semibold text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <p className="text-sm text-green-600">✓ 공고문 선택 완료</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-12 w-12 text-gray-400" />
              <div>
                <p className="font-semibold text-gray-700">공고문 PDF를 클릭하거나 끌어다 놓으세요</p>
                <p className="mt-1 text-sm text-gray-500">PDF, TXT · 최대 20MB</p>
              </div>
            </div>
          )}
        </div>

        {/* 에러 */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* 신청서 양식 (선택) */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-800">신청서 양식 업로드</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">선택</span>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            공고에서 제공하는 사업계획서 양식(HWP/PDF)을 올리면 그 양식에 맞춰 내용을 채워서 DOC 파일로 제공합니다.
          </p>

          {templateFile ? (
            <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3">
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-indigo-500" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{templateFile.name}</p>
                <p className="text-xs text-gray-500">{(templateFile.size / 1024 / 1024).toFixed(2)} MB · 양식 구조를 분석합니다</p>
              </div>
              <button
                onClick={() => { setTemplateFile(null); if (templateInputRef.current) templateInputRef.current.value = ""; }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-4 text-sm text-gray-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
              <input
                ref={templateInputRef}
                type="file"
                accept=".pdf,.txt,.hwp,.hwpx,.docx"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleTemplateFile(f); }}
              />
              <Upload className="h-4 w-4" />
              사업계획서 양식 파일 선택 (HWP, HWPX, PDF, DOCX)
            </label>
          )}
        </div>

        {/* 공고문 없을 때 안내 */}
        <div className="mb-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
          💡 기업마당(www.bizinfo.go.kr) 또는 K-Startup에서 공고문 PDF를 다운로드하세요.
        </div>

        {/* 버튼 */}
        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {templateFile ? "공고문 + 양식 분석 중..." : "공고문 분석 중..."}
            </>
          ) : (
            <>
              공고문 분석하고 다음 단계로
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>

        {loading && (
          <p className="mt-3 text-center text-sm text-gray-500">
            AI가 평가기준을 파악하고 있습니다. 약 10~30초 소요됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
