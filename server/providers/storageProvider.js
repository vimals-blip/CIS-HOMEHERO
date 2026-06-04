import crypto from 'node:crypto';

const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION;
export const storageEnabled = Boolean(BUCKET && REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

// Returns where a client should upload a file and the final URL it will live at.
// Mock mode returns a placeholder; real mode would return an S3 presigned PUT.
export const storageProvider = {
  enabled: storageEnabled,

  async getUploadTarget({ folder = 'kyc', contentType = 'image/jpeg' } = {}) {
    const key = `${folder}/${crypto.randomUUID()}`;
    if (!storageEnabled) {
      // No bucket configured — clients upload elsewhere and pass us the URL.
      return { mode: 'mock', key, upload_url: null, file_url: null };
    }
    // TODO(real-s3): use @aws-sdk/client-s3 + getSignedUrl to presign a PUT.
    const fileUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
    return { mode: 's3', key, upload_url: fileUrl, file_url: fileUrl, contentType };
  },
};
