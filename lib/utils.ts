export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadBase64File = (base64: string, filename: string, mimeType: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Converts a CMYK color string "c,m,y,k" (0-100) to a Hex string.
export const cmykToHex = (cmyk: string): string => {
    const [c, m, y, k] = cmyk.split(',').map(Number);
    if ([c, m, y, k].some(isNaN)) return '#000000';

    const r = 255 * (1 - c / 100) * (1 - k / 100);
    const g = 255 * (1 - m / 100) * (1 - k / 100);
    const b = 255 * (1 - y / 100) * (1 - k / 100);

    const toHex = (c: number) => ('0' + Math.round(c).toString(16)).slice(-2);

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Converts a Hex color string to a CMYK string "c,m,y,k" (0-100).
export const hexToCmyk = (hex: string): string => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }

    if (r === 0 && g === 0 && b === 0) {
        return '0,0,0,100';
    }

    let c = 1 - (r / 255);
    let m = 1 - (g / 255);
    let y = 1 - (b / 255);

    const minCmy = Math.min(c, m, y);
    c = (c - minCmy) / (1 - minCmy);
    m = (m - minCmy) / (1 - minCmy);
    y = (y - minCmy) / (1 - minCmy);
    const k = minCmy;

    return [c, m, y, k].map(v => Math.round(v * 100)).join(',');
}

export const removeGreenScreen = (pngBase64: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const hardThreshold = 40; // Greenness above this is definitely background
      const softThreshold = 20; // Greenness above this starts to fade out

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calculate "greenness" as how much greener the pixel is than red or blue.
        const greenness = g - Math.max(r, b);

        if (greenness > hardThreshold) {
          data[i + 3] = 0; // Set alpha to 0 (fully transparent)
        } else if (greenness > softThreshold) {
          // Fade out for pixels in the soft threshold range (for anti-aliasing)
          const alphaMultiplier = 1 - ((greenness - softThreshold) / (hardThreshold - softThreshold));
          data[i + 3] = Math.floor(data[i + 3] * alphaMultiplier);
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => {
      reject(new Error('Failed to load image for processing'));
    };
    img.src = `data:image/png;base64,${pngBase64}`;
  });
};