// Sanity API Configuration
const SANITY_PROJECT_ID = 'ka04oafk';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = '2023-05-03'; // Use current date when you first configured it

// Construct the base URL for the Sanity API
const SANITY_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;

/**
 * Fetch data from Sanity using a GROQ query.
 * Throws on network/HTTP failure so callers can tell "failed" apart from "empty".
 * @param {string} query - The GROQ query to execute.
 * @param {Object} [params] - GROQ parameters, e.g. { id } for `$id` in the query.
 * @returns {Promise<any>} - The queried data.
 */
async function fetchSanity(query, params = {}) {
    let url = `${SANITY_URL}?query=${encodeURIComponent(query)}`;
    Object.keys(params).forEach(name => {
        url += `&${encodeURIComponent('$' + name)}=${encodeURIComponent(JSON.stringify(params[name]))}`;
    });

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Sanity fetch failed: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    return json.result;
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

// ---------------------------------------------------------------
// News helpers shared by news.js, home-news.js and article.js
// ---------------------------------------------------------------

/** field_<lang>, falling back to English, then any language that has it. */
function localizedField(doc, fieldName, lang) {
    return doc[`${fieldName}_${lang}`] || doc[`${fieldName}_en`] || doc[`${fieldName}_mn`] || doc[`${fieldName}_ja`] || '';
}

/** Long-form date in the page language; '' when the article has no date. */
function formatNewsDate(dateStr, lang) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const locale = lang === 'mn' ? 'mn-MN' : lang === 'ja' ? 'ja-JP' : 'en-US';
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Plain-text excerpt of the first paragraph, cut at maxChars characters. */
function newsExcerpt(blocks, maxChars) {
    if (!Array.isArray(blocks)) return '';
    const first = blocks.find(b => b.style === 'normal' || !b.style);
    if (!first || !first.children) return '';
    const chars = Array.from(first.children.map(c => c.text).join(' ')); // code points, so CJK/emoji never split
    return chars.length > maxChars ? chars.slice(0, maxChars).join('') + '…' : chars.join('');
}

// Sanity ids end up in hrefs — only allow plain id characters
function safeDocId(id) {
    return /^[A-Za-z0-9._-]+$/.test(String(id)) ? String(id) : '';
}

// Export functions to window so the page scripts can use them
window.SanityAPI = {
    fetch: fetchSanity,
    urlFor: urlForSanityImage,
    blocksToHTML: sanityBlocksToHTML,
    escapeHTML: escapeHTML,
    localizedField: localizedField,
    formatNewsDate: formatNewsDate,
    newsExcerpt: newsExcerpt,
    safeDocId: safeDocId
};
