// ── media.js ──
// Cloudflare R2 integration (S3-compatible API) for content library storage.
//
// WHY R2, NOT THE RAILWAY VOLUME:
// Files uploaded through the app server (multer → disk) had a hard 50MB ceiling,
// every upload and every playback passed fully through Express, and media storage
// shared the same volume as the SQLite database. R2 removes all three problems:
// browsers upload and stream directly to/from R2 via presigned URLs, the file never
// touches the Node process, and R2 has zero egress fees (unlike S3) which matters
// for a platform where the same guided track gets played repeatedly.
//
// VOICE PROCESSING (ElevenLabs TTS, Deepgram STT) IS NOT AFFECTED BY THIS MODULE —
// that stays tightly coupled to Railway, live request/response, nothing to do with
// file storage. This module only handles static files: documents, audio, video.
//
// ACCESS CONTROL: presigned GET URLs are short-lived (10 minutes) and are only ever
// generated after the existing tier-gating check (canSeeFile/userMaxLevel in db.js)
// has already passed — see /api/content/library/:id/playback-url in server.js.
// This preserves the same Registered/Member/Client/Facilitator/Admin visibility
// cascade that already governs which files appear in a person's Content tab.

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const R2_ACCOUNT_ID  = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET      = process.env.R2_BUCKET_NAME || 'per-bot-media';

const configured = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY);

const client = configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
    })
  : null;

function isConfigured() { return configured; }

// Presigned PUT URL — browser uploads the file directly to R2, bypassing Express/multer.
// Expires quickly (10 min) since it's only used for the single upload it was issued for.
async function getUploadUrl(key, contentType) {
  if (!client) throw new Error('R2 is not configured — missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY.');
  const cmd = new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(client, cmd, { expiresIn: 600 });
}

// Presigned GET URL — only ever called AFTER the caller has already checked the
// requester's tier against the file's visibility. Short-lived so a copied/shared
// link goes stale quickly rather than working forever.
async function getPlaybackUrl(key) {
  if (!client) throw new Error('R2 is not configured.');
  const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return getSignedUrl(client, cmd, { expiresIn: 600 });
}

async function deleteObject(key) {
  if (!client) throw new Error('R2 is not configured.');
  await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

module.exports = { isConfigured, getUploadUrl, getPlaybackUrl, deleteObject, R2_BUCKET };
