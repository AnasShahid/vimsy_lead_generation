import { Storage } from '@google-cloud/storage';
import path from 'path';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'vimsy-reports';
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve(__dirname, '../../../credentials.json');
const SIGNED_URL_EXPIRY_DAYS = Number(process.env.GCS_SIGNED_URL_EXPIRY_DAYS) || 7;

let storage: Storage | null = null;

function getStorage(): Storage {
  if (!storage) {
    storage = new Storage({ keyFilename: CREDENTIALS_PATH });
    console.log(`[GCS] Initialized with bucket: ${BUCKET_NAME}, credentials: ${CREDENTIALS_PATH}`);
  }
  return storage;
}

/**
 * Get the monthly folder name for GCS organization.
 * Format: "Jan 2026", "Feb 2026", etc.
 */
function getMonthlyFolder(date: Date = new Date()): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export interface GCSUploadResult {
  gcsPath: string;
  gcsUrl: string;
  gcsUrlExpires: string;
}

/**
 * Upload a local PDF file to Google Cloud Storage.
 * Files are organized in monthly folders: "Jan 2026/filename.pdf"
 */
export async function uploadReportToGCS(
  localFilePath: string,
  filename: string
): Promise<GCSUploadResult> {
  const gcs = getStorage();
  const bucket = gcs.bucket(BUCKET_NAME);

  const folder = getMonthlyFolder();
  const gcsPath = `${folder}/${filename}`;

  console.log(`[GCS] Uploading ${filename} to gs://${BUCKET_NAME}/${gcsPath}`);

  await bucket.upload(localFilePath, {
    destination: gcsPath,
    metadata: {
      contentType: 'application/pdf',
      metadata: {
        uploadedAt: new Date().toISOString(),
        source: 'vimsy-lead-gen',
      },
    },
  });

  // Generate signed URL for reading
  const signedUrl = await generateSignedUrl(gcsPath);

  console.log(`[GCS] Upload complete: gs://${BUCKET_NAME}/${gcsPath}`);

  return {
    gcsPath,
    gcsUrl: signedUrl.url,
    gcsUrlExpires: signedUrl.expires,
  };
}

/**
 * Generate a V4 signed URL for reading a file from GCS.
 * Default expiry: 7 days (configurable via GCS_SIGNED_URL_EXPIRY_DAYS).
 */
export async function generateSignedUrl(
  gcsPath: string,
  expiryDays: number = SIGNED_URL_EXPIRY_DAYS
): Promise<{ url: string; expires: string }> {
  const gcs = getStorage();
  const bucket = gcs.bucket(BUCKET_NAME);
  const file = bucket.file(gcsPath);

  const expiresMs = expiryDays * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + expiresMs);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expiresAt,
    responseDisposition: 'inline',
    responseType: 'application/pdf',
  });

  return {
    url,
    expires: expiresAt.toISOString(),
  };
}

/**
 * Generate a signed URL for downloading (attachment disposition).
 * Used by email services to download the PDF as a blob.
 */
export async function generateDownloadSignedUrl(
  gcsPath: string,
  filename: string,
  expiryDays: number = SIGNED_URL_EXPIRY_DAYS
): Promise<{ url: string; expires: string }> {
  const gcs = getStorage();
  const bucket = gcs.bucket(BUCKET_NAME);
  const file = bucket.file(gcsPath);

  const expiresMs = expiryDays * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + expiresMs);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expiresAt,
    responseDisposition: `attachment; filename="${filename}"`,
    responseType: 'application/pdf',
  });

  return {
    url,
    expires: expiresAt.toISOString(),
  };
}

/**
 * Check if a signed URL has expired or is about to expire (within 1 hour).
 */
export function isSignedUrlExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const expires = new Date(expiresAt).getTime();
  const buffer = 60 * 60 * 1000; // 1 hour buffer
  return Date.now() > (expires - buffer);
}

/**
 * Delete a file from GCS.
 */
export async function deleteFromGCS(gcsPath: string): Promise<void> {
  try {
    const gcs = getStorage();
    const bucket = gcs.bucket(BUCKET_NAME);
    await bucket.file(gcsPath).delete();
    console.log(`[GCS] Deleted: gs://${BUCKET_NAME}/${gcsPath}`);
  } catch (err: any) {
    console.warn(`[GCS] Failed to delete gs://${BUCKET_NAME}/${gcsPath}: ${err.message}`);
  }
}
