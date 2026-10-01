// 브라우저 저장소 헬퍼 — 작성 중인 프로젝트 저장/불러오기
import { SavedProject } from "@/types";
import { generateId } from "@/lib/utils";

const KEY = "planmagic:projects";
const CURRENT = "projectId";

function read(): SavedProject[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedProject[]) : [];
  } catch {
    return [];
  }
}

function write(list: SavedProject[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false; // 용량 초과/사생활 보호 모드
  }
}

export function listProjects(): SavedProject[] {
  return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getProject(id: string): SavedProject | undefined {
  return read().find((p) => p.id === id);
}

export function getCurrentProjectId(): string | null {
  try { return sessionStorage.getItem(CURRENT); } catch { return null; }
}

export function setCurrentProjectId(id: string) {
  try { sessionStorage.setItem(CURRENT, id); } catch { /* ignore */ }
}

export function createProject(init: Pick<SavedProject, "analysis" | "templateSections">): SavedProject {
  const now = new Date().toISOString();
  const project: SavedProject = {
    id: generateId(),
    name: init.analysis.title || "새 사업계획서",
    createdAt: now,
    updatedAt: now,
    ...init,
  };
  write([project, ...read()]);
  setCurrentProjectId(project.id);
  return project;
}

export function updateProject(id: string, patch: Partial<SavedProject>): boolean {
  const list = read();
  const i = list.findIndex((p) => p.id === id);
  if (i < 0) return false;
  list[i] = { ...list[i], ...patch, id, updatedAt: new Date().toISOString() };
  return write(list);
}

export function deleteProject(id: string) {
  write(read().filter((p) => p.id !== id));
}

// 저장된 프로젝트를 세션(sessionStorage)으로 불러와 이어서 작성
export function loadIntoSession(p: SavedProject) {
  try {
    sessionStorage.setItem("announcement", JSON.stringify(p.analysis));
    if (p.templateSections?.length) sessionStorage.setItem("templateSections", JSON.stringify(p.templateSections));
    else sessionStorage.removeItem("templateSections");
    if (p.answers) sessionStorage.setItem("answers", JSON.stringify(p.answers));
    else sessionStorage.removeItem("answers");
    if (p.plan) sessionStorage.setItem("plan", JSON.stringify(p.plan));
    else sessionStorage.removeItem("plan");
    setCurrentProjectId(p.id);
  } catch { /* ignore */ }
}
