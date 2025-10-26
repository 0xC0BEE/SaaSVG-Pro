export type GeneratorMode = 'classic' | 'nano';
export type ApiChoice = 'vectorizer' | 'recraft';

export interface ColorInfo {
  id: number;
  hex: string;
  cmyk: string;
  category: 'primary' | 'secondary';
  percent: number;
}

export interface GeneratorOptions {
  prompt: string;
  mode: GeneratorMode;
  theme: string;
  narrative: string;
  style: string;
  seed: number;
  palette: ColorInfo[];
  
  // API Credentials
  apiChoice: ApiChoice;
  vectorizerID?: string;
  vectorizerSecret?: string;
  recraftToken?: string;
}

export interface Asset {
  svg: string;
  png?: string; // Base64 encoded PNG
  seed: number;
}