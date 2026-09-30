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

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const FILE_TYPES = {
  'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP', 'image/gif': 'GIF',
  'application/pdf': 'PDF', 'text/plain': 'TXT', 'text/csv': 'CSV', 'text/markdown': 'MD',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
};
export const FILE_ACCEPT = Object.keys(FILE_TYPES).join(',');

export function validateFile(file) {
  if (!FILE_TYPES[file.type]) return 'That file type is not allowed. Use an image, PDF, text, CSV or Office file.';
  if (file.size > MAX_FILE_BYTES) return 'Files can be up to 10 MB';
  return null;
}

// Signed direct upload of any allowed file, with progress. Returns what the API needs to store.
export async function uploadFile(file, onProgress) {
  const problem = validateFile(file);
  if (problem) throw new Error(problem);
  const { data: s } = await api.post('/uploads/sign', { kind: 'attachment' });
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', s.apiKey);
  body.append('timestamp', s.timestamp);
  body.append('folder', s.folder);
  body.append('signature', s.signature);

  const result = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${s.cloudName}/auto/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error('Upload failed. Try again.')));
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'));
    xhr.send(body);
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type === 'raw' ? 'raw' : 'image',
    name: file.name,
    size: file.size,
    mime: file.type,
  };
}
