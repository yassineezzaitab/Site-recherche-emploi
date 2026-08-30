import type { ResumeFileType } from "@prisma/client";

/**
 * pdf.js text item as seen inside a custom pagerender hook.
 * transform is the PDF text-rendering matrix; transform[4]/[5] are the
 * item's x/y position on the page.
 */
interface PdfTextItem {
  str: string;
  transform: number[];
}

/** Simple 1D 2-means clustering of x-positions, used to detect a column split. */
function kmeans1D(xs: number[], iterations = 15): [number, number] {
  let c0 = Math.min(...xs);
  let c1 = Math.max(...xs);
  if (c0 === c1) return [c0, c1];
  for (let i = 0; i < iterations; i++) {
    const g0: number[] = [];
    const g1: number[] = [];
    for (const x of xs) (Math.abs(x - c0) <= Math.abs(x - c1) ? g0 : g1).push(x);
    if (g0.length) c0 = g0.reduce((a, b) => a + b, 0) / g0.length;
    if (g1.length) c1 = g1.reduce((a, b) => a + b, 0) / g1.length;
  }
  return c0 <= c1 ? [c0, c1] : [c1, c0];
}

/** Groups items into lines by Y position, then joins each line left-to-right. */
function itemsToText(items: PdfTextItem[]): string {
  const sorted = [...items].sort(
    (a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]
  );
  const lines: PdfTextItem[][] = [];
  let current: PdfTextItem[] = [];
  let lastY: number | null = null;
  const Y_TOLERANCE = 2.5;
  for (const item of sorted) {
    const y = item.transform[5];
    if (lastY === null || Math.abs(y - lastY) <= Y_TOLERANCE) {
      current.push(item);
    } else {
      lines.push(current);
      current = [item];
    }
    lastY = y;
  }
  if (current.length) lines.push(current);
  return lines
    .map((line) => line.sort((a, b) => a.transform[4] - b.transform[4]).map((it) => it.str).join(""))
    .join("\n");
}

/**
 * Renders a PDF page's text in genuine reading order instead of pdf-parse's
 * default (interleaves text purely by vertical position, which scrambles
 * any multi-column layout — a section header in a left sidebar column ends
 * up glued to unrelated text from the main column on the same visual row).
 * Detects a two-column layout via 1D k-means on text x-positions and, when
 * found, emits the left column in full (top to bottom) followed by the
 * right column, each internally in correct reading order. Falls back to a
 * single reading-order pass for single-column pages.
 */
async function renderPageColumnAware(pageData: {
  getTextContent: (opts: unknown) => Promise<{ items: PdfTextItem[] }>;
}): Promise<string> {
  const textContent = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });
  const items = textContent.items.filter((it) => it.str.trim().length > 0);
  if (items.length === 0) return "";

  const xs = items.map((it) => it.transform[4]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const pageWidth = maxX - minX || 1;

  const [c0, c1] = kmeans1D(xs);
  const gap = c1 - c0;
  const leftCount = items.filter((it) => Math.abs(it.transform[4] - c0) <= Math.abs(it.transform[4] - c1)).length;
  const balance = Math.min(leftCount, items.length - leftCount) / items.length;

  // Require a wide, roughly-balanced split before trusting it as two real
  // columns — a narrow or lopsided gap is more likely just varying
  // indentation within a single column, not a sidebar layout.
  const isTwoColumn = gap > pageWidth * 0.25 && balance > 0.15;
  if (!isTwoColumn) return itemsToText(items);

  const splitX = (c0 + c1) / 2;
  const left = items.filter((it) => it.transform[4] < splitX);
  const right = items.filter((it) => it.transform[4] >= splitX);
  return `${itemsToText(left)}\n\n${itemsToText(right)}`;
}

/** Extracts raw text from an uploaded CV file, by file type. */
export async function extractText(
  buffer: Buffer,
  fileType: ResumeFileType
): Promise<string> {
  switch (fileType) {
    case "PDF": {
      // pdf-parse ships a debug entry-point guard that tries to read a
      // local test PDF when required at the package root — importing the
      // lib/ file directly avoids that footgun in serverless environments.
      // The direct subpath import doesn't pick up @types/pdf-parse's
      // declaration (that's keyed to the package root), which is typed
      // with a `pagerender` option; the JS itself supports it (see
      // pdf-parse/lib/pdf-parse.js), so re-declare the signature here.
      const { default: pdfParse } = (await import("pdf-parse/lib/pdf-parse.js")) as unknown as {
        default: (
          buf: Buffer,
          options?: { pagerender?: typeof renderPageColumnAware }
        ) => Promise<{ text: string }>;
      };
      const result = await pdfParse(buffer, { pagerender: renderPageColumnAware });
      return normalize(result.text);
    }
    case "DOCX": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return normalize(result.value);
    }
    case "TXT": {
      return normalize(buffer.toString("utf-8"));
    }
    default:
      throw new Error(`Type de fichier non supporté: ${fileType}`);
  }
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}

export function detectFileType(fileName: string, mimeType: string): ResumeFileType | null {
  const lower = fileName.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "PDF";
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  )
    return "DOCX";
  if (mimeType === "text/plain" || lower.endsWith(".txt")) return "TXT";
  return null;
}
