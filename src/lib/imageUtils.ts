/**
 * Compresses an image File or Data URL to an optimized JPEG data URL
 * to stay well under LocalStorage (5MB) and Firestore (1MB) limits.
 */
export const compressImage = (
  input: File | string,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.8
): Promise<string> => {
  return new Promise((resolve) => {
    // If it's a standard web URL (http/https) or SVG or small string, return as is
    if (typeof input === 'string') {
      if (
        input.startsWith('http://') ||
        input.startsWith('https://') ||
        input.length < 50000 ||
        input.includes('image/svg+xml')
      ) {
        return resolve(input);
      }
    } else if (input.size < 80 * 1024 || input.type === 'image/svg+xml') {
      // Very small file (< 80KB), convert directly to data URL
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(input);
      return;
    }

    const processImageDataUrl = (dataUrl: string) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(dataUrl);
        }

        ctx.drawImage(img, 0, 0, width, height);
        try {
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (e) {
          console.warn('Canvas export failed, returning original image data', e);
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };

    if (typeof input === 'string') {
      processImageDataUrl(input);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = (e.target?.result as string) || '';
        if (result) {
          processImageDataUrl(result);
        } else {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(input);
    }
  });
};
