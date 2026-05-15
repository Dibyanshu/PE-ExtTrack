import fs from "fs";
import path from "path";

export function getUploadDir(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "uploads");
  }

  return path.resolve(process.cwd(), "uploads");
}

export function ensureUploadDirExists(): string {
  const uploadDir = getUploadDir();
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return uploadDir;
}