/* =====================================================
   NEST GROUP — V2 INTERACTION LAYER
   Vanilla JS, no dependencies (CSP-safe).
   ===================================================== */
(function () {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Before / After sliders ---------- */
    function initBASliders() {
        document.querySelectorAll('.ba-slider').forEach(slider => {
            let dragging = false;

            const setPos = (clientX) => {
                const rect = slider.getBoundingClientRect();
                let pct = ((clientX - rect.left) / rect.width) * 100;
                pct = Math.max(2, Math.min(98, pct));
                slider.style.setProperty('--ba', pct + '%');
            };

            slider.addEventListener('pointerdown', (e) => {
                dragging = true;
                slider.setPointerCapture(e.pointerId);
                setPos(e.clientX);
            });
            slider.addEventListener('pointermove', (e) => { if (dragging) setPos(e.clientX); });
            slider.addEventListener('pointerup', () => { dragging = false; });
            slider.addEventListener('pointercancel', () => { dragging = false; });

            // keyboard access
            slider.setAttribute('tabindex', '0');
            slider.setAttribute('role', 'slider');
            slider.setAttribute('aria-valuemin', '0');
            slider.setAttribute('aria-valuemax', '100');
            slider.addEventListener('keydown', (e) => {
                const cur = parseFloat(getComputedStyle(slider).getPropertyValue('--ba')) || 50;
                if (e.key === 'ArrowLeft') { slider.style.setProperty('--ba', Math.max(2, cur - 4) + '%'); e.preventDefault(); }
                if (e.key === 'ArrowRight') { slider.style.setProperty('--ba', Math.min(98, cur + 4) + '%'); e.preventDefault(); }
            });

            // intro tease: sweep handle once when first visible
            if (!reduceMotion) {
                const teaseObs = new IntersectionObserver((entries) => {
                    entries.forEach(en => {
                        if (!en.isIntersecting || slider.dataset.teased) return;
                        slider.dataset.teased = '1';
                        let t = 0;
                        const sweep = setInterval(() => {
                            t += 0.025;
                            if (t >= 1) { clearInterval(sweep); slider.style.setProperty('--ba', '50%'); return; }
                            const v = 50 + Math.sin(t * Math.PI * 2) * 18 * (1 - t);
                            slider.style.setProperty('--ba', v + '%');
                        }, 16);
                        teaseObs.unobserve(slider);
                    });
                }, { threshold: 0.5 });
                teaseObs.observe(slider);
            }
        });

        // project tabs: swap image pairs
        document.querySelectorAll('.ba-tabs').forEach(tabs => {
            const wrap = tabs.closest('.ba-wrap');
            const slider = wrap && wrap.querySelector('.ba-slider');
            if (!slider) return;
            const before = slider.querySelector('.ba-before-img');
            const after = slider.querySelector('.ba-after-img');
            tabs.querySelectorAll('.ba-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    tabs.querySelectorAll('.ba-tab').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    before.src = btn.dataset.before;
                    after.src = btn.dataset.after;
                    slider.style.setProperty('--ba', '50%');
                });
            });
        });
    }

    /* ---------- Inline video cards ----------
       The cover is a <button>; once a video starts, its native controls take
       over (pause, seek, volume), so the card itself has no click handler. */
    function resetVideoCard(card) {
        const video = card.querySelector('video');
        card.classList.remove('playing');
        if (video) video.removeAttribute('controls');
    }

    function initVideos() {
        document.querySelectorAll('.v2-video').forEach(card => {
            const video = card.querySelector('video');
            const cover = card.querySelector('.v2-video__cover');
            if (!video || !cover) return;
            video.setAttribute('tabindex', '-1'); // focus target once playback starts

            cover.addEventListener('click', () => {
                document.querySelectorAll('.v2-video').forEach(other => {
                    if (other === card) return;
                    const v = other.querySelector('video');
                    if (v) v.pause();
                    resetVideoCard(other);
                });
                card.classList.add('playing');
                video.setAttribute('controls', '');
                video.play();
                video.focus(); // the cover hides now; keep keyboard focus on the player
            });

            video.addEventListener('ended', () => {
                const hadFocus = document.activeElement === video;
                resetVideoCard(card);
                video.load();
                if (hadFocus) cover.focus();
            });
        });
    }

    /* ---------- Ambient hero videos (autoplay loops) ----------
       WCAG 2.2.2: looping motion needs a pause control. Reduced-motion
       visitors get no playback at all (CSS hides the video). */
    function initAmbientVideos() {
        const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="9" y1="5" x2="9" y2="19"></line><line x1="15" y1="5" x2="15" y2="19"></line></svg>';
        const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><polygon points="7 4 19 12 7 20 7 4"></polygon></svg>';

        document.querySelectorAll('video[data-ambient]').forEach(video => {
            if (reduceMotion) {
                video.removeAttribute('autoplay');
                video.pause();
                return;
            }

            const host = video.closest('section');
            if (!host) return;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ambient-toggle';

            const render = () => {
                const paused = video.paused;
                btn.innerHTML = paused ? ICON_PLAY : ICON_PAUSE;
                // main.js re-applies the label from this key whenever the language changes
                btn.dataset.i18nAria = paused ? 'video_bg_play' : 'video_bg_pause';
                const t = window.translations && window.translations[document.documentElement.lang];
                btn.setAttribute('aria-label', (t && t[btn.dataset.i18nAria]) || (paused ? 'Play background video' : 'Pause background video'));
            };

            btn.addEventListener('click', () => {
                if (video.paused) video.play(); else video.pause();
            });
            video.addEventListener('play', render);
            video.addEventListener('pause', render);

            render();
            host.appendChild(btn);
        });
    }

    /* ---------- Chapter rail ---------- */
    function initRail() {
        const rail = document.querySelector('.v2-rail');
        if (!rail) return;
        const links = Array.from(rail.querySelectorAll('a'));
        const targets = links
            .map(a => document.querySelector(a.getAttribute('href')))
            .filter(Boolean);
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(en => {
                if (!en.isIntersecting) return;
                links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
            });
        }, { rootMargin: '-40% 0px -55% 0px' });
        targets.forEach(t => obs.observe(t));
    }

    /* ---------- Segment chart animation ---------- */
    function initSegCharts() {
        const charts = document.querySelectorAll('.v2-seg');
        if (!charts.length) return;
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    en.target.classList.add('animated');
                    obs.unobserve(en.target);
                }
            });
        }, { threshold: 0.3 });
        charts.forEach(c => obs.observe(c));
    }

    /* ---------- Stagger reveal (reuses .visible from main.js observer) ---------- */
    function initStagger() {
        const els = document.querySelectorAll('[data-stagger]');
        if (!els.length) return;
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    en.target.classList.add('visible');
                    obs.unobserve(en.target);
                }
            });
        }, { threshold: 0.12 });
        els.forEach(el => obs.observe(el));
    }

    /* ---------- Lightbox for marquee ad images ---------- */
    function initLightbox() {
        const triggers = document.querySelectorAll('.v2-marquee--zoom img');
        if (!triggers.length) return;

        let box = null, boxImg = null, closeBtn = null, lastFocus = null;

        function build() {
            box = document.createElement('div');
            box.className = 'v2-lightbox';
            box.setAttribute('role', 'dialog');
            box.setAttribute('aria-modal', 'true');
            box.setAttribute('aria-hidden', 'true');

            const inner = document.createElement('div');
            inner.className = 'v2-lightbox__inner';

            boxImg = document.createElement('img');
            boxImg.className = 'v2-lightbox__img';
            boxImg.alt = '';

            closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'v2-lightbox__close';
            closeBtn.setAttribute('aria-label', 'Close');
            closeBtn.textContent = '×';

            inner.appendChild(boxImg);
            inner.appendChild(closeBtn);
            box.appendChild(inner);
            document.body.appendChild(box);

            box.addEventListener('click', (e) => { if (e.target === box) closeBox(); });
            closeBtn.addEventListener('click', closeBox);
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && box.classList.contains('open')) closeBox();
            });
        }

        function openBox(src, alt) {
            if (!box) build();
            boxImg.src = src;
            boxImg.alt = alt || '';
            lastFocus = document.activeElement;
            box.classList.add('open');
            box.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            document.querySelectorAll('.v2-marquee__track').forEach(t => { t.style.animationPlayState = 'paused'; });
            closeBtn.focus();
        }

        function closeBox() {
            box.classList.remove('open');
            box.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            document.querySelectorAll('.v2-marquee__track').forEach(t => { t.style.animationPlayState = ''; });
            if (lastFocus && lastFocus.focus) lastFocus.focus();
        }

        triggers.forEach(img => {
            img.addEventListener('click', () => openBox(img.currentSrc || img.src, img.getAttribute('alt')));
        });
    }

    function init() {
        initBASliders();
        initVideos();
        initAmbientVideos();
        initRail();
        initSegCharts();
        initStagger();
        initLightbox();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
