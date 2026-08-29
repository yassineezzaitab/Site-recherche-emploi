import type { ResumeFileType } from "@prisma/client";

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
      const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
      const result = await pdfParse(buffer);
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
