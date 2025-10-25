
export type GeneratorMode = 'classic' | 'nano';

export interface GeneratorOptions {
  prompt: string;
  mode: GeneratorMode;
  theme: string;
  colors: string;
  narrative: string;
  seed: number;
}

export interface Asset {
  svg: string;
  png?: string; // Base64 encoded PNG
  seed: number;
}
