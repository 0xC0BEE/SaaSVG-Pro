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
export type ApiChoice = 'vectorizer' | 'recraft';

export interface VectorizerOptions {
  svgVersion: '1.1 (Default)' | 'Tiny 1.2';
  stacking: 'cut-outs' | 'stack on top';
  curveTypes: string[];
  gapFiller: boolean;
  tolerance: number;
}

export interface GeneratorOptions {
  prompt: string;
  mode: GeneratorMode;
  illustrationMode: IllustrationMode;
  runMode: RunMode;
  generateSvg: boolean;
  theme: string;
  iconTheme: string;
  narrative: string;
  style: string;
  seed: number;
  palette: ColorInfo[];
  vectorizerOptions: VectorizerOptions;
  simplicityLevel: number;

  // API related
  apiChoice: ApiChoice;
  vectorizerID?: string;
  vectorizerSecret?: string;
  recraftToken?: string;
}

export interface Asset {
  svg: string;
  png?: string;
  seed: number;
}