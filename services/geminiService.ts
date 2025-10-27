import { GoogleGenAI, Modality } from '@google/genai';
import { type GeneratorOptions, type Asset } from './types';
import { NANO_PROMPT_TEMPLATE, STYLES, NARRATIVES } from '../constants';

// Helper to poll Replicate API
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to convert base64 to Blob for multipart form data
const b64toBlob = (b64Data: string, contentType = '', sliceSize = 512) => {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
};

// Fallback function using Gemini multimodal to trace a PNG
const fallbackToGemini = async (
    pngBase64: string, 
    updateStatus: (status: string) => void
): Promise<string> => {
    updateStatus('API provider failed. Falling back to Gemini for vectorization...');
    // FIX: Per guidelines, initialize the client right before use.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const imagePart = {
        inlineData: {
            mimeType: 'image/png',
            data: pngBase64,
        },
    };
    const textPart = {
        text: 'Trace this PNG image into a clean, simple, flat, single-layer SVG with no embedded raster data. The SVG should be scalable and editable. The output should be only the raw SVG code, with no other text, explanation, or markdown code fences.'
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, textPart] },
    });

    let svg = response.text;

    // Clean up potential markdown code fences, although the prompt asks not to include them.
    if (svg.startsWith('```svg')) {
        svg = svg.substring(6, svg.length - 3).trim();
    } else if (svg.startsWith('```')) {
        svg = svg.substring(3, svg.length - 3).trim();
    }

    return svg;
}


export const generateSVGs = async (
  options: GeneratorOptions,
  updateStatus: (status: string) => void
): Promise<Asset[]> => {

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  
  if (options.mode === 'classic') {
    updateStatus('Generating SVG with Gemini Classic...');
    const colorPrompt = `Use this exact color palette with the specified percentages: ${options.palette
      .map(c => `${c.hex} (${c.percent}%)`)
      .join(', ')}.`;

    const classicPrompt = `
      Create a clean, simple, flat, single-layer SVG illustration with no embedded raster data.
      The SVG must be 400x300 pixels.
      The style should be ${STYLES[options.style].prompt}.
      The scene should depict: A ${NARRATIVES[options.narrative as keyof typeof NARRATIVES]} ${options.theme} scene.
      ${colorPrompt}
      Primary subject: ${options.prompt}.
      The output should be only the raw SVG code, with no other text, explanation, or markdown formatting.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: classicPrompt,
    });
    
    let svg = response.text;
    
    if (svg.startsWith('```svg')) {
        svg = svg.substring(6, svg.length - 3).trim();
    } else if (svg.startsWith('```')) {
        svg = svg.substring(3, svg.length - 3).trim();
    }

    console.log(`API choice: Gemini (classic)`);
    console.log(`SVG length: ${svg.length}`);
    
    return [{ svg, seed: options.seed }];
  }

  if (options.mode === 'nano') {
    if (!options.apiChoice || (options.apiChoice === 'vectorizer' && (!options.vectorizerID || !options.vectorizerSecret)) || (options.apiChoice === 'recraft' && !options.recraftToken)) {
        throw new Error('API credentials for Nano mode are not configured.');
    }

    // Phase 1: Generate PNG with Gemini
    updateStatus('Phase 1/3: Generating base PNG with Gemini Nano...');
    const colorPrompt = `Use this exact color palette with the specified percentages: ${options.palette
        .map(c => `${c.hex} (${c.percent}%)`)
        .join(', ')}.`;
    const nanoPrompt = NANO_PROMPT_TEMPLATE
        .replace('[style]', STYLES[options.style].prompt)
        .replace('[narrative]', NARRATIVES[options.narrative as keyof typeof NARRATIVES])
        .replace('[theme]', options.theme)
        .replace('[colors]', colorPrompt)
        .replace('[prompt]', options.prompt)
        + '\nThe illustration must be 400x300 pixels.';

    const imageResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: nanoPrompt }],
      },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    let pngBase64 = '';
    // FIX: Properly access the generated image data from the response.
    const firstCandidate = imageResponse.candidates?.[0];
    if (firstCandidate?.content?.parts?.[0]?.inlineData?.data) {
        pngBase64 = firstCandidate.content.parts[0].inlineData.data;
    }

    if (!pngBase64) {
        throw new Error('Gemini did not return an image for vectorization.');
    }
    
    // Phase 2: Vectorize PNG
    updateStatus(`Phase 2/3: Vectorizing PNG with ${options.apiChoice}...`);
    let svg = '';

    try {
        if (options.apiChoice === 'vectorizer') {
            const imageBlob = b64toBlob(pngBase64, 'image/png');
            const formData = new FormData();
            formData.append('image', imageBlob, 'image.png');
            // FIX: Correctly set the output format parameter according to Vectorizer.ai documentation.
            formData.append('output.file_format', 'svg');

            const auth = btoa(`${options.vectorizerID}:${options.vectorizerSecret}`);
            const vectorizerResponse = await fetch('https://api.vectorizer.ai/api/v1/vectorize', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                },
                body: formData,
            });

            if (!vectorizerResponse.ok) {
                const errorText = await vectorizerResponse.text();
                throw new Error(`Vectorizer.ai API Error: ${vectorizerResponse.status} ${errorText}`);
            }
            svg = await vectorizerResponse.text();
        } else { // 'recraft'
            const replicateStartResponse = await fetch('https://api.replicate.com/v1/predictions', {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${options.recraftToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    // UPDATE: Use the latest version of the Recraft vectorizer model on Replicate.
                    version: "5952a255de31454591a56111f44f6f87425f18751512140409a8a7298642a84d",
                    input: {
                        image: `data:image/png;base64,${pngBase64}`,
                    },
                }),
            });

            if (!replicateStartResponse.ok) {
                const errorJson = await replicateStartResponse.json();
                throw new Error(`Replicate API Error: ${errorJson.detail}`);
            }
            let prediction = await replicateStartResponse.json();

            updateStatus(`Phase 2/3: Polling Replicate for result...`);
            while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
                await sleep(2000); // Polling interval
                const pollResponse = await fetch(prediction.urls.get, {
                    headers: {
                        'Authorization': `Token ${options.recraftToken}`,
                    },
                });
                prediction = await pollResponse.json();
            }

            if (prediction.status === 'failed') {
                throw new Error(`Replicate prediction failed: ${prediction.error}`);
            }
            
            const svgUrl = prediction.output;
            const svgResponse = await fetch(svgUrl);
            svg = await svgResponse.text();
        }
    } catch(error) {
        console.error('Vectorization API failed, attempting fallback.', error);
        svg = await fallbackToGemini(pngBase64, updateStatus);
    }

    updateStatus('Phase 3/3: Finalizing asset...');
    console.log(`API choice: ${options.apiChoice}`);
    console.log(`SVG length: ${svg.length}`);

    return [{ svg, png: pngBase64, seed: options.seed }];
  }
  
  return [];
};