// FIX: Implement the full geminiService to provide SVG generation functionality and resolve module errors.
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { NANO_PROMPT_TEMPLATE } from "../constants";
import { type GeneratorOptions, type Asset } from "./types";

// NOTE: Potrace is assumed to be installed and browser-compatible.
import { trace } from 'potrace';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Converts a raster image (PNG) to a vector image (SVG) using a browser-native canvas-based approach.
 * This is the most reliable method, as it avoids Node.js-specific dependencies like `Buffer`.
 * @param pngBase64 The base64-encoded PNG string.
 * @returns A promise that resolves to an SVG string.
 */
const rasterToSVG = (pngBase64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error("Could not create canvas context for tracing."));
                }
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, img.width, img.height);

                const traceParams = {
                    turdSize: 1,
                    optCurve: true,
                    color: 'white', // Ensure the output SVG is visible on a dark background.
                };

                // The potrace library can directly handle ImageData objects from a canvas,
                // which is the standard browser-native way to get raw pixel data.
                // This avoids all Node.js-specific Buffer dependencies and related errors.
                trace(imageData, traceParams, (err: Error | null, svg: string) => {
                    if (err) {
                        console.error("Potrace tracing error:", err);
                        return reject(err);
                    }
                    resolve(svg);
                });
            } catch (error) {
                console.error("Error during canvas tracing:", error);
                reject(error);
            }
        };
        img.onerror = () => {
            reject(new Error("Failed to load the generated PNG image for tracing. It might be corrupted."));
        };
        // Use a data URI to load the base64 image into the Image object.
        img.src = `data:image/png;base64,${pngBase64}`;
    });
};


const CLASSIC_PROMPT_TEMPLATE = `
You are an expert SVG designer. Generate one self-contained, production-ready SVG icon based on the following criteria.
The SVG must not contain any external links, scripts, or raster images. All styles must be inline.
The design should be clean, modern, and suitable for a SaaS product.

Criteria:
- Prompt: [prompt]
- Theme: [theme]
- Color Palette: [colors]
- Narrative: [narrative]

Return your response as a single JSON object with one key: "svg", which contains the full SVG code as a string. Do not include any markdown formatting like \`\`\`json.
`;


export const generateSVGs = async (
    options: GeneratorOptions,
    statusCallback: (status: string) => void
): Promise<Asset[]> => {

    try {
        if (options.mode === 'nano') {
            statusCallback('Generating high-contrast PNG...');

            const prompt = NANO_PROMPT_TEMPLATE
                .replace('[prompt]', options.prompt)
                .replace('[theme]', options.theme)
                .replace('[colors]', options.colors)
                .replace('[narrative]', options.narrative);

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }] },
                config: {
                    responseModalities: [Modality.IMAGE],
                    seed: options.seed,
                },
            });

            const firstPart = response.candidates?.[0]?.content?.parts?.[0];
            if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
                const pngBase64 = firstPart.inlineData.data;
                
                statusCallback('Tracing PNG to SVG...');
                const svg = await rasterToSVG(pngBase64);

                return [{
                    svg,
                    png: pngBase64,
                    seed: options.seed,
                }];
            } else {
                throw new Error("Nano mode failed: No image data received from API.");
            }
        } else { // classic mode
            statusCallback('Generating SVG directly...');

            const prompt = CLASSIC_PROMPT_TEMPLATE
                .replace('[prompt]', options.prompt)
                .replace('[theme]', options.theme)
                .replace('[colors]', options.colors)
                .replace('[narrative]', options.narrative);
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro', // Better for code/structured data generation
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            svg: {
                                type: Type.STRING,
                                description: 'The full SVG code as a string.',
                            },
                        },
                        required: ['svg'],
                    },
                    seed: options.seed,
                }
            });
            
            const text = response.text.trim();
            // The API can sometimes wrap the JSON in markdown, so we strip it.
            const cleanedText = text.replace(/^```json\s*|```$/g, '').trim();
            const result = JSON.parse(cleanedText);

            if (result.svg && typeof result.svg === 'string') {
                return [{
                    svg: result.svg,
                    seed: options.seed
                }];
            } else {
                throw new Error("Classic mode failed: Invalid JSON structure in response.");
            }
        }
    } catch(error) {
        console.error("Error in generateSVGs:", error);
        if (error instanceof Error) {
            throw new Error(`Generation failed: ${error.message}`);
        }
        throw new Error("An unknown generation error occurred.");
    }
};