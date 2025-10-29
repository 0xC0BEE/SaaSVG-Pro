import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
// FIX: `VectorizerOptions` is a type and should be imported with `type`.
import { type GeneratorOptions, type Asset, type VectorizerOptions } from './types';
import { NANO_PROMPT_TEMPLATE, ART_STYLES, NARRATIVES, ICON_ART_STYLES, ICON_THEMES, ICON_PROMPT_TEMPLATE } from '../constants';

// --- Start of External API Implementations ---

/**
 * Calls the Vectorizer.ai API to convert a PNG to an SVG.
 */
const vectorizeWithVectorizerAI = async (
  pngBase64: string,
  options: GeneratorOptions,
  updateStatus: (status: string) => void
): Promise<string> => {
  updateStatus('Phase 2/3: Vectorizing with Vectorizer.ai...');
  const { vectorizerID, vectorizerSecret } = options;
  if (!vectorizerID || !vectorizerSecret) throw new Error('Vectorizer.ai credentials are not set.');

  const byteString = atob(pngBase64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: 'image/png' });

  const formData = new FormData();
  formData.append('image', blob);
  // NOTE: Vectorizer.ai API options are limited. We are not passing vectorizerOptions for now.

  const response = await fetch('https://vectorizer.ai/api/v1/vectorize', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${vectorizerID}:${vectorizerSecret}`),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Vectorizer.ai API Error:', errorBody);
    throw new Error(`Vectorizer.ai failed: ${response.statusText}`);
  }

  return response.text();
};


/**
 * Calls the Replicate API to use the Recraft model for vectorization.
 * This is a two-step process: start the job, then poll for the result.
 */
const vectorizeWithRecraft = async (
  pngBase64: string,
  options: GeneratorOptions,
  updateStatus: (status: string) => void
): Promise<string> => {
  updateStatus('Phase 2/3: Vectorizing with Recraft.ai...');
  const { recraftToken } = options;
  if (!recraftToken) throw new Error('Recraft.ai (Replicate) token is not set.');

  const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
  const REPLICATE_MODEL_VERSION = '248d564195195b0c0316d3f20f0442eaaa4f5148a1b5be7f61b0c07d389a1c1d';

  // Step 1: Start the prediction
  const startResponse = await fetch(REPLICATE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${recraftToken}`,
    },
    body: JSON.stringify({
      version: REPLICATE_MODEL_VERSION,
      input: {
        image: `data:image/png;base64,${pngBase64}`,
        mode: 'vector_illustration', // Recraft-specific option
      },
    }),
  });

  if (!startResponse.ok) {
    const errorBody = await startResponse.json();
    console.error('Replicate API Error (start):', errorBody);
    throw new Error(`Replicate failed to start: ${startResponse.statusText}`);
  }

  const prediction = await startResponse.json();
  const predictionId = prediction.id;
  
  // Step 2: Poll for the result with timeout
  let finalResult = null;
  const startTime = Date.now();
  const timeout = 180000; // 3 minutes timeout

  while (!finalResult) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Recraft.ai vectorization timed out after 3 minutes.');
    }

    updateStatus('Phase 2/3: Polling Recraft.ai for result...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2s between polls
    
    const pollResponse = await fetch(`${REPLICATE_API_URL}/${predictionId}`, {
      headers: { Authorization: `Token ${recraftToken}` }
    });
    
    if (!pollResponse.ok) {
      const errorText = await pollResponse.text();
      console.error('Replicate API Error (poll):', errorText);
      throw new Error(`Replicate polling failed with status: ${pollResponse.statusText}`);
    }
    
    const pollResult = await pollResponse.json();

    if (pollResult.status === 'succeeded') {
      finalResult = pollResult.output;
      break;
    } else if (pollResult.status === 'failed' || pollResult.status === 'canceled') {
      console.error('Replicate API Error (poll):', pollResult.error);
      throw new Error(`Replicate job failed: ${pollResult.error}`);
    }
    // If status is 'starting' or 'processing', the loop continues, which is correct.
  }

  // Step 3: Fetch the SVG from the result URL
  if (!finalResult || !Array.isArray(finalResult) || finalResult.length === 0) {
    throw new Error('Recraft.ai returned an empty or invalid result.');
  }

  const svgUrl = finalResult[0];
  const svgResponse = await fetch(svgUrl);
  if (!svgResponse.ok) throw new Error('Failed to download final SVG from Recraft.ai URL.');

  return svgResponse.text();
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
  const styleSeedString = `Fixed style guide: Reproduce the exact composition, arrangement, shapes, edges, poses, and style from seed ${seedHash}. There must be no variations or changes. The output must be identical to a previous generation that used this exact seed and palette: [${paletteListRatios}].`;

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
    updateStatus('Phase 1/3: Generating base PNG with Gemini Nano...');
    
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
    
    // If SVG generation is not requested, return only the PNG.
    if (!options.generateSvg) {
        updateStatus('PNG generation complete.');
        return { svg: '', png: pngBase64, seed: options.seed };
    }

    // Phase 2: Vectorize PNG using the selected external API
    let svg = '';
    try {
        if (options.apiChoice === 'vectorizer') {
            svg = await vectorizeWithVectorizerAI(pngBase64, options, updateStatus);
        } else if (options.apiChoice === 'recraft') {
            svg = await vectorizeWithRecraft(pngBase64, options, updateStatus);
        } else {
            throw new Error('No valid API provider chosen for Nano mode.');
        }
    } catch(error) {
        console.error('Primary vectorization API failed. Fallback to PNG only.', error);
        console.log('Fallback triggered');
        // On failure, return the asset with only the PNG. The UI will handle the toast.
        return { svg: '', png: pngBase64, seed: options.seed };
    }

    updateStatus('Phase 3/3: Finalizing asset...');
    return { svg, png: pngBase64, seed: options.seed };
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