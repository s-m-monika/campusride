// Browser OCR using Tesseract.js. Runs entirely locally — the selected image
// is read into an in-memory object URL, passed to Tesseract, and the object URL
// is revoked afterwards. The image is never uploaded anywhere.
import Tesseract from 'tesseract.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImageFile(file) {
  if (!file) return 'Please choose an image file.';
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Unsupported file type. Use a JPG, PNG or WEBP image.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image is too large (max 5 MB). Choose a smaller photo.';
  }
  return null;
}

// Run OCR. onProgress receives 0..100. Returns the recognised text.
// Caller owns the previewUrl lifecycle; we only read from the given file.
export async function runOcr(file, onProgress) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const result = await Tesseract.recognize(objectUrl, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          onProgress?.(Math.round(m.progress * 100));
        }
      },
    });
    return (result?.data?.text || '').trim();
  } finally {
    // Release the temporary image data as soon as OCR is done.
    URL.revokeObjectURL(objectUrl);
  }
}

// Best-effort field extraction hints from raw OCR text. These are only
// SUGGESTIONS the user confirms/corrects — never treated as ground truth.
export function extractHints(text, usnPrefix = '1ST') {
  const hints = {};
  if (!text) return hints;
  const upper = text.toUpperCase();

  // USN pattern like 1ST23CS001
  const usnRe = new RegExp(`${usnPrefix}\\s?\\d{2}\\s?[A-Z]{2}\\s?\\d{3}`, 'i');
  const usnMatch = upper.replace(/\s+/g, '').match(new RegExp(`${usnPrefix}\\d{2}[A-Z]{2}\\d{3}`, 'i'));
  if (usnMatch) hints.usn = usnMatch[0];

  // Graduation / year like 2024, 2025, 2026, 2027
  const yearMatch = text.match(/\b20(2\d|3\d)\b/);
  if (yearMatch) hints.graduationYear = yearMatch[0];

  return hints;
}
