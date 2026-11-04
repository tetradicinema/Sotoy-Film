export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

/**
 * Validates if the selected file is one of the supported image formats:
 * JPG, JPEG, PNG, WEBP, HEIC
 */
export function isAllowedImageType(file: File): boolean {
  if (file.type && ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return true;
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return true;
  }
  return false;
}

/**
 * Compresses an image file client-side using browser-image-compression:
 * - maxWidthOrHeight: 1600
 * - maxSizeMB: 0.4
 * - useWebWorker: true
 * Returns a Data URL string ready for Firebase Storage uploadString.
 */
export async function compressBuzzImage(file: File): Promise<string> {
  const options = {
    maxWidthOrHeight: 1600,
    maxSizeMB: 0.4,
    useWebWorker: true,
  };

  // Loaded on demand so the compression library stays out of the initial bundle.
  const { default: imageCompression } = await import('browser-image-compression');
  const compressedBlob = await imageCompression(file, options);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal mengonversi file gambar ke data URL.'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(compressedBlob);
  });
}
