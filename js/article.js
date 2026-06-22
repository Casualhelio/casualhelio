let _articleLoadId = 0;
let _sliderState = null; // { index, total, autoplayId, track, dots, counter }

document.addEventListener('DOMContentLoaded', () => {
    initArticle();
});

document.addEventListener('languageChanged', (e) => {
    initArticle(e.detail.lang);
});

function isValidSanityId(id) {
    return /^[a-zA-Z0-9_-]+$/.test(id);
}

async function initArticle(forceLang = null) {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');

    const loader = document.getElementById('article-loader');
    const container = document.getElementById('article-container');
    const heroTitle = document.getElementById('article-title');
    const heroDate = document.getElementById('article-date');
    const bodyContent = document.getElementById('article-body');

    if (!articleId || !isValidSanityId(articleId)) {
        if (loader) loader.innerHTML = "Article not found. <br><br> <a href='news.html' style='color:var(--primary);text-decoration:underline;'>Return to News</a>";
        return;
    }

    const loadId = ++_articleLoadId;
    const currentLang = forceLang || document.documentElement.lang || 'en';

    if (loader) loader.style.display = 'block';
    if (container) container.style.display = 'none';

    try {
        const query = `*[_type == "news" && _id == "${articleId}"][0] {
            _id,
            title_en, title_mn, title_ja,
            date,
            image,
            gallery,
            content_en, content_mn, content_ja
        }`;

        const article = await window.SanityAPI.fetch(query);

        if (loadId !== _articleLoadId) return;

        if (!article) {
            if (loader) loader.innerHTML = "Article not found or has been removed. <br><br> <a href='news.html' style='color:var(--primary);text-decoration:underline;'>Return to News</a>";
            return;
        }

        const title = getLocalizedField(article, 'title', currentLang);
        const contentBlocks = getLocalizedField(article, 'content', currentLang);

        const dateObj = article.date ? new Date(article.date) : new Date();
        const formattedDate = dateObj.toLocaleDateString(
            currentLang === 'mn' ? 'mn-MN' : currentLang === 'ja' ? 'ja-JP' : 'en-US',
            { year: 'numeric', month: 'long', day: 'numeric' }
        );

        if (heroTitle) heroTitle.textContent = title;
        if (heroDate) heroDate.innerHTML = `&#128197; ${formattedDate}`;

        // Build slider images: cover image + gallery
        const slides = [];
        const coverUrl = window.SanityAPI.urlFor(article.image);
        if (coverUrl) {
            slides.push({ url: coverUrl, caption: '' });
        }
        if (Array.isArray(article.gallery)) {
            article.gallery.forEach(img => {
                const url = window.SanityAPI.urlFor(img);
                if (url) {
                    slides.push({ url, caption: img.caption || '' });
                }
            });
        }

        renderSlider(slides);

        if (bodyContent) {
            bodyContent.innerHTML = window.SanityAPI.blocksToHTML(contentBlocks, currentLang) || "<p>No content available.</p>";
        }

        document.title = `${title} - Nest Group`;

        if (loader) loader.style.display = 'none';
        if (container) container.style.display = 'block';

    } catch (e) {
        if (loadId !== _articleLoadId) return;
        if (loader) loader.innerHTML = "Failed to load article. Please check your connection.";
    }
}

function getLocalizedField(article, fieldName, lang) {
    if (article[`${fieldName}_${lang}`]) return article[`${fieldName}_${lang}`];
    if (article[`${fieldName}_en`]) return article[`${fieldName}_en`];
    return article[`${fieldName}_mn`] || article[`${fieldName}_ja`] || '';
}

