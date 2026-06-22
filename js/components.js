// Content Security Policy — runtime fallback only.
// The real policy lives as a static <meta> in each page's <head> (applies from
// document start); this injector only covers any page that forgot to add it.
// NOTE: frame-ancestors / X-Frame-Options cannot be set via <meta> — configure
// them (plus X-Content-Type-Options: nosniff) as HTTP headers on the web server.
(function() {
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        var m = document.createElement('meta');
        m.httpEquiv = 'Content-Security-Policy';
        m.content = [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https://cdn.sanity.io",
            "connect-src 'self' https://ka04oafk.api.sanity.io https://mongolian-bank-exchange-rate-6620c122ff22.herokuapp.com https://cdn.moneyconvert.net https://api.web3forms.com",
            "frame-src https://maps.google.com https://www.google.com",
            "media-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self' https://api.web3forms.com",
            "upgrade-insecure-requests"
        ].join('; ');
        document.head.prepend(m);
    }

    if (!document.querySelector('meta[name="referrer"]')) {
        var r = document.createElement('meta');
        r.name = 'referrer';
        r.content = 'strict-origin-when-cross-origin';
        document.head.prepend(r);
    }

    // Clickjacking defense: deny embedding in any frame at runtime as a fallback for older browsers
    try {
        if (window.top !== window.self) { window.top.location = window.self.location; }
    } catch (e) { /* cross-origin frame block — already protected */ }
})();

const NavbarHTML = `
    <nav class="navbar" id="navbar">
        <a href="index.html" class="nav-logo">
            <img src="assets/logo.png" alt="Nest Group Logo" width="120" height="42" style="width:auto;" />
            <div class="nav-logo-text">
                <span class="brand" data-i18n="brand_name">NEST</span>
                <span class="sub" data-i18n="brand_sub">Group</span>
            </div>
        </a>
        <ul class="nav-links">
            <li><a href="index.html" data-i18n="nav_home">Home</a></li>
            <li><a href="about.html" data-i18n="nav_about">About</a></li>
            <li><a href="companies.html" data-i18n="nav_companies">Our Companies</a></li>
            <li><a href="investor-relations.html" data-i18n="nav_ir">Investor Relations</a></li>
            <li><a href="news.html" data-i18n="nav_news">News</a></li>
            <li><a href="contact.html" class="nav-cta" data-i18n="nav_contact">Contact Us</a></li>
        </ul>
        <div class="lang-switcher">
            <button class="lang-btn active" data-lang="en">&#127482;&#127480;</button>
            <button class="lang-btn" data-lang="mn">&#127474;&#127475;</button>
            <button class="lang-btn" data-lang="ja">&#127471;&#127477;</button>
        </div>
        <div class="hamburger" id="hamburger">
            <span></span><span></span><span></span>
        </div>
    </nav>
`;

const FooterHTML = `
    <footer>
        <div class="footer-grid">
            <div class="footer-brand">
                <div class="footer-logo">
                    <img src="assets/logo.png" alt="Nest Group" width="56" height="56" />
                    <div class="footer-logo-text">
                        <span class="brand" data-i18n="brand_name">NEST</span>
                        <span class="sub" data-i18n="brand_sub">Group</span>
                    </div>
                </div>
                <div class="footer-socials">
                    <a href="https://www.youtube.com/@VE-STHoldingsMongolia-hd9wv" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="YouTube">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                    </a>
                    <a href="https://www.facebook.com/Nestholdingsmongolia" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="Facebook">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                    </a>
                    <a href="https://www.instagram.com/nest_holding/" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="Instagram">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    </a>
                </div>
            </div>
            <div class="footer-col">
                <h5 data-i18n="footer_col1">Company</h5>
                <ul>
                    <li><a href="about.html" data-i18n="nav_about">About Us</a></li>
                    <li><a href="companies.html" data-i18n="nav_companies">Our Companies</a></li>
                    <li><a href="investor-relations.html" data-i18n="nav_ir">Investor Relations</a></li>
                    <li><a href="news.html" data-i18n="nav_news">News & Media</a></li>
                    <li><a href="contact.html" data-i18n="nav_contact">Contact</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h5 data-i18n="footer_col2">Subsidiaries</h5>
                <ul>
                    <li><a href="companies.html" data-i18n="footer_sub_c1">VE-ST PROPERTY SERVICE LLC</a></li>
                    <li><a href="companies.html" data-i18n="footer_sub_c2">VE-ST MIRAIS NBFI LLC</a></li>
                    <li><a href="companies.html" data-i18n="footer_sub_c3">VE-ST TRAVEL SERVICE LLC</a></li>
                    <li><a href="companies.html" data-i18n="footer_sub_c4">VE-ST FOODS LLC</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h5 data-i18n="footer_col3">Contact</h5>
                <div class="footer-contact-item"><span class="icon">&#128205;</span> <span data-i18n="con_office_addr">Ulaanbaatar, Mongolia</span></div>
                <div class="footer-contact-item"><span class="icon">&#128222;</span> (+976) 7737-0770</div>
                <div class="footer-contact-item"><span class="icon">&#9993;</span> info@nest.mn</div>
            </div>
        </div>
        <div class="footer-bottom">
            <span data-i18n="footer_copy">&copy; 2026 Nest Group. All rights reserved.</span>
            <span data-i18n="footer_legal">Privacy Policy &middot; Terms of Use</span>
        </div>
    </footer>
`;

// Inject components
document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.getElementById('navbar-wrapper');
    if (navContainer) {
        navContainer.innerHTML = NavbarHTML;
    }

    const footerContainer = document.getElementById('footer-wrapper');
    if (footerContainer) {
        footerContainer.innerHTML = FooterHTML;
    }

    // Re-initialize Main JS elements if they exist now
    initInjectedComponents();
    initBackToTop();
});

// Icon-only back-to-top button, shown after the first viewport of scrolling
function initBackToTop() {
    if (document.querySelector('.back-to-top')) return;
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>';
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            btn.classList.toggle('visible', window.pageYOffset > 700);
            ticking = false;
        });
    }, { passive: true });
}

function initInjectedComponents() {
    // Hamburger menu bind
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }

    // Initialize Tubelight Navbar
    if (typeof initTubelightNavbar === 'function') {
        initTubelightNavbar();
    }

    // Language switcher bind (because it's rewritten)
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (window.applyTranslationsAndTwemoji) {
                window.applyTranslationsAndTwemoji(e.target.dataset.lang);
            } else if (window.applyTranslations) {
                window.applyTranslations(e.target.dataset.lang);
            }
        });
    });
}
