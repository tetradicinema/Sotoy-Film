import { type Area } from 'react-easy-crop';

/**
 * Creates a cropped image data URL from the original image and pixel crop area using HTML5 Canvas.
 * Because the crop area is locked to aspect ratio 1 (1:1 square), the resulting canvas is guaranteed square.
 */
export const createCroppedImage = async (
  imageSrc: string,
  pixelCrop: Area,
  outputType: string = 'image/jpeg'
): Promise<string> => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', error => reject(error));
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia.');
  }

  // Force output dimensions to the exact crop area (square 1:1)
  const width = Math.max(1, Math.round(pixelCrop.width));
  const height = Math.max(1, Math.round(pixelCrop.height));

  canvas.width = width;
  canvas.height = height;

  // Clear canvas before drawing
  ctx.clearRect(0, 0, width, height);

  // Draw the specified cropped portion onto the canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    width,
    height
  );

  // Export to high-quality base64 data URL
  const format = outputType.startsWith('image/') ? outputType : 'image/jpeg';
  return canvas.toDataURL(format, 0.95);
};
