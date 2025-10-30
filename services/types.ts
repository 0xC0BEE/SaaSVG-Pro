export interface ColorInfo {
  id: number;
  hex: string;
  cmyk: string;
  category: 'primary' | 'secondary';
  percent: number;
}

export type GeneratorMode = 'classic' | 'nano';
export type IllustrationMode = 'illustrations' | 'icons';
export type RunMode = 'single' | 'batch';

// FIX: Export ApiChoice type to resolve import error.
export type ApiChoice = 'vectorizer' | 'recraft';

export interface GeneratorOptions {
  prompt: string;
  mode: GeneratorMode;
  illustrationMode: IllustrationMode;
  runMode: RunMode;
  theme: string;
  iconTheme: string;
  narrative: string;
  style: string;
  seed: number;
  palette: ColorInfo[];
  simplicityLevel: number;
  temperature: number;
}

export interface Asset {
  svg: string;
  png?: string;
  seed: number;
}