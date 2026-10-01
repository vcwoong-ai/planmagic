// 사업계획서 내보내기 — 진짜 .docx(OOXML), 인쇄용 PDF, TXT
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, Footer, PageNumber,
} from "docx";
import { BusinessPlan } from "@/types";

const FONT = "맑은 고딕";
const NAVY = "1E3A5F";

export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFileName(plan: BusinessPlan, ext: string): string {
  const base = plan.announcementTitle.replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 40) || "사업계획서";
  const d = new Date().toISOString().slice(0, 10);
  return `${base}_사업계획서_${d}.${ext}`;
}

const run = (text: string, o: { bold?: boolean; size?: number; color?: string } = {}) =>
  new TextRun({ text, font: FONT, size: o.size ?? 22, bold: o.bold, color: o.color });

// 본문: 줄바꿈 단위로 문단 분리
function bodyParagraphs(content: string): Paragraph[] {
  return content.split(/\r?\n/).map(
    (line) =>
      new Paragraph({
        spacing: { after: 100, line: 360 },
        children: [run(line)],
      })
  );
}

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function cell(text: string, o: { header?: boolean; width: number; center?: boolean }) {
  return new TableCell({
    borders,
    width: { size: o.width, type: WidthType.PERCENTAGE },
    shading: o.header ? { type: ShadingType.CLEAR, fill: NAVY, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [run(text, { bold: o.header, color: o.header ? "FFFFFF" : undefined, size: 20 })],
      }),
    ],
  });
}

export async function buildDocxBlob(plan: BusinessPlan, opts: { includeDiagnostic?: boolean } = {}): Promise<Blob> {
  const { includeDiagnostic = true } = opts;
  const rep = plan.selfDiagnosticReport;
  const created = new Date(plan.createdAt).toLocaleDateString("ko-KR");

  const children: (Paragraph | Table)[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 120 }, children: [run(plan.announcementTitle, { bold: true, size: 40, color: NAVY })] }),
    new Paragraph({ spacing: { after: 240 }, children: [run(`사업계획서 초안 · 생성일 ${created}`, { size: 18, color: "666666" })] }),
  ];

  plan.sections.forEach((s, i) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 4 } },
        children: [run(`${i + 1}. ${s.title.replace(/^\s*\d+[.)]\s*/, "")}`, { bold: true, size: 28, color: NAVY })],
      }),
      ...bodyParagraphs(s.content)
    );
  });

  if (includeDiagnostic) {
    children.push(
      new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, spacing: { after: 160 }, children: [run("자가진단 리포트", { bold: true, size: 28, color: NAVY })] }),
      new Paragraph({ spacing: { after: 160 }, children: [run(`예상 점수 ${rep.totalScore} / ${rep.maxScore}점 (${rep.percentage}%)`, { bold: true })] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ tableHeader: true, children: [cell("평가항목", { header: true, width: 25 }), cell("예상/배점", { header: true, width: 15, center: true }), cell("피드백", { header: true, width: 60 })] }),
          ...rep.criteriaScores.map(
            (c) => new TableRow({ children: [cell(c.category, { width: 25 }), cell(`${c.estimatedScore}/${c.weight}`, { width: 15, center: true }), cell(c.feedback, { width: 60 })] })
          ),
        ],
      }),
      new Paragraph({ spacing: { before: 240, after: 80 }, children: [run("강점", { bold: true, color: NAVY })] }),
      ...rep.strengths.map((t) => new Paragraph({ bullet: { level: 0 }, children: [run(t)] })),
      new Paragraph({ spacing: { before: 240, after: 80 }, children: [run("보완 필요 사항", { bold: true, color: NAVY })] }),
      ...rep.improvements.map((t) => new Paragraph({ bullet: { level: 0 }, children: [run(t)] }))
    );
  }

  children.push(
    new Paragraph({ spacing: { before: 400 }, children: [run("※ AI가 생성한 초안입니다. 반드시 본인이 검토·수정한 후 제출하세요.", { size: 18, color: "999999" })] })
  );

  const doc = new Document({
    creator: "PlanMagic",
    title: `${plan.announcementTitle} 사업계획서`,
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        footers: {
          default: new Footer({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: "888888" })] })],
          }),
        },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}

export function buildText(plan: BusinessPlan): string {
  const rep = plan.selfDiagnosticReport;
  return [
    `# ${plan.announcementTitle} — 사업계획서 초안`,
    `생성일: ${new Date(plan.createdAt).toLocaleDateString("ko-KR")}`,
    "",
    ...plan.sections.map((s, i) => `## ${i + 1}. ${s.title}\n\n${s.content}\n`),
    "---",
    "## 자가진단 리포트",
    `예상 점수: ${rep.totalScore} / ${rep.maxScore}점 (${rep.percentage}%)`,
    "",
    "### 강점",
    ...rep.strengths.map((s) => `- ${s}`),
    "",
    "### 보완 필요 사항",
    ...rep.improvements.map((s) => `- ${s}`),
  ].join("\n");
}

export function openPrintView(plan: BusinessPlan): boolean {
  const rep = plan.selfDiagnosticReport;
  const sections = plan.sections
    .map(
      (s, i) => `<div class="section"><h2>${i + 1}. ${escapeHtml(s.title)}</h2><p>${escapeHtml(s.content).replace(/\n/g, "<br/>")}</p></div>`
    )
    .join("");
  const rows = rep.criteriaScores
    .map((c) => `<tr><td>${escapeHtml(c.category)}</td><td class="center">${c.estimatedScore}/${c.weight}</td><td>${escapeHtml(c.feedback)}</td></tr>`)
    .join("");
  const li = (a: string[]) => a.map((x) => `<li>${escapeHtml(x)}</li>`).join("");

  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(plan.announcementTitle)} 사업계획서</title>
<style>
@page{margin:20mm}
body{font-family:"맑은 고딕","Malgun Gothic",sans-serif;font-size:10.5pt;color:#222;line-height:1.8}
h1{font-size:18pt;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:6pt}
.meta{color:#666;font-size:9pt;margin-bottom:16pt}
.section{margin-bottom:18pt}
.section h2{font-size:13pt;color:#1e3a5f;border-left:4px solid #1e3a5f;padding-left:8pt;break-after:avoid}
table{border-collapse:collapse;width:100%;font-size:9pt}
th{background:#1e3a5f;color:#fff;padding:5pt;border:1px solid #ccc}
td{padding:5pt;border:1px solid #ccc}.center{text-align:center}
.note{color:#999;font-size:8pt;margin-top:24pt}
</style></head><body>
<h1>${escapeHtml(plan.announcementTitle)}</h1>
<p class="meta">사업계획서 초안 · 생성일 ${new Date(plan.createdAt).toLocaleDateString("ko-KR")} · 예상 ${rep.percentage}% (${rep.totalScore}/${rep.maxScore}점)</p>
${sections}
<div class="section" style="break-before:page"><h2>자가진단 리포트</h2>
<table><tr><th>평가항목</th><th>예상/배점</th><th>피드백</th></tr>${rows}</table>
<h3>강점</h3><ul>${li(rep.strengths)}</ul><h3>보완 필요 사항</h3><ul>${li(rep.improvements)}</ul></div>
<p class="note">※ AI가 생성한 초안입니다. 반드시 본인이 검토·수정한 후 제출하세요.</p>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
  return true;
}
