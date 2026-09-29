import crypto from 'node:crypto';

// Kinds map to folders inside the shared Cloudinary account. Everything lives under huddle/.
const FOLDERS = { avatar: 'huddle/avatars', attachment: 'huddle/attachments' };

// Signed direct upload: the browser sends the file straight to Cloudinary with a
// short-lived signature, so the API secret never leaves the server and file bytes
// never pass through the serverless function (4.5MB body limit).
export function signUpload(req, res) {
  const folder = FOLDERS[req.body?.kind] || FOLDERS.avatar;
  const timestamp = Math.floor(Date.now() / 1000);
  // Params must be signed in alphabetical order.
  const signature = crypto
    .createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`)
    .digest('hex');
  res.json({ cloudName: process.env.CLOUDINARY_CLOUD_NAME, apiKey: process.env.CLOUDINARY_API_KEY, folder, timestamp, signature });
}
