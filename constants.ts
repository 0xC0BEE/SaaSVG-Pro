import { type ColorInfo } from './services/types';

export const THEMES = ['Corporate', 'Tech', 'Healthcare', 'Finance', 'Education', 'Nature'];

export const NARRATIVES = {
    'Celebrating Success': 'celebratory task complete with confetti/charts nudge',
    'Frustrated Failure': 'frustrated user with broken chain/error icon nudge',
    'Empty State': 'nudging first step with hand pointing to button',
    'System Error': 'reload nudge with glitch effect',
    'Unauthorized Access': 'locked door/home nudge',
    'Page Not Found': '404 page/home nudge',
    'Welcome Onboarding': 'onboarded user with welcome banner/metrics',
};

export const STYLES: Record<string, { description: string; prompt: string; }> = {
    'undraw': {
        description: 'minimalist "undraw" scenes with flat colors',
        prompt: 'a minimalist "undraw" illustration style with flat colors'
    },
    'flowbite': {
        description: 'clean, friendly "flowbite" UI icons for web apps',
        prompt: 'a clean, friendly "flowbite" UI icon style for web apps'
    },
    'isometric': {
        description: 'subtle 3D "isometric" perspective with low-poly angled views, inspired by formfrom.design',
        prompt: 'an isometric formfrom.design illustration style. For example: an isometric office scene with charts and graphs on a desk, viewed from an angled perspective, with clean lines and pastel colors.'
    },
    'humans': {
        description: 'human-centered "humans" style with diverse figures in casual poses',
        prompt: 'a human-centered "humans" illustration style with diverse figures in casual poses'
    },
    'finance': {
        description: 'finance-oriented scenes with charts, wallets, and growth symbols',
        prompt: 'a finance-oriented illustration style with charts, wallets, and growth symbols'
    },
};

export const NANO_PROMPT_TEMPLATE = `
Generate a high-contrast, minimalist PNG illustration with bold outlines, flat color fills, and sharp, clean edges, ideal for vector tracing.
The illustration should be [style].
The scene should depict: A [narrative] [theme] scene.
[colors]
Primary subject: [prompt].
`;

export const DEFAULT_PALETTE: ColorInfo[] = [
    { id: 1, hex: '#30B9B8', cmyk: '75,0,29,0', category: 'primary', percent: 25 },
    { id: 2, hex: '#F67B3F', cmyk: '0,51,75,0', category: 'primary', percent: 20 },
    { id: 3, hex: '#D8DAFC', cmyk: '15,13,0,0', category: 'secondary', percent: 15 },
    { id: 4, hex: '#C57E67', cmyk: '0,36,47,23', category: 'secondary', percent: 15 },
    { id: 5, hex: '#B5E2CC', cmyk: '20,0,10,11', category: 'secondary', percent: 15 },
    { id: 6, hex: '#FFEEF0', cmyk: '0,7,6,0', category: 'secondary', percent: 10 },
];