function renderSlider(slides) {
    const slider = document.getElementById('article-slider');
    const track = document.getElementById('slider-track');
    const dotsContainer = document.getElementById('slider-dots');
    const counter = document.getElementById('slider-counter');
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');

    // Clear any previous slider state
    if (_sliderState && _sliderState.autoplayId) {
        clearInterval(_sliderState.autoplayId);
    }

    if (!slider || !track || !slides.length) {
        if (slider) slider.style.display = 'none';
        return;
    }

    track.innerHTML = '';
    dotsContainer.innerHTML = '';

    slides.forEach((s, i) => {
        const slide = document.createElement('div');
        slide.className = 'article-slide';
        const captionHtml = s.caption ? `<div class="article-slide-caption">${escapeHTML(s.caption)}</div>` : '';
        // Build the image with createElement so the URL can never be interpreted as HTML/attribute syntax
        const img = document.createElement('img');
        img.src = s.url;
        img.alt = '';
        img.loading = i === 0 ? 'eager' : 'lazy';
        slide.appendChild(img);
        if (captionHtml) {
            const cap = document.createElement('div');
            cap.className = 'article-slide-caption';
            cap.textContent = s.caption;
            slide.appendChild(cap);
        }
        track.appendChild(slide);

        const dot = document.createElement('button');
        dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    });

    slider.style.display = 'block';

    // Hide controls if only 1 slide
    const single = slides.length <= 1;
    prevBtn.style.display = single ? 'none' : '';
    nextBtn.style.display = single ? 'none' : '';
    dotsContainer.style.display = single ? 'none' : '';
    counter.style.display = single ? 'none' : '';

    _sliderState = {
        index: 0,
        total: slides.length,
        autoplayId: null,
        track,
        dots: dotsContainer,
        counter
    };

    updateSliderUI();

    if (!single) {
        prevBtn.onclick = () => goToSlide(_sliderState.index - 1);
        nextBtn.onclick = () => goToSlide(_sliderState.index + 1);
        attachSwipe(slider);
        attachKeyboard();
        startAutoplay();
    }
}

function goToSlide(targetIndex) {
    if (!_sliderState) return;
    const total = _sliderState.total;
    // wrap around
    const i = ((targetIndex % total) + total) % total;
    _sliderState.index = i;
    updateSliderUI();
    restartAutoplay();
}

function updateSliderUI() {
    if (!_sliderState) return;
    const { index, total, track, dots, counter } = _sliderState;
    track.style.transform = `translateX(-${index * 100}%)`;
    Array.from(dots.children).forEach((d, i) => {
        d.classList.toggle('active', i === index);
    });
    counter.textContent = `${index + 1} / ${total}`;
}

function startAutoplay() {
    if (!_sliderState) return;
    _sliderState.autoplayId = setInterval(() => {
        goToSlideInternal(_sliderState.index + 1);
    }, 5000);
}

function restartAutoplay() {
    if (!_sliderState) return;
    if (_sliderState.autoplayId) clearInterval(_sliderState.autoplayId);
    startAutoplay();
}

function goToSlideInternal(targetIndex) {
    // Same as goToSlide but doesn't reset autoplay (used by autoplay itself)
    if (!_sliderState) return;
    const total = _sliderState.total;
    const i = ((targetIndex % total) + total) % total;
    _sliderState.index = i;
    updateSliderUI();
}

function attachSwipe(el) {
    let startX = 0;
    let endX = 0;
    el.addEventListener('touchstart', (e) => {
        startX = e.changedTouches[0].screenX;
    }, { passive: true });
    el.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].screenX;
        const diff = endX - startX;
        if (Math.abs(diff) > 50) {
            if (diff < 0) goToSlide(_sliderState.index + 1);
            else goToSlide(_sliderState.index - 1);
        }
    }, { passive: true });
}

function attachKeyboard() {
    document.addEventListener('keydown', sliderKeyHandler);
}

function sliderKeyHandler(e) {
    if (!_sliderState) return;
    if (e.key === 'ArrowLeft') goToSlide(_sliderState.index - 1);
    else if (e.key === 'ArrowRight') goToSlide(_sliderState.index + 1);
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
