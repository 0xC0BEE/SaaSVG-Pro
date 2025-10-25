/**
 * Processes a raw SVG string from imagetracerjs to make it suitable for a professional application.
 * - Combines paths of the same color into a single compound path.
 * - Applies fill-rule="evenodd" to correctly render shapes with "holes".
 * - Ensures a standard viewBox.
 * - This DOM-based approach is more robust than regex.
 * @param {string} rawSvgString The raw SVG string from imagetracerjs.
 * @returns {string} A cleaned, production-ready SVG string.
 */
export function processSVG(rawSvgString) {
  // Guard against non-browser environments where DOMParser might not be available.
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    console.warn('DOM APIs not available. Returning raw SVG.');
    return rawSvgString;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawSvgString, 'image/svg+xml');
    const svg = doc.documentElement;
    
    // Check for parsing errors
    if (svg.querySelector('parsererror')) {
      console.error('Failed to parse SVG string:', rawSvgString);
      // Return a fallback or the original string
      return rawSvgString;
    }

    // Standardize attributes
    const originalWidth = svg.getAttribute('width');
    const originalHeight = svg.getAttribute('height');
    svg.setAttribute('viewBox', `0 0 ${originalWidth || 400} ${originalHeight || 300}`);
    svg.removeAttribute('width');
    svg.removeAttribute('height');

    const paths = Array.from(doc.querySelectorAll('path'));
    const groupedByColor = paths.reduce((acc, path) => {
      const fill = path.getAttribute('fill') || '#000000';
      if (!acc[fill]) {
        acc[fill] = [];
      }
      acc[fill].push(path.getAttribute('d'));
      // Remove the old path from its parent
      path.parentNode?.removeChild(path);
      return acc;
    }, {});

    // Ensure all original child nodes (like <g>) are cleared if they become empty
    Array.from(svg.children).forEach(child => {
        if(child.tagName.toLowerCase() === 'g' && child.children.length === 0) {
            svg.removeChild(child);
        }
    });
    
    // Create new compound paths for each color
    for (const color in groupedByColor) {
      const newPath = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      newPath.setAttribute('d', groupedByColor[color].join(' '));
      newPath.setAttribute('fill', color);
      // fill-rule is crucial for rendering shapes with holes correctly
      newPath.setAttribute('fill-rule', 'evenodd');
      svg.appendChild(newPath);
    }

    return new XMLSerializer().serializeToString(svg);
  } catch(e) {
    console.error("Error processing SVG:", e);
    return rawSvgString; // Return original string on error
  }
}
