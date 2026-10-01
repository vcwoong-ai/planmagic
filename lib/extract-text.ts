// 서버 전용: 업로드된 파일(PDF/HWP/HWPX/DOCX/TXT)에서 텍스트 추출
/* eslint-disable @typescript-eslint/no-explicit-any */
import { unzipSync, strFromU8 } from "fflate";

function ensureDomMatrix() {
  if (typeof globalThis.DOMMatrix !== "undefined") return;
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true; isIdentity = true;
    constructor(_init?: string | number[]) {}
    static fromMatrix() { return new DOMMatrix(); }
    static fromFloat32Array() { return new DOMMatrix(); }
    static fromFloat64Array() { return new DOMMatrix(); }
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    rotateAxisAngle() { return this; }
    skewX() { return this; }
    skewY() { return this; }
    flipX() { return this; }
    flipY() { return this; }
    inverse() { return this; }
    transformPoint() { return { x: 0, y: 0, z: 0, w: 1 }; }
    toFloat32Array() { return new Float32Array(16); }
    toFloat64Array() { return new Float64Array(16); }
    toString() { return "matrix(1,0,0,1,0,0)"; }
    toJSON() { return {}; }
  };
}

async function fromPdf(buffer: Buffer): Promise<string> {
  ensureDomMatrix();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return data.text as string;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// HWPX / DOCX 는 ZIP + XML 구조
function fromZipXml(buffer: Buffer, kind: "hwpx" | "docx"): string {
  const files = unzipSync(new Uint8Array(buffer));
  const names = Object.keys(files);
  const target =
    kind === "hwpx"
      ? names.filter((n) => /^Contents\/section\d+\.xml$/i.test(n)).sort()
      : names.filter((n) => n === "word/document.xml");
  const paraRe = kind === "hwpx" ? /<hp:p[\s>][\s\S]*?<\/hp:p>/g : /<w:p[\s>][\s\S]*?<\/w:p>/g;
  const textRe = kind === "hwpx" ? /<hp:t>([\s\S]*?)<\/hp:t>|<hp:t\/>/g : /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;

  const lines: string[] = [];
  for (const name of target) {
    const xml = strFromU8(files[name]);
    const paras = xml.match(paraRe) ?? [];
    for (const p of paras) {
      let line = "";
      let m: RegExpExecArray | null;
      textRe.lastIndex = 0;
      while ((m = textRe.exec(p)) !== null) line += decodeXml((m[1] ?? "").replace(/<[^>]+>/g, ""));
      if (line.trim()) lines.push(line);
    }
  }
  return lines.join("\n");
}

// HWP 5.x (OLE 바이너리) — hwp.js 사용
function paragraphsToText(paras: any[], out: string[], depth = 0) {
  if (!Array.isArray(paras) || depth > 6) return;
  for (const p of paras) {
    let line = "";
    for (const ch of p?.content ?? []) {
      // type 0: 일반 문자(코드포인트 숫자), 1/2: 인라인·확장 컨트롤
      if (ch?.type === 0) {
        const v = ch.value;
        if (typeof v === "number") {
          if (v === 13 || v === 10) { if (line.trim()) out.push(line); line = ""; }
          else if (v >= 32) line += String.fromCharCode(v);
        } else if (typeof v === "string") line += v;
      }
    }
    if (line.trim()) out.push(line);
    // 표 등 컨트롤 내부 문단
    for (const c of p?.controls ?? []) {
      if (Array.isArray(c?.content)) {
        for (const row of c.content) {
          for (const cell of Array.isArray(row) ? row : [row]) {
            paragraphsToText(cell?.items ?? [], out, depth + 1);
          }
        }
      }
    }
  }
}

function fromHwp(buffer: Buffer): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { parse } = require("hwp.js");
  const doc = parse(buffer, { type: "buffer" });
  const out: string[] = [];
  for (const section of doc.sections ?? []) paragraphsToText(section.content, out);
  return out.join("\n");
}

function isZip(buffer: Buffer) {
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

export async function extractText(base64: string, fileName = ""): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  const name = fileName.toLowerCase();
  let text = "";

  if (name.endsWith(".pdf")) {
    text = await fromPdf(buffer);
  } else if (name.endsWith(".hwpx") || (name.endsWith(".hwp") && isZip(buffer))) {
    text = fromZipXml(buffer, "hwpx");
  } else if (name.endsWith(".hwp")) {
    try {
      text = fromHwp(buffer);
    } catch {
      throw new Error("HWP 파일을 읽을 수 없습니다. 한글에서 PDF 또는 HWPX로 저장 후 업로드해주세요.");
    }
  } else if (name.endsWith(".docx")) {
    text = fromZipXml(buffer, "docx");
  } else {
    text = buffer.toString("utf-8");
  }

  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}
