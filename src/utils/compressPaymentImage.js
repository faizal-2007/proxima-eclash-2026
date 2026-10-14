const MAX_INPUT_SIZE = 5 * 1024 * 1024;
const TARGET_SIZE = 1024 * 1024;
const MAX_DIMENSION = 1600;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const canvasToBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Could not process this image. Please choose another screenshot.'));
        }
      },
      'image/jpeg',
      quality
    );
  });

export const compressPaymentImage = async (file) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Choose a JPG, PNG, or WebP payment screenshot.');
  }

  if (file.size > MAX_INPUT_SIZE) {
    throw new Error('The original screenshot must be 5 MB or smaller.');
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This image could not be opened. Please choose another screenshot.');
  }

  try {
    let scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');

    for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt += 1) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Image compression is unavailable in this browser.');
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (let quality = 0.86; quality >= 0.46; quality -= 0.1) {
        const compressed = await canvasToBlob(canvas, quality);
        if (compressed.size <= TARGET_SIZE) {
          return compressed;
        }
      }

      scale *= 0.75;
    }
  } finally {
    bitmap.close();
  }

  throw new Error('This screenshot could not be compressed below 1 MB. Please use a smaller image.');
};

export const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the compressed screenshot.'));
    reader.readAsDataURL(blob);
  });
