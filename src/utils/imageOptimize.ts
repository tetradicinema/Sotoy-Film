import { slugify } from './slugify';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface OptimizeImageOptions {
  /** Longest side of the resized image in pixels. */
  maxLongSide: number;
  /** Initial encoder quality between 0 and 1. */
  quality?: number;
  /** Optional size target in kilobytes. */
  targetKB?: number;
}

export interface OptimizedImage {
  file: File;
  width: number;
  height: number;
  mimeType: string;
  originalSize: number;
  optimizedSize: number;
  wasOptimized: boolean;
}

const positiveNumber = (value: unknown): number => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
};

/**
 * Scales an image down so its longest side fits maxLongSide. Never upscales,
 * never crops, and always preserves the original aspect ratio.
 */
export function getTargetSize(width: number, height: number, maxLongSide: number): ImageDimensions {
  const originalWidth = positiveNumber(width);
  const originalHeight = positiveNumber(height);
  const limit = positiveNumber(maxLongSide);

  if (!originalWidth || !originalHeight || !limit) {
    return { width: 0, height: 0 };
  }

  const longSide = Math.max(originalWidth, originalHeight);
  if (longSide <= limit) {
    return { width: Math.round(originalWidth), height: Math.round(originalHeight) };
  }

  const scale = limit / longSide;
  return {
    width: Math.max(1, Math.round(originalWidth * scale)),
    height: Math.max(1, Math.round(originalHeight * scale)),
  };
}

export function formatImageSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function describeImageOptimization(result: Pick<OptimizedImage, 'originalSize' | 'optimizedSize' | 'wasOptimized'>): string {
  if (!result.wasOptimized) {
    return `Gambar diunggah tanpa kompresi: ${formatImageSize(result.optimizedSize)}`;
  }
  return `Gambar dikompres: ${formatImageSize(result.originalSize)} menjadi ${formatImageSize(result.optimizedSize)}`;
}

const extensionFromMime = (mimeType: string): string => {
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'image/svg+xml') return 'svg';
  return 'jpg';
};

/** File extension matching the optimized output. */
export function imageFileExtension(mimeType: string): string {
  return extensionFromMime(mimeType);
}

/**
 * Builds a readable, SEO-friendly storage file name: slugified source plus a
 * timestamp, capped at 60 characters for the slug part.
 */
export function buildImageStorageFileName(
  source: string,
  extension: string,
  timestamp: number = Date.now()
): string {
  const ext = extension.replace(/^\./, '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const withoutExtension = (source || '').replace(/\.[^./\\]+$/, '');
  const base = slugify(withoutExtension).slice(0, 60).replace(/-+$/, '') || 'artikel';
  return `${base}-${timestamp}.${ext}`;
}

let webpSupportPromise: Promise<boolean> | null = null;

const canEncodeWebP = (): Promise<boolean> => {
  if (typeof document === 'undefined') return Promise.resolve(false);
  if (webpSupportPromise) return webpSupportPromise;

  webpSupportPromise = new Promise<boolean>(resolve => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      if (typeof canvas.toBlob !== 'function') {
        resolve(false);
        return;
      }
      canvas.toBlob(blob => resolve(Boolean(blob && blob.type === 'image/webp')), 'image/webp', 0.8);
    } catch {
      resolve(false);
    }
  });

  return webpSupportPromise;
};

const loadImageElement = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image-load-failed'));
    };
    img.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> =>
  new Promise(resolve => canvas.toBlob(resolve, type, quality));

/**
 * Resizes and compresses an image for the web. GIF and SVG files are passed
 * through untouched so animation and vector data survive. All other formats
 * are re-encoded as WebP when the browser supports it, otherwise JPEG.
 */
export async function optimizeImageForWeb(
  file: File,
  options: OptimizeImageOptions
): Promise<OptimizedImage> {
  const originalSize = file.size;
  const passthroughMime = file.type || 'image/jpeg';

  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    let width = 0;
    let height = 0;
    try {
      const img = await loadImageElement(file);
      width = img.naturalWidth || 0;
      height = img.naturalHeight || 0;
    } catch {
      // Dimensions are optional for pass-through formats.
    }
    return {
      file,
      width,
      height,
      mimeType: passthroughMime,
      originalSize,
      optimizedSize: originalSize,
      wasOptimized: false,
    };
  }

  if (typeof document === 'undefined') {
    return {
      file,
      width: 0,
      height: 0,
      mimeType: passthroughMime,
      originalSize,
      optimizedSize: originalSize,
      wasOptimized: false,
    };
  }

  const img = await loadImageElement(file);
  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;
  const useWebP = await canEncodeWebP();
  const mimeType = useWebP ? 'image/webp' : 'image/jpeg';

  let dimensions = getTargetSize(naturalWidth, naturalHeight, options.maxLongSide);
  if (!dimensions.width || !dimensions.height) {
    throw new Error('invalid-image-dimensions');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas-unavailable');

  const targetBytes = options.targetKB && options.targetKB > 0 ? options.targetKB * 1024 : 0;
  let quality = Math.min(0.95, Math.max(0.4, options.quality ?? 0.82));
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
    blob = await canvasToBlob(canvas, mimeType, quality);

    if (!blob) throw new Error('image-encode-failed');
    if (!targetBytes || blob.size <= targetBytes) break;
    if (quality > 0.5) {
      quality = Math.max(0.5, quality - 0.1);
      continue;
    }

    const currentLongSide = Math.max(dimensions.width, dimensions.height);
    const nextLongSide = Math.max(1, Math.round(currentLongSide * 0.85));
    const next = getTargetSize(dimensions.width, dimensions.height, nextLongSide);
    if (next.width === dimensions.width && next.height === dimensions.height) break;
    dimensions = next;
    quality = 0.75;
  }

  if (!blob) throw new Error('image-encode-failed');

  const extension = extensionFromMime(mimeType);
  const optimizedFile = new File([blob], buildImageStorageFileName(file.name, extension), {
    type: mimeType,
  });

  return {
    file: optimizedFile,
    width: dimensions.width,
    height: dimensions.height,
    mimeType,
    originalSize,
    optimizedSize: optimizedFile.size,
    wasOptimized: true,
  };
}
