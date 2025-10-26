import { GoogleGenAI, Modality } from "@google/genai";
import { type GeneratorOptions, type Asset } from './types';
import { NANO_PROMPT_TEMPLATE } from '../constants';

// @ts-ignore - Assuming CryptoJS is globally available via a script tag.
declare const CryptoJS: any;

// API keys are read from environment variables.
// For local development, create a .env.local file.
// In a deployed environment, these should be set as secrets.
const GEMINI_API_KEY = process.env.API_KEY;

// Vite exposes client-side env vars with a VITE_ prefix.
// We also check for non-prefixed vars as a fallback for environments where prefixing isn't possible.
const VECTORIZER_API_KEY = process.env.VITE_VECTORIZER_KEY || process.env.VECTORIZER_KEY;
const VECTORIZER_API_SECRET = process.env.VITE_VECTORIZER_SECRET || process.env.VECTORIZER_SECRET;


/**
 * Creates a seed string for the prompt.
 * Per instruction, this attempts to use CryptoJS.MD5 if it's available globally
 * to create a hashed seed for pseudo-reproducibility.
 * If CryptoJS is not found, it falls back to using the raw seed number.
 * @param seed The input seed number.
 * @returns A string representing the seed, preferably a short hash.
 */
const getHashedSeed = (seed: number): string => {
  if (typeof CryptoJS !== 'undefined' && typeof CryptoJS.MD5 === 'function') {
    return CryptoJS.MD5(String(seed)).toString().slice(0, 8);
  }
  return String(seed);
};

if (!GEMINI_API_KEY) {
    throw new Error("Gemini API Key is missing. Please add it to the Secrets (🔑) panel as 'API_KEY'.");
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const CLASSIC_SVG_PROMPT = `
You are an expert SVG designer. Create a clean, modern, and visually appealing SVG icon based on the following requirements.
The SVG should be a single self-contained file, without any external dependencies or scripts.
It must use vector shapes (path, circle, rect, etc.) and not embed any raster images.
The design should be suitable for a [theme] context, conveying a sense of [narrative].
Use a [colors] color palette.
The primary subject is: [prompt].

Style guidance: Please incorporate style seed "[seed]" to influence subtle variations in shapes, curves, and composition for a unique result.

Provide ONLY the SVG code, starting with "<svg" and ending with "</svg>". Do not include any other text, explanations, or markdown code fences.
`;

/**
 * Extracts an SVG code block from a string, handling markdown wrappers.
 * @param responseText The text potentially containing an SVG.
 * @returns The SVG string or null if not found.
 */
function extractSvg(responseText: string): string | null {
  // First, remove markdown code fences
  const cleanedText = responseText.replace(/^```(?:svg)?\n?/, '').replace(/```$/, '').trim();
  // Then, find the first <svg ... </svg> block
  const svgRegex = /<svg[\s\S]*?<\/svg>/;
  const match = cleanedText.match(svgRegex);
  return match ? match[0] : null;
}

/**
 * Converts a base64 string to a Blob object.
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

/**
 * Converts a PNG image to SVG using the Vectorizer.ai API.
 * @param pngBase64 The base64-encoded PNG data.
 * @returns A promise that resolves to the SVG string.
 */
async function pngToSVGVectorizer(pngBase64: string, onStatusUpdate: (status: string) => void): Promise<string> {
    onStatusUpdate('Vectorizing with Vectorizer.ai...');
    const fallbackSvg = `<svg viewBox="0 0 400 300"><rect width="400" height="300" fill="#F0F0F0" stroke="#CCC" stroke-width="2"/></svg>`;

    if (!VECTORIZER_API_KEY || !VECTORIZER_API_SECRET) {
        throw new Error('Vectorizer.ai API Key/Secret is missing. Please add VITE_VECTORIZER_KEY and VITE_VECTORIZER_SECRET to your secrets or .env.local file.');
    }

    try {
        const formData = new FormData();
        const imageBlob = base64ToBlob(pngBase64, 'image/png');
        formData.append('image', imageBlob, 'image.png');
        formData.append('output.file_format', 'svg');

        const response = await fetch('https://api.vectorizer.ai/api/v1/vectorize', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${VECTORIZER_API_KEY}:${VECTORIZER_API_SECRET}`)
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Vectorizer.ai API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const svgText = await response.text();
        if (!svgText || !svgText.includes('<svg')) {
            console.warn('Vectorizer.ai returned an empty or invalid SVG.');
            return fallbackSvg;
        }

        console.log('Vectorizer call success, SVG length:', svgText.length);
        return svgText;

    } catch (error) {
        console.error('Error calling Vectorizer.ai API:', error);
        if (error instanceof Error) {
            throw error; // Re-throw the original error to be caught by the main handler
        }
        return fallbackSvg; // Return fallback on other unknown errors
    }
}


export const generateSVGs = async (
  options: GeneratorOptions,
  onStatusUpdate: (status: string) => void
): Promise<Asset[]> => {
  const { prompt, mode, theme, colors, narrative, seed, singleGenMode } = options;
  const BATCH_SIZE = singleGenMode ? 1 : 1; 
  const assets: Asset[] = [];
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  for (let i = 0; i < BATCH_SIZE; i++) {
    onStatusUpdate(`Generating variant ${i + 1}/${BATCH_SIZE}...`);
    const currentSeed = seed + i;
    const hashedSeed = getHashedSeed(currentSeed);

    try {
      if (mode === 'nano') {
        let nanoPrompt = NANO_PROMPT_TEMPLATE
          .replace('[narrative]', narrative)
          .replace('[theme]', theme)
          .replace('[colors]', colors)
          .replace('[prompt]', prompt);
        nanoPrompt += `\nStyle seed: ${hashedSeed}`;

        onStatusUpdate(`Generating PNG for variant ${i + 1}...`);
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: nanoPrompt }] },
          config: { responseModalities: [Modality.IMAGE] },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart && imagePart.inlineData) {
          const base64Image = imagePart.inlineData.data;
          const svg = await pngToSVGVectorizer(base64Image, onStatusUpdate);
          assets.push({ svg, png: base64Image, seed: currentSeed });
        } else {
          throw new Error('No image data returned from API for nano mode.');
        }

      } else { // classic mode
        let classicPrompt = CLASSIC_SVG_PROMPT
          .replace('[theme]', theme)
          .replace('[narrative]', narrative)
          .replace('[colors]', colors)
          .replace('[prompt]', prompt)
          .replace('[seed]', hashedSeed);

        onStatusUpdate(`Generating SVG for variant ${i + 1}...`);
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: classicPrompt,
          config: { temperature: 0.1 },
        });
        
        const svgContent = extractSvg(response.text);
        if (!svgContent) {
          throw new Error('Invalid SVG response from classic mode.');
        }
        assets.push({ svg: svgContent, seed: currentSeed });
      }
    } catch (error) {
        console.error(`Failed to generate variant for seed ${currentSeed}:`, error);
        if (error instanceof Error) {
            throw new Error(`Generation failed: ${error.message}`);
        } else {
            throw new Error(`An unknown generation error occurred.`);
        }
    }

    // Delay between API calls if generating multiple variants
    if (BATCH_SIZE > 1 && i < BATCH_SIZE - 1) {
      onStatusUpdate(`Waiting 5s to avoid rate limits...`);
      await delay(5000);
    }
  }

  if (assets.length === 0 && BATCH_SIZE > 0) {
      throw new Error(`Generation failed for all variants.`);
  }

  return assets;
};