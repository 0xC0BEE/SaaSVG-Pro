import { GoogleGenAI, Modality } from "@google/genai";
import { type GeneratorOptions, type Asset, type ColorInfo, type ApiChoice } from './types';
import { NANO_PROMPT_TEMPLATE, NARRATIVES, STYLES } from '../constants';

// @ts-ignore - Assuming CryptoJS is globally available via a script tag.
declare const CryptoJS: any;

const GEMINI_API_KEY = process.env.API_KEY;

/**
 * Creates a seed string for the prompt.
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
The design should be suitable for a [theme] context.
The style should be: [style].
The scene should depict: [narrative].
The primary subject is: [prompt].

Style guidance: Please incorporate style seed "[seed]" to influence subtle variations in shapes, curves, and composition for a unique result.

Provide ONLY the SVG code, starting with "<svg" and ending with "</svg>". Do not include any other text, explanations, or markdown code fences.
`;

/**
 * Extracts an SVG code block from a string, handling markdown wrappers.
 */
function extractSvg(responseText: string): string | null {
  const cleanedText = responseText.replace(/^```(?:svg)?\n?/, '').replace(/```$/, '').trim();
  const svgRegex = /<svg[\s\S]*?<\/svg>/;
  const match = cleanedText.match(svgRegex);
  return match ? match[0] : null;
}

const VISION_FALLBACK_PROMPT = "Generate high-fidelity undraw SVG from this PNG: minimalist flat illustration, clean cubic bezier paths for figure/charts/mug, 8 colors, viewBox 0 0 400 300, <g> groups, no rasters.";

async function vectorizeWithRecraft(pngBase64: string, token: string, onStatusUpdate: (status: string) => void): Promise<string> {
    onStatusUpdate('Sending to Recraft.ai...');
    const RECRAFT_REPLICATE_VERSION = "recraft-ai/recraft-vectorize:5952a255de31454591a56111f44f6f87425f18751512140409a8a7298642a84d";
    
    // Initial POST to start the prediction
    const initResponse = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            version: RECRAFT_REPLICATE_VERSION,
            input: { image: `data:image/png;base64,${pngBase64}` },
        }),
    });

    if (!initResponse.ok) {
        const errorText = await initResponse.text();
        throw new Error(`Recraft.ai initial call failed: ${initResponse.status} ${errorText}`);
    }

    let prediction = await initResponse.json();
    const predictionUrl = prediction.urls.get;

    onStatusUpdate('Recraft.ai is processing...');

    // Poll for the result
    const pollStartTime = Date.now();
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
        if (Date.now() - pollStartTime > 60000) { // 60-second timeout
            throw new Error('Recraft.ai polling timed out.');
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
        
        const pollResponse = await fetch(predictionUrl, {
            headers: { 'Authorization': `Token ${token}` }
        });
        if (!pollResponse.ok) {
            throw new Error(`Recraft.ai polling failed: ${pollResponse.status}`);
        }
        prediction = await pollResponse.json();
    }

    if (prediction.status === 'failed') {
        throw new Error(`Recraft.ai prediction failed: ${prediction.error}`);
    }

    const svgOutput = prediction.output;
     if (!svgOutput || !svgOutput.includes('<svg')) {
        throw new Error('Recraft.ai returned an empty or invalid SVG.');
    }
    console.log('SVG from Recraft.ai length:', svgOutput.length);
    return svgOutput;
}

async function vectorizeWithVectorizerAI(pngBase64: string, apiKey: string, apiSecret: string, onStatusUpdate: (status: string) => void): Promise<string> {
    onStatusUpdate('Sending to Vectorizer.ai...');
    const formData = new FormData();
    const byteCharacters = atob(pngBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const imageBlob = new Blob([byteArray], { type: 'image/png' });

    formData.append('image', imageBlob, 'image.png');
    formData.append('output.file_format', 'svg');

    const response = await fetch('https://api.vectorizer.ai/api/v1/vectorize', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + btoa(`${apiKey}:${apiSecret}`)
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vectorizer.ai API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const svgText = await response.text();
    if (!svgText || !svgText.includes('<svg')) {
        throw new Error('Vectorizer.ai returned an empty or invalid SVG.');
    }
    console.log('SVG from Vectorizer.ai length:', svgText.length);
    return svgText;
}


/**
 * Converts a PNG image to SVG using the selected API provider, with a fallback to Gemini Vision.
 */
async function pngToSVG(
    pngBase64: string, 
    options: GeneratorOptions,
    onStatusUpdate: (status: string) => void
): Promise<string> {
    
    const { apiChoice, vectorizerID, vectorizerSecret, recraftToken } = options;
    console.log('Selected API:', apiChoice);

    try {
        switch (apiChoice) {
            case 'vectorizer':
                if (!vectorizerID || !vectorizerSecret) throw new Error('Vectorizer.ai keys are missing.');
                return await vectorizeWithVectorizerAI(pngBase64, vectorizerID, vectorizerSecret, onStatusUpdate);
            case 'recraft':
                if (!recraftToken) throw new Error('Recraft.ai (Replicate) token is missing.');
                return await vectorizeWithRecraft(pngBase64, recraftToken, onStatusUpdate);
            default:
                 throw new Error(`Unknown API provider: ${apiChoice}`);
        }
    } catch (error) {
        console.error(`Error calling ${apiChoice} API, using vision fallback:`, error);
        onStatusUpdate(`${apiChoice} failed, using vision fallback...`);
        
        const imagePart = { inlineData: { mimeType: 'image/png', data: pngBase64 } };
        const textPart = { text: VISION_FALLBACK_PROMPT };

        const fallbackResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [imagePart, textPart] },
            config: { temperature: 0.1 },
        });

        const fallbackSvg = extractSvg(fallbackResponse.text);
        if (!fallbackSvg) {
            console.error('Vision fallback also failed to produce a valid SVG.');
            throw new Error('Vision fallback failed to produce a valid SVG.');
        }
        
        console.log('Vision fallback success, SVG length:', fallbackSvg.length);
        return fallbackSvg;
    }
}

function formatPaletteForPrompt(palette: ColorInfo[]): string {
    // ... [existing implementation]
    const primaryColors = palette.filter(c => c.category === 'primary');
    const secondaryColors = palette.filter(c => c.category === 'secondary');

    const totalPercent = palette.reduce((sum, c) => sum + c.percent, 0);
    const scaleFactor = totalPercent > 0 ? 100 / totalPercent : 1;

    const formatCategory = (colors: ColorInfo[], categoryName: string) => {
        if (colors.length === 0) return '';
        let totalCategoryPercent = 0;
        const colorList = colors.map(c => {
            const normalizedPercent = Math.round(c.percent * scaleFactor);
            totalCategoryPercent += normalizedPercent;
            return `${c.hex} (${normalizedPercent}%)`;
        }).join(', ');
        
        const sumOfNormalized = colors.reduce((sum, c) => sum + Math.round(c.percent * scaleFactor), 0);

        return `${categoryName} colors (${sumOfNormalized}% total): [${colorList}]`;
    };

    const primaryString = formatCategory(primaryColors, 'Primary');
    const secondaryString = formatCategory(secondaryColors, 'Secondary');
    
    const parts = [primaryString, secondaryString].filter(Boolean);
    
    if (parts.length === 0) return "using a vibrant, high-contrast color palette.";
    
    return `Generate a limited palette illustration using only these colors: ${parts.join('; ')}. Use exact hex fills/strokes/gradients, no other colors.`;
}

export const generateSVGs = async (
  options: GeneratorOptions,
  onStatusUpdate: (status: string) => void
): Promise<Asset[]> => {
  const { prompt, mode, theme, narrative, style, seed, palette } = options;
  const BATCH_SIZE = 1; 
  const assets: Asset[] = [];

  for (let i = 0; i < BATCH_SIZE; i++) {
    onStatusUpdate(`Generating variant ${i + 1}/${BATCH_SIZE}...`);
    const currentSeed = seed + i;
    const hashedSeed = getHashedSeed(currentSeed);

    try {
      if (mode === 'nano') {
        const styleObject = STYLES[style as keyof typeof STYLES];
        const stylePrompt = styleObject.prompt;
        const colorPrompt = formatPaletteForPrompt(palette);
        
        let nanoPrompt = NANO_PROMPT_TEMPLATE
          .replace('[narrative]', NARRATIVES[narrative as keyof typeof NARRATIVES])
          .replace('[theme]', theme)
          .replace('[colors]', colorPrompt)
          .replace('[style]', stylePrompt)
          .replace('[prompt]', prompt);
        nanoPrompt += `\nStyle seed: ${hashedSeed}`;

        onStatusUpdate(`Generating PNG for variant ${i + 1}...`);
        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash-exp',
          contents: { parts: [{ text: nanoPrompt }] },
          config: { responseModalities: [Modality.IMAGE] },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart && imagePart.inlineData) {
          const base64Image = imagePart.inlineData.data;
          const svg = await pngToSVG(base64Image, options, onStatusUpdate);
          assets.push({ svg, png: base64Image, seed: currentSeed });
        } else {
          throw new Error('No image data returned from API for nano mode.');
        }

      } else { // classic mode
        const styleObject = STYLES[style as keyof typeof STYLES];
        const styleDescription = styleObject.description;

        let classicPrompt = CLASSIC_SVG_PROMPT
          .replace('[theme]', theme)
          .replace('[narrative]', NARRATIVES[narrative as keyof typeof NARRATIVES])
          .replace('[style]', styleDescription)
          .replace('[colors]', 'a color palette appropriate for the theme')
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
  }

  if (assets.length === 0 && BATCH_SIZE > 0) {
      throw new Error(`Generation failed for all variants.`);
  }

  return assets;
};