import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import ImageTracer from 'imagetracerjs';
import { type GeneratorOptions, type Asset } from './types';
import { NANO_PROMPT_TEMPLATE, ART_STYLES, NARRATIVES, ICON_ART_STYLES, ICON_THEMES, ICON_PROMPT_TEMPLATE } from '../constants';

/**
 * Converts a raster image (PNG) to an SVG string using imagetracer.js.
 * Includes pre-processing for low-contrast images to improve trace results.
 */
const rasterToSVG = (
    pngBase64: string,
    updateStatus: (status: string) => void
): Promise<string> => {
    return new Promise((resolve) => {
        updateStatus('Phase 2/3: Tracing PNG to SVG locally...');

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
                console.error("Could not get canvas context for tracing.");
                resolve('');
                return;
            }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);

            // FIX: Add check for invalid or empty imageData to prevent crashes.
            if (!imageData || !imageData.data || imageData.data.length === 0) {
                console.error("Invalid imageData, fallback");
                resolve('<svg viewBox="0 0 400 300"><rect width="400" height="300" fill="#F0F0F0" stroke="#CCC" stroke-width="2"/></svg>');
                return;
            }
            
            console.log('ImageData.data sample: ' + imageData.data?.slice(0,100) + '...');

            const data = imageData.data;

            // 1. Calculate variance to detect low-contrast images
            let sum = 0, sumSq = 0;
            for (let i = 0; i < data.length; i += 4) {
                const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                sum += luminance;
                sumSq += luminance * luminance;
            }
            const numPixels = data.length / 4;
            const mean = sum / numPixels;
            const variance = (sumSq / numPixels) - (mean * mean);
            console.log('Trace variance: ' + variance);

            // 2. Pre-process for low variance
            if (variance < 5000) {
                console.log('Low variance, boosting contrast for tracing.');
                let nonZeroPost = 0;
                for (let i = 0; i < data.length; i += 4) {
                    const r_inv = 255 - data[i];
                    const g_inv = 255 - data[i + 1];
                    const b_inv = 255 - data[i + 2];
                    const finalVal = (r_inv + g_inv + b_inv) / 3 > 200 ? 0 : 255;
                    data[i] = data[i + 1] = data[i + 2] = finalVal;
                    if (finalVal > 0) nonZeroPost++;
                }
                console.log('Post-boost non-zero pixels: ' + nonZeroPost);
                ctx.putImageData(imageData, 0, 0);
            }

            // 3. Fine-tuned imagetracerjs options for stability
            const traceOptions = {
                ltres: 0.5, 
                qtres: 0.5, 
                pathomit: 5,
                numberofcolors: 8,
            };
            
            const svgStr = ImageTracer.imageToSVG(imageData, traceOptions);
            
            // 4. Check for empty or invalid output
            if (typeof svgStr !== 'string' || !svgStr || svgStr === 'empty' || svgStr.length < 50 || !svgStr.includes('<path')) {
                console.error("Raw empty/invalid SVG from imagetracer:", svgStr ? svgStr.substring(0, 100) : String(svgStr));
                updateStatus('SVG conversion failed—showing PNG fallback.');
                resolve('');
            } else {
                console.log(`SVG length: ${svgStr.length}`);
                updateStatus('Phase 3/3: Finalizing asset...');
                resolve(svgStr);
            }
        };
        img.onerror = () => {
            console.error("Could not load PNG image for tracing.");
            resolve('');
        };
        img.src = `data:image/png;base64,${pngBase64}`;
    });
};


/**
 * Generates a single asset based on the provided options.
 * This function contains the core logic for both 'classic' and 'nano' modes.
 */
const generateSingleAsset = async (
  options: GeneratorOptions,
  updateStatus: (status: string) => void
): Promise<Asset> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  
  const paletteListRatios = options.palette
    .map(c => `${c.hex} ${c.percent}%`)
    .join(', ');
  // @ts-ignore
  const seedHash = CryptoJS.MD5(options.seed.toString()).toString();
  const styleSeedString = `lock exact composition, shapes, arrangement, and style to seed hash ${seedHash}—no variations, reproduce previous gen with this seed and palette [${paletteListRatios}].`;

  console.log(`Seed lock injected for [${options.seed}]: temperature 0, top_p 0`);


  if (options.mode === 'classic') {
    updateStatus('Generating SVG with Gemini Classic...');
    const colorPrompt = `Use this exact color palette with the specified percentages: ${options.palette
      .map(c => `${c.hex} (${c.percent}%)`)
      .join(', ')}.`;

    const classicPrompt = `
      Create a clean, simple, flat, single-layer SVG illustration with no embedded raster data.
      The SVG must be 400x300 pixels.
      The style should be ${ART_STYLES[options.style].description}. For example: "${ART_STYLES[options.style].fewShot}".
      The scene should depict: A ${NARRATIVES[options.narrative as keyof typeof NARRATIVES]} ${options.theme} scene.
      ${colorPrompt}
      Primary subject: ${options.prompt}.
      ${styleSeedString}
    `;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: classicPrompt,
        config: {
            temperature: 0,
            topP: 0,
        }
    });
    
    let svg = response.text;
    
    if (svg.startsWith('```svg')) {
        svg = svg.substring(6, svg.length - 3).trim();
    } else if (svg.startsWith('```')) {
        svg = svg.substring(3, svg.length - 3).trim();
    }
    
    return { svg, seed: options.seed };
  }

  if (options.mode === 'nano') {
    // Phase 1: Generate PNG with Gemini
    updateStatus('Phase 1/1: Generating base PNG with Gemini Nano...');
    
    // --- New Palette Injection Logic ---
    let paletteInjectionString = '';
    const totalPercent = options.palette.reduce((sum, p) => sum + p.percent, 0);

    if (totalPercent > 0) {
        const normalizedPalette = options.palette.map(p => ({
            ...p,
            percent: Math.round((p.percent / totalPercent) * 100)
        }));

        const paletteList = normalizedPalette
            .map(c => `${c.category} ${c.hex} ${c.percent}%`)
            .join(', ');
            
        paletteInjectionString = `Strictly recolor the exact composition, arrangement, and style from seed ${options.seed} using only this new palette [${paletteList}]. Make no changes to shapes, edges, or poses. Use dominant primary colors for main elements and secondary for accents. Do not introduce any other hues or colors. The final image should be vibrant and high-contrast.`;
        
    } else {
        paletteInjectionString = 'Use a vibrant, high-contrast color palette.';
    }
    
    let nanoPrompt = '';
    
    if (options.illustrationMode === 'icons') {
        const artStyle = ICON_ART_STYLES[options.style];
        if (!artStyle) throw new Error(`Invalid icon style selected: ${options.style}`);
        
        nanoPrompt = ICON_PROMPT_TEMPLATE
            .replace('[styleFewShot]', artStyle.fewShot)
            .replace('[prompt]', options.prompt)
            .replace('[iconTheme]', ICON_THEMES[options.iconTheme])
            .replace('[simplicityLevel]', options.simplicityLevel.toString())
            .replace('[colors]', paletteInjectionString);
            
        console.log('Icons mode prompt constructed.');

    } else { // 'illustrations' mode
        const narrativeText = NARRATIVES[options.narrative as keyof typeof NARRATIVES];
        const artStyle = ART_STYLES[options.style];
        let injectedSnippet = `Generate a vibrant undraw-style illustration in ${options.style} style. Style description: ${artStyle.description}. The image should depict a ${narrativeText} ${options.theme} scene. A good example of the style is "${artStyle.fewShot}".`;

        if (['sleek-3d-finance', 'playful-modular-3d', 'chromium-effect'].includes(options.style)) {
            injectedSnippet += ' The final illustration must not contain any humans or human-like figures.';
        }
        
        nanoPrompt = NANO_PROMPT_TEMPLATE
            .replace('[injected_snippet]', injectedSnippet)
            .replace('[colors]', paletteInjectionString)
            .replace('[prompt]', options.prompt);
    }
    
    console.log(`Mode: ${options.illustrationMode}`, `Style: ${options.style}`);

    const finalNanoPrompt = `${nanoPrompt}\n${styleSeedString}`;
    console.log('Full Nano Prompt:', finalNanoPrompt);
    
    const imageResponse: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: finalNanoPrompt }],
      },
      config: {
          responseModalities: [Modality.IMAGE],
          temperature: 0,
          topP: 0,
      },
    });

    let pngBase64 = '';
    const firstCandidate = imageResponse.candidates?.[0];
    if (firstCandidate?.content?.parts?.[0]?.inlineData?.data) {
        pngBase64 = firstCandidate.content.parts[0].inlineData.data;
    }

    if (!pngBase64) {
        throw new Error('Gemini did not return an image for vectorization.');
    }
    
    // Tracing is disabled globally. Always return the PNG for Nano mode.
    updateStatus('PNG generation complete.');
    return { svg: '', png: pngBase64, seed: options.seed };
  }
  
  // Should not be reached
  throw new Error('Invalid generation mode specified.');
};

// --- Main Generation Logic ---

export const generateSVGs = async (
  options: GeneratorOptions,
  updateStatus: (status: string) => void
): Promise<Asset[]> => {

  if (options.runMode === 'single') {
    const asset = await generateSingleAsset(options, updateStatus);
    return [asset];
  }

  if (options.runMode === 'batch') {
    const assets: Asset[] = [];
    const BATCH_SIZE = 4;
    for (let i = 0; i < BATCH_SIZE; i++) {
        updateStatus(`Generating asset ${i + 1} of ${BATCH_SIZE}...`);
        const batchOptions = { ...options, seed: options.seed + i };
        const asset = await generateSingleAsset(batchOptions, updateStatus);
        assets.push(asset);

        // Add a delay between calls to avoid rate limiting, but not after the last one.
        if (i < BATCH_SIZE - 1) {
            updateStatus(`Waiting 5s before next generation...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    return assets;
  }
  
  return [];
};