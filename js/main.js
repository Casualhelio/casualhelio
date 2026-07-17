// Navbar scroll effect
const navbar = document.querySelector('.navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 40);
    });
}

// Hamburger menu
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });
}

// Highlight the nav link for the current page
function initActiveNavLink() {
    const links = document.querySelectorAll('.nav-links a:not(.nav-cta)');
    if (!links.length) return;
    const currentPage = location.pathname.split('/').pop() || 'index.html';
    // Article detail pages (article.html) live under News in the IA, so highlight News for them.
    const matchPage = currentPage === 'article.html' ? 'news.html' : currentPage;
    links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === matchPage));
}

initActiveNavLink();

// Reveal on scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// =============================================
// I18N ENGINE
// =============================================
function applyTranslations(lang) {
    if (!window.translations || !window.translations[lang]) return;
    const t = window.translations[lang];

    // Apply to data-i18n (text content)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key] !== undefined) el.textContent = t[key];
    });

    // Apply to data-i18n-html (innerHTML â€” for bold/italic/br)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.dataset.i18nHtml;
        if (t[key] !== undefined) {
            el.innerHTML = t[key];
        }
    });

    // Apply to data-i18n-placeholder (form placeholders)
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.dataset.i18nPh;
        if (t[key] !== undefined) el.placeholder = t[key];
    });

    // Update html lang attribute
    document.documentElement.lang = lang === 'mn' ? 'mn' : lang === 'ja' ? 'ja' : 'en';

    // Update switcher buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Save preference
    localStorage.setItem('nest-lang', lang);

    document.body.classList.toggle('lang-mn', lang === 'mn');
    document.body.classList.toggle('lang-ja', lang === 'ja');
}

window.applyTranslations = applyTranslations;

window.applyTranslationsAndTwemoji = function (lang) {
    if (!lang) return;
    applyTranslations(lang);
    if (window.twemoji) setTimeout(() => twemoji.parse(document.body, { folder: 'svg', ext: '.svg' }), 50);
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: lang } }));
};

function initLang() {
    const saved = localStorage.getItem('nest-lang') || 'mn';
    window.applyTranslationsAndTwemoji(saved);
}

// Language switcher click handler
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang-btn');
    if (btn) {
        window.applyTranslationsAndTwemoji(btn.dataset.lang);
    }
});

// Init on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initLang();
        if (window.twemoji) twemoji.parse(document.body, { folder: 'svg', ext: '.svg' });
    });
} else {
    initLang();
    if (window.twemoji) twemoji.parse(document.body, { folder: 'svg', ext: '.svg' });
}

// SVG Observer removed per user request
