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

export const ART_STYLES: Record<string, { description: string; fewShot: string; }> = {
    'humans': {
        description: 'modular mix-and-match vector humans, with flat minimal styling and pastel/neutral colors',
        fewShot: 'a mix-and-match diverse figure in casual attire holding a tablet',
    },
    'undraw': {
        description: 'flat vector graphics with clean lines, minimal shading, and bright solid colors',
        fewShot: 'a simple vector graphic with bold outlines',
    },
    'simply-data': {
        description: 'isometric vector data visualizations with a minimal light/dark 2-color palette',
        fewShot: 'isometric charts on a desk from an angled view',
    },
    'financial-delight': {
        description: 'cartoony vector finance themes with a vibrant and playful aesthetic',
        fewShot: 'a cartoony hand holding coins with a growth arrow',
    },
    'illlustrations': {
        description: 'flat vector icons using simple shapes and a bright solid/pastel color palette',
        fewShot: 'a minimalist icon of a piggy bank with dollar signs',
    },
    'sleek-3d-finance': {
        description: 'modern 3D extruded icons with depth/shadows, neutral blues/greens, finance like charts/wallets',
        fewShot: 'sleek isometric credit card with NFC/button rounded shadows',
    },
    'playful-modular-3d': {
        description: 'low-poly playful bounce, vibrant gradients, modular objects like floating charts',
        fewShot: 'playful 3D bar chart with coins angled no humans',
    },
    'chromium-effect': {
        description: 'shiny metallic 3D isometric icons with chrome-like reflections and gradients on the edges, presented in a playful, vibrant metallic style without humans',
        fewShot: '3D isometric laptop with a chrome shine, reflective gradients on the screen, low-poly and rounded',
    }
};

export const ICON_ART_STYLES: Record<string, { description: string; fewShot: string; }> = {
    'icons8-3d': {
        description: 'simple editable 3D isometric icon in Icons8 style, with extruded shapes, soft shadows, vibrant pastels, few bezier curves, and modular layers. No humans.',
        fewShot: 'a 3D isometric chart with rounded edges and minimal shadows, in pastel blue',
    },
    '3d-playful': {
        description: '3D playful isometric vector icon without humans, featuring modular low-poly rounded objects with soft shadows and vibrant pastels.',
        fewShot: 'A 3D isometric credit card with an NFC chip, a purple X button, and green arrows/buttons, viewed from an angled perspective with rounded edges.',
    },
    'sleek-3d': {
        description: 'sleek 3D isometric icon without humans, with extruded depth, soft shadows, and neutral blue/green colors, suitable for finance themes.',
        fewShot: 'a sleek 3D isometric wallet icon with rounded highlights and soft shadows',
    },
    'Semi Realistic Metallic': {
        description: 'semi-realistic 3D icons with subtle shiny metallic effects on edges, vibrant accents',
        fewShot: 'semi-realistic 3D credit card icon with chrome reflections on NFC, angled view, no humans'
    }
};

export const ICON_THEMES: Record<string, string> = {
    'Finance': 'finance theme with charts, wallets, and currency symbols',
    'Tech': 'tech theme with devices, code symbols, and network icons',
    'Logistics': 'logistics theme with trucks, maps, and packages',
    'Health': 'health theme with medical symbols, hearts, and first-aid kits',
    'Education': 'education theme with books, graduation caps, and pencils',
    'Sports': 'sports theme with balls, trophies, and athletic equipment',
    'Video Games': 'video games theme with controllers, joysticks, and consoles',
    'Supply Chain': 'supply chain theme with logistics icons like trucks, boxes, chains, and delivery vehicles, modular and without humans',
};


export const NANO_PROMPT_TEMPLATE = `
Generate a high-contrast, minimalist PNG illustration with bold outlines, flat color fills, and sharp, clean edges, ideal for vector tracing.
CRITICAL: The object must be placed on a solid, uniform, single-color green (#00FF00) background. There must be no shadows, gradients, or other elements in the background.
[injected_snippet]
[colors]
Primary subject: [prompt].
The illustration must be 400x300 pixels.
`;

export const ICON_PROMPT_TEMPLATE = `
Generate a 3D isometric icon in the style of an image described as "[styleFewShot]".
The icon must be a simple, minimal representation of a '[prompt]' for the '[iconTheme]' industry.
Technical requirements:
- CRITICAL: Place the icon on a solid, uniform, single-color green (#00FF00) background. There must be no shadows, gradients, or other elements in the background. This is for automated background removal.
- Maximum of [simplicityLevel] distinct visual elements.
- No humans, text, or visual clutter (e.g., extra props like coins or steam).
- Focus on the core object.
- Clean lines with few paths, optimized for Figma editing.
- Use this exact color palette: [colors].
- The final image must be a 400x300 PNG.
`;


export const DEFAULT_PALETTE: ColorInfo[] = [
    { id: 1, hex: '#30B9B8', cmyk: '75,0,29,0', category: 'primary', percent: 25 },
    { id: 2, hex: '#F67B3F', cmyk: '0,51,75,0', category: 'primary', percent: 20 },
    { id: 3, hex: '#D8DAFC', cmyk: '15,13,0,0', category: 'secondary', percent: 15 },
    { id: 4, hex: '#C57E67', cmyk: '0,36,47,23', category: 'secondary', percent: 15 },
    { id: 5, hex: '#B5E2CC', cmyk: '20,0,10,11', category: 'secondary', percent: 15 },
    { id: 6, hex: '#FFEEF0', cmyk: '0,7,6,0', category: 'secondary', percent: 10 },
];