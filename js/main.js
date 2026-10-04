// Navbar scroll effect (components.js has already injected the navbar)
const navbar = document.querySelector('.navbar');
if (navbar) {
    const syncNavbar = () => navbar.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', syncNavbar, { passive: true });
    syncNavbar();
}

// Hamburger menu
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
if (hamburger && navLinks) {
    const setMenuOpen = (open) => {
        navLinks.classList.toggle('open', open);
        hamburger.setAttribute('aria-expanded', String(open));
    };
    hamburger.addEventListener('click', () => setMenuOpen(!navLinks.classList.contains('open')));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('open')) {
            setMenuOpen(false);
            hamburger.focus();
        }
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
// The Japanese web fonts come as a ~180 KB stylesheet (700+ @font-face rules).
// Linked in <head> it held up the first paint of every page in every language,
// so it is added only once a page is shown in Japanese.
const JA_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@400;600;700&display=swap';

function loadJapaneseFonts() {
    if (document.getElementById('fonts-ja')) return;
    const link = document.createElement('link');
    link.id = 'fonts-ja';
    link.rel = 'stylesheet';
    link.href = JA_FONTS_URL;
    document.head.appendChild(link);
}

// Start the download when someone reaches for the JP button, so the fonts are
// usually in hand by the time the click lands.
['pointerover', 'focusin'].forEach(type => {
    document.addEventListener(type, (e) => {
        if (e.target.closest && e.target.closest('.lang-btn[data-lang="ja"]')) loadJapaneseFonts();
    });
});

function applyTranslations(lang) {
    if (!window.translations || !window.translations[lang]) return;
    const t = window.translations[lang];
    if (lang === 'ja') loadJapaneseFonts();

    // Apply to data-i18n (text content)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key] !== undefined) el.textContent = t[key];
    });

    // Apply to data-i18n-html (innerHTML — for bold/italic/br)
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

    // Apply to data-i18n-aria (accessible names of icon-only buttons)
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.dataset.i18nAria;
        if (t[key] !== undefined) el.setAttribute('aria-label', t[key]);
    });

    // Update html lang attribute
    document.documentElement.lang = lang === 'mn' ? 'mn' : lang === 'ja' ? 'ja' : 'en';

    // Update switcher buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const isActive = btn.dataset.lang === lang;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
    });

    // Save preference
    localStorage.setItem('nest-lang', lang);

    document.body.classList.toggle('lang-mn', lang === 'mn');
    document.body.classList.toggle('lang-ja', lang === 'ja');
}

window.applyTranslations = applyTranslations;

/** Translated string for the current page language, for text built in JS. */
window.i18n = function (key, fallback) {
    const t = window.translations && window.translations[document.documentElement.lang];
    return (t && t[key]) || fallback;
};

/** Switch language and tell JS-rendered sections (news, calculator…) to re-render. */
function setLanguage(lang) {
    if (!lang) return;
    applyTranslations(lang);
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: lang } }));
}

function initLang() {
    setLanguage(localStorage.getItem('nest-lang') || 'mn');
}

// Language switcher click handler
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang-btn');
    if (btn) setLanguage(btn.dataset.lang);
});

// Init on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLang);
} else {
    initLang();
}
