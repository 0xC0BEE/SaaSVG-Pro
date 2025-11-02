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

export const ICON_THEMES: Record<string, { description: string; keywords: string; negatives: string; }> = {
    'Finance': {
        description: 'finance theme with charts, wallets, and currency symbols',
        keywords: 'charts, wallets, currency symbols, coins, growth arrows, credit cards',
        negatives: 'no tech devices like laptops or servers, no vehicles, no medical symbols',
    },
    'Tech': {
        description: 'tech theme with devices, code symbols, and network icons',
        keywords: 'laptop, code symbols, UI elements, circuits, app icons, servers, cloud',
        negatives: 'no credit cards, wallets, coins, or financial charts',
    },
    'Logistics': {
        description: 'logistics theme with trucks, maps, and packages',
        keywords: 'trucks, maps, packages, delivery drone, barcode, container ship',
        negatives: 'no financial symbols, no medical items, no people',
    },
    'Health': {
        description: 'health theme with medical symbols, hearts, and first-aid kits',
        keywords: 'medical cross, hearts, first-aid kits, stethoscope, DNA strand, pill',
        negatives: 'no money, no computers unless screen shows health data, no weapons',
    },
    'Education': {
        description: 'education theme with books, graduation caps, and pencils',
        keywords: 'books, graduation caps, pencils, blackboard, microscope, apple',
        negatives: 'no currency, no sports equipment, no office cubicles',
    },
    'Sports': {
        description: 'sports theme with balls, trophies, and athletic equipment',
        keywords: 'basketball, football, trophies, athletic equipment, whistle, stopwatch, medal',
        negatives: 'no academic items like books, no business charts, no computers',
    },
    'Video Games': {
        description: 'video games theme with controllers, joysticks, and consoles',
        keywords: 'game controllers, joysticks, consoles, headset, pixel art heart, keyboard',
        negatives: 'no real-world weapons, no office equipment, no financial items',
    },
    'Supply Chain': {
        description: 'supply chain theme with logistics icons like trucks, boxes, chains, and delivery vehicles, modular and without humans',
        keywords: 'trucks, boxes, chains, delivery vehicles, container ship, factory, barcode',
        negatives: 'no financial charts, no retail shopping carts, no people',
    },
};


export const NANO_PROMPT_TEMPLATE = `
Generate a minimalist PNG illustration with bold outlines, flat color fills, and sharp, clean edges, ideal for vector tracing.
CRITICAL REQUIREMENT: The background MUST be a pure solid green color (#00FF00). It must be perfectly uniform. NO textures, NO patterns, NO gradients, NO shadows. This is for automated background removal and is non-negotiable.
[injected_snippet]
[colors]
Primary subject: [prompt].
The illustration must be 400x300 pixels.
`;

export const ICON_PROMPT_TEMPLATE = `
Generate a [style] [theme] icon: [prompt].
Theme context: [description]. Include theme elements like: [keywords].
The icon must be a simple, modular, 3D isometric icon with no humans.
Negative prompt: [negatives], no busy extra elements.

Technical requirements:
- CRITICAL REQUIREMENT: The background MUST be a pure solid green color (#00FF00). It must be perfectly uniform. NO textures, NO patterns, NO gradients, NO shadows. This is for automated background removal and is non-negotiable.
- Maximum of [simplicityLevel] distinct visual elements.
- No text or visual clutter.
- Focus on the core object with clean lines, optimized for Figma editing.
- Use this exact color palette and ratios: [colors].
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