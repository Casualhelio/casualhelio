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

// Tubelight Navbar Logic
function initTubelightNavbar() {
    const navLinksContainer = document.querySelector('.nav-links');
    if (!navLinksContainer) return;

    const links = Array.from(navLinksContainer.querySelectorAll('a:not(.nav-cta)'));
    if (links.length === 0) return;

    // Remove any existing tubelight elements to prevent duplicates
    const existing = navLinksContainer.querySelector('.nav-tubelight');
    if (existing) existing.remove();

    const tubelight = document.createElement('div');
    tubelight.className = 'nav-tubelight';
    tubelight.innerHTML = `
        <div class="lamp-base">
            <div class="glow-1"></div>
            <div class="glow-2"></div>
            <div class="glow-3"></div>
        </div>
    `;
    navLinksContainer.appendChild(tubelight);

    const currentPage = location.pathname.split('/').pop() || 'index.html';
    // Article detail pages (article.html) live under News in the IA, so highlight News for them.
    const matchPage = currentPage === 'article.html' ? 'news.html' : currentPage;
    let activeLink = links.find(l => l.getAttribute('href') === matchPage) || links[0];

    // Set initial active status
    links.forEach(l => l.classList.toggle('active', l === activeLink));

    function updateLightPosition(targetLink) {
        if (!targetLink) return;
        const containerRect = navLinksContainer.getBoundingClientRect();
        const linkRect = targetLink.getBoundingClientRect();

        const left = linkRect.left - containerRect.left;
        const width = linkRect.width;

        tubelight.style.left = `${left}px`;
        tubelight.style.width = `${width}px`;
        tubelight.style.opacity = '1';
    }

    // Give layout a moment before calculating initial position
    setTimeout(() => {
        updateLightPosition(activeLink);
    }, 50);

    links.forEach(link => {
        link.addEventListener('mouseenter', () => updateLightPosition(link));
        link.addEventListener('mouseleave', () => updateLightPosition(activeLink));
        link.addEventListener('click', (e) => {
            // Let the browser navigate, but update visual state
            activeLink = link;
            links.forEach(l => l.classList.toggle('active', l === activeLink));
            updateLightPosition(activeLink);
        });
    });

    window.addEventListener('resize', () => updateLightPosition(activeLink));

    // MutationObserver to handle font load resizing or element resizing
    const observer = new ResizeObserver(() => updateLightPosition(activeLink));
    observer.observe(navLinksContainer);
}

// Active nav link initialization replaced by tubelight logic
initTubelightNavbar();

// Reveal on scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Counter animation
function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    const step = target / (2000 / 16);
    let current = 0;
    const t = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(t); }
        el.textContent = Math.floor(current).toLocaleString();
    }, 16);
}
const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting && !e.target.classList.contains('counted')) {
            e.target.classList.add('counted');
            animateCounter(e.target);
        }
    });
}, { threshold: 0.5 });
document.querySelectorAll('[data-target]').forEach(el => counterObs.observe(el));

// Econ stat count-up (homepage growth-market cards — supports decimals + a +/− prefix)
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function animateEconStat(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const prefix = el.dataset.prefix || '';
    if (prefersReducedMotion || isNaN(target)) { el.textContent = prefix + target.toFixed(dec); return; }
    const dur = 1600;
    let start = null;
    const tick = (ts) => {
        if (start === null) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);   // easeOutCubic
        el.textContent = prefix + (target * eased).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = prefix + target.toFixed(dec);
    };
    requestAnimationFrame(tick);
}
const econObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting && !e.target.classList.contains('counted')) {
            e.target.classList.add('counted');
            animateEconStat(e.target);
        }
    });
}, { threshold: 0.6 });
document.querySelectorAll('.econ-num[data-count]').forEach(el => econObs.observe(el));

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
            if (el.classList.contains('animate-letters')) {
                // Signal that this needs splitting immediately
                typeof window.splitLetters === 'function' && window.splitLetters(el);
            }
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
