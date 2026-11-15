import pdfParse from "pdf-parse";
import JSZip from "jszip";

export interface ProcessedHomeworkFile {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  extractedText?: string;
  base64DataUrl?: string;
  fileCount?: number;
  isZip?: boolean;
}

export class FileProcessor {
  private allowedImageMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  private maxSizeBytes = 25 * 1024 * 1024; // 25MB

  // Code extensions to recognize
  private codeExtensions = [
    ".html", ".htm", ".css", ".php", ".py", ".js", ".jsx",
    ".ts", ".tsx", ".json", ".sql", ".c", ".cpp", ".h",
    ".java", ".cs", ".sh", ".bash", ".xml", ".yaml", ".yml",
    ".txt", ".md"
  ];

  public async processFile(file: Express.Multer.File): Promise<ProcessedHomeworkFile> {
    if (file.size > this.maxSizeBytes) {
      throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds limit of 25MB.`);
    }

    const mime = file.mimetype.toLowerCase();
    const originalName = file.originalname || "unnamed";
    const ext = "." + (originalName.split(".").pop() || "").toLowerCase();

    // 1. ZIP File Extraction
    if (
      mime === "application/zip" ||
      mime === "application/x-zip-compressed" ||
      mime === "multipart/x-zip" ||
      ext === ".zip"
    ) {
      try {
        const zip = await JSZip.loadAsync(file.buffer);
        const extractedFiles: Array<{ name: string; content: string; size: number }> = [];

        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
          if (zipEntry.dir) continue;
          // Ignore hidden files and MacOS metadata
          if (relativePath.startsWith("__MACOSX") || relativePath.includes("/.") || relativePath.startsWith(".")) {
            continue;
          }

          const fileExt = "." + (relativePath.split(".").pop() || "").toLowerCase();
          // Extract text for code files
          if (this.codeExtensions.includes(fileExt) || !fileExt.includes(".")) {
            const content = await zipEntry.async("string");
            extractedFiles.push({
              name: relativePath,
              content,
              size: content.length
            });
          }
        }

        if (extractedFiles.length === 0) {
          throw new Error("No readable code files (HTML, CSS, PHP, Python, etc.) found in ZIP archive.");
        }

        // Format extracted files in sequence
        const formatted = extractedFiles.map((f, idx) => {
          return `=== [${idx + 1}/${extractedFiles.length}] File: ${f.name} (${f.size} chars) ===\n${f.content}\n`;
        }).join("\n----------------------------------------\n\n");

        return {
          originalName,
          mimeType: "application/zip",
          sizeBytes: file.size,
          extractedText: `Extracted ${extractedFiles.length} files from ${originalName}:\n\n` + formatted,
          fileCount: extractedFiles.length,
          isZip: true
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to extract ZIP archive: ${errorMsg}`);
      }
    }

    // 2. Direct Code Files (HTML, CSS, PHP, Python, JS, etc.)
    if (this.codeExtensions.includes(ext) || mime === "text/plain" || mime.startsWith("text/")) {
      const content = file.buffer.toString("utf-8");
      return {
        originalName,
        mimeType: mime || "text/plain",
        sizeBytes: file.size,
        extractedText: `=== File: ${originalName} ===\n${content}`
      };
    }

    // 3. PDF Documents
    if (mime === "application/pdf" || ext === ".pdf") {
      try {
        const parsed = await pdfParse(file.buffer);
        const cleanText = (parsed.text || "").trim();
        return {
          originalName,
          mimeType: mime,
          sizeBytes: file.size,
          extractedText: cleanText.length > 0 ? cleanText : "PDF contains scanned images without selectable text."
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to parse PDF document: ${errorMsg}`);
      }
    }

    // 4. Image Files
    if (this.allowedImageMimes.includes(mime)) {
      const base64 = file.buffer.toString("base64");
      const dataUrl = `data:${mime};base64,${base64}`;
      return {
        originalName,
        mimeType: mime,
        sizeBytes: file.size,
        base64DataUrl: dataUrl
      };
    }

    throw new Error(`Unsupported file type: ${originalName} (${mime}). Allowed formats: HTML, CSS, PHP, Python, ZIP, PDF, TXT, Images.`);
  }
}

export const fileProcessor = new FileProcessor();

