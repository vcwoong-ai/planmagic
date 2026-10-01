"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Download, Upload, FileText, Play } from "lucide-react";
import { SavedProject } from "@/types";
import { deleteProject, listProjects, loadIntoSession, createProject, updateProject } from "@/lib/storage";
import { downloadBlob } from "@/lib/export";

function stage(p: SavedProject): { label: string; color: string } {
  if (p.plan) return { label: "초안 완성", color: "bg-green-100 text-green-700" };
  const n = Object.values(p.answers ?? {}).filter((v) => String(v).trim().length > 5).length;
  if (n > 0) return { label: `정보 입력 중 (${n}/16)`, color: "bg-yellow-100 text-yellow-700" };
  return { label: "공고 분석 완료", color: "bg-blue-100 text-blue-700" };
}

export default function SavedPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<SavedProject[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjects(listProjects());
  }, []);

  const resume = (p: SavedProject) => {
    loadIntoSession(p);
    router.push(p.plan ? "/result" : "/interview");
  };

  const remove = (p: SavedProject) => {
    if (!confirm(`'${p.name}'을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return;
    deleteProject(p.id);
    setProjects(listProjects());
  };

  const backup = () => {
    downloadBlob(new Blob([JSON.stringify(listProjects(), null, 2)], { type: "application/json" }), `planmagic_backup_${new Date().toISOString().slice(0, 10)}.json`);
  };

  const restore = async (f: File) => {
    try {
      const list = JSON.parse(await f.text()) as SavedProject[];
      if (!Array.isArray(list)) throw new Error();
      let n = 0;
      for (const p of list) {
        if (!p?.analysis?.title) continue;
        const created = createProject({ analysis: p.analysis, templateSections: p.templateSections });
        updateProject(created.id, { name: p.name, answers: p.answers, plan: p.plan });
        n++;
      }
      setProjects(listProjects());
      setMsg(`${n}개의 계획서를 불러왔습니다.`);
    } catch {
      setMsg("백업 파일을 읽을 수 없습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <button onClick={() => router.push("/")} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" />처음으로
        </button>
        <h1 className="mb-1 text-2xl font-bold text-gray-900">저장한 사업계획서</h1>
        <p className="mb-6 text-sm text-gray-500">
          작성 내용은 이 브라우저에만 저장됩니다. 다른 기기에서 쓰려면 백업 파일로 내보내세요.
        </p>

        <div className="mb-4 flex gap-2">
          <button onClick={backup} disabled={!projects?.length} className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            <Download className="h-4 w-4" />백업 내보내기
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Upload className="h-4 w-4" />백업 불러오기
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ""; }} />
        </div>
        {msg && <div role="status" className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{msg}</div>}

        {projects === null ? null : projects.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed bg-white p-10 text-center text-gray-500">
            <FileText className="mx-auto mb-2 h-10 w-10 text-gray-300" />
            아직 저장된 계획서가 없습니다.
            <div><button onClick={() => router.push("/upload")} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">새로 작성하기</button></div>
          </div>
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => {
              const st = stage(p);
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-gray-900">{p.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className={`rounded-full px-2 py-0.5 ${st.color}`}>{st.label}</span>
                      <span>{p.analysis.agency}</span>
                      <span>· 수정 {new Date(p.updatedAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                  </div>
                  <button onClick={() => resume(p)} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    <Play className="h-3.5 w-3.5" />{p.plan ? "열기" : "이어서"}
                  </button>
                  <button onClick={() => remove(p)} aria-label="삭제" className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
