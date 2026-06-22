// Sanity API Configuration
const SANITY_PROJECT_ID = 'ka04oafk';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = '2023-05-03'; // Use current date when you first configured it

// Construct the base URL for the Sanity API
const SANITY_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;

/**
 * Fetch data from Sanity using a GROQ query.
 * @param {string} query - The GROQ query to execute.
 * @returns {Promise<any>} - The queried data.
 */
async function fetchSanity(query) {
    const encodedQuery = encodeURIComponent(query);
    const url = `${SANITY_URL}?query=${encodedQuery}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Sanity fetch failed: ${response.statusText}`);
        }
        const json = await response.json();
        return json.result;
    } catch (error) {
        return null;
    }
}

/**
 * Helper to get the correct Image URL from a Sanity Image object
 */
function urlForSanityImage(source) {
    if (!source || !source.asset || !source.asset._ref) return '';

    // Break down the ref: "image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg"
    // Strict validation: the parts are interpolated into URLs/inline styles,
    // so reject anything that isn't plain alphanumeric ref syntax.
    const m = /^image-([A-Za-z0-9]+)-(\d+x\d+)-([a-z0-9]+)$/.exec(String(source.asset._ref));
    if (!m) return '';

    return `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${m[1]}-${m[2]}.${m[3]}`;
}

/**
 * Helper to convert Sanity Portable Text to HTML (Very basic version)
 */
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sanityBlocksToHTML(blocks, lang) {
    if (!blocks || !Array.isArray(blocks)) return "";

    return blocks.map(block => {
        if (block._type !== 'block' || !block.children) return '';
        const text = block.children.map(child => escapeHTML(child.text)).join('');

        switch (block.style) {
            case 'h1': return `<h1>${text}</h1>`;
            case 'h2': return `<h2>${text}</h2>`;
            case 'h3': return `<h3>${text}</h3>`;
            case 'blockquote': return `<blockquote>${text}</blockquote>`;
            case 'normal':
            default:
                return `<p>${text}</p>`;
        }
    }).join("");
}

// Export functions to window so main.js/news.js can use them
window.SanityAPI = {
    fetch: fetchSanity,
    urlFor: urlForSanityImage,
    blocksToHTML: sanityBlocksToHTML,
    escapeHTML: escapeHTML
};
