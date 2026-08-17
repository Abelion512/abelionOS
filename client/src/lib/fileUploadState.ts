export type UploadStage = "idle" | "preparing" | "uploading" | "finalizing" | "success" | "error";

export type UploadState = {
  stage: UploadStage;
  fileName?: string;
  progress: number;
  error?: string;
};

export const initialUploadState: UploadState = { stage: "idle", progress: 0 };

export function preparingUpload(fileName: string): UploadState {
  return { stage: "preparing", fileName, progress: 0 };
}

export function uploadProgress(fileName: string, progress: number): UploadState {
  return { stage: "uploading", fileName, progress: Math.max(0, Math.min(100, Math.round(progress))) };
}

export function finalizingUpload(fileName: string): UploadState {
  return { stage: "finalizing", fileName, progress: 100 };
}

export function completedUpload(fileName: string): UploadState {
  return { stage: "success", fileName, progress: 100 };
}

export function uploadFailure(fileName: string, error: string): UploadState {
  return { stage: "error", fileName, progress: 0, error };
}

export function getUploadError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unexpected upload failure";
  if (/login|unauth/i.test(message)) return "Login diperlukan sebelum mengunggah file.";
  if (/presign/i.test(message)) return "Server tidak dapat membuat izin upload S3. Coba lagi; jika berulang, periksa konfigurasi storage.";
  if (/network|cors/i.test(message)) return "Browser tidak dapat mengirim file ke object storage. Periksa koneksi dan konfigurasi CORS storage.";
  if (/size|8 MB|permitted/i.test(message)) return "File melebihi batas 8 MB atau ukuran file tidak valid.";
  return message;
}
