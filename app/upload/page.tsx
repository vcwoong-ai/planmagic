"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { fileToBase64 } from "@/lib/utils";
import { AnnouncementAnalysis } from "@/types";

export default function UploadPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf" && !f.name.endsWith(".txt")) {
      setError("PDF 또는 텍스트 파일만 업로드 가능합니다.");
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
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

      // 분석 결과를 sessionStorage에 저장 후 인터뷰 페이지로 이동
      sessionStorage.setItem(
        "announcement",
        JSON.stringify(data.analysis as AnnouncementAnalysis)
      );
      router.push("/interview");
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-xl">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <div className="mb-2 text-sm font-semibold text-blue-600">STEP 01 / 03</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">공고문 업로드</h1>
          <p className="text-gray-600">
            지원하려는 정부지원사업의 공고문 PDF를 업로드해주세요.
            <br />
            평가기준과 배점을 자동으로 추출합니다.
          </p>
        </div>

        {/* 업로드 영역 */}
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
            accept=".pdf,.txt"
            onChange={handleInputChange}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-12 w-12 text-green-500" />
              <p className="font-semibold text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="text-sm text-green-600">✓ 파일이 선택되었습니다</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-12 w-12 text-gray-400" />
              <div>
                <p className="font-semibold text-gray-700">
                  클릭하거나 파일을 끌어다 놓으세요
                </p>
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

        {/* 공고문 없을 때 샘플 안내 */}
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
              공고문 분석 중...
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
