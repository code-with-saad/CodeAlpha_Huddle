import { api } from './api';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImage(file) {
  if (!ALLOWED.includes(file.type)) return 'Use a JPG, PNG or WebP image';
  if (file.size > MAX_IMAGE_BYTES) return 'Image must be under 5 MB';
  return null;
}

// Ask our server for a signature, then upload straight to Cloudinary.
export async function uploadImage(file, kind = 'avatar') {
  const problem = validateImage(file);
  if (problem) throw new Error(problem);

  const { data: s } = await api.post('/uploads/sign', { kind });
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', s.apiKey);
  body.append('timestamp', s.timestamp);
  body.append('folder', s.folder);
  body.append('signature', s.signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, { method: 'POST', body });
  if (!res.ok) throw new Error('Upload failed. Try again.');
  return (await res.json()).secure_url;
}

// Cropped, resized delivery URL, e.g. thumb(url, 32) for a 32px avatar (2x for sharp screens).
export function thumb(url, size) {
  if (!url || !url.includes('/upload/')) return url;
  const px = size * 2;
  return url.replace('/upload/', `/upload/c_fill,g_auto,w_${px},h_${px},f_auto,q_auto/`);
}
