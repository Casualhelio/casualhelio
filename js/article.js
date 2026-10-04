let _articleLoadId = 0;
let _sliderState = null; // { index, total, track, dots, counter }

document.addEventListener('DOMContentLoaded', () => {
    initArticle();
});

document.addEventListener('languageChanged', (e) => {
    initArticle(e.detail.lang);
});

/** Replace the loader with a translated message and a link back to the news list. */
function showArticleMessage(loader, key, fallback) {
    if (!loader) return;
    const text = document.createElement('p');
    text.textContent = window.i18n(key, fallback);
    const back = document.createElement('a');
    back.href = 'news.html';
    back.textContent = window.i18n('art_back', '← Back to News');
    back.style.cssText = 'display:inline-block;margin-top:24px;color:var(--primary);text-decoration:underline;';
    loader.replaceChildren(text, back);
}

async function initArticle(forceLang = null) {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = window.SanityAPI.safeDocId(urlParams.get('id') || '');

    const loader = document.getElementById('article-loader');
    const container = document.getElementById('article-container');
    const heroTitle = document.getElementById('article-title');
    const heroDate = document.getElementById('article-date');
    const bodyContent = document.getElementById('article-body');

    if (!articleId) {
        showArticleMessage(loader, 'art_not_found', 'This article could not be found. It may have been removed.');
        return;
    }

    const loadId = ++_articleLoadId;
    const currentLang = forceLang || document.documentElement.lang || 'en';

    if (loader) loader.style.display = 'block';
    if (container) container.style.display = 'none';

    try {
        // The id is passed as a GROQ parameter, never spliced into the query text
        const query = `*[_type == "news" && _id == $id][0] {
            _id,
            title_en, title_mn, title_ja,
            date,
            image,
            gallery,
            content_en, content_mn, content_ja
        }`;

        const article = await window.SanityAPI.fetch(query, { id: articleId });

        if (loadId !== _articleLoadId) return;

        if (!article) {
            showArticleMessage(loader, 'art_not_found', 'This article could not be found. It may have been removed.');
            return;
        }

        const api = window.SanityAPI;
        const title = api.localizedField(article, 'title', currentLang);
        const contentBlocks = api.localizedField(article, 'content', currentLang);
        const formattedDate = api.formatNewsDate(article.date, currentLang);

        if (heroTitle) heroTitle.textContent = title;
        if (heroDate) heroDate.innerHTML = formattedDate ? `&#128197; ${formattedDate}` : '';

        // Build slider images: cover image + gallery
        const slides = [];
        const coverUrl = api.urlFor(article.image);
        if (coverUrl) {
            slides.push({ url: coverUrl, caption: '' });
        }
        if (Array.isArray(article.gallery)) {
            article.gallery.forEach(img => {
                const url = api.urlFor(img);
                if (url) {
                    slides.push({ url, caption: img.caption || '' });
                }
            });
        }

        renderSlider(slides);

        if (bodyContent) {
            const html = api.blocksToHTML(contentBlocks, currentLang);
            if (html) {
                bodyContent.innerHTML = html;
            } else {
                const empty = document.createElement('p');
                empty.textContent = window.i18n('art_no_content', 'This article has no text yet.');
                bodyContent.replaceChildren(empty);
            }
        }

        document.title = `${title} - Nest Group`;

        if (loader) loader.style.display = 'none';
        if (container) container.style.display = 'block';

    } catch (e) {
        if (loadId !== _articleLoadId) return;
        showArticleMessage(loader, 'art_error', "The article couldn't be loaded. Please check your connection and try again.");
    }
}

function renderSlider(slides) {
    const slider = document.getElementById('article-slider');
    const track = document.getElementById('slider-track');
    const dotsContainer = document.getElementById('slider-dots');
    const counter = document.getElementById('slider-counter');
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');

    if (!slider || !track || !slides.length) {
        if (slider) slider.style.display = 'none';
        return;
    }

    track.innerHTML = '';
    dotsContainer.innerHTML = '';

    slides.forEach((s, i) => {
        const slide = document.createElement('div');
        slide.className = 'article-slide';
        // Build the image with createElement so the URL can never be interpreted as HTML/attribute syntax
        const img = document.createElement('img');
        img.src = s.url;
        img.alt = '';
        img.loading = i === 0 ? 'eager' : 'lazy';
        slide.appendChild(img);
        if (s.caption) {
            const cap = document.createElement('div');
            cap.className = 'article-slide-caption';
            cap.textContent = s.caption;
            slide.appendChild(cap);
        }
        track.appendChild(slide);

        const dot = document.createElement('button');
        dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
        dot.type = 'button';
        dot.setAttribute('aria-label', window.i18n('art_goto_img', 'Go to image {n}').replace('{n}', i + 1));
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
        track,
        dots: dotsContainer,
        counter
    };

    updateSliderUI();

    // No autoplay: an auto-advancing gallery needs a pause control (WCAG 2.2.2),
    // and readers move through the photos themselves with buttons, dots, keys or swipe.
    if (!single) {
        prevBtn.onclick = () => goToSlide(_sliderState.index - 1);
        nextBtn.onclick = () => goToSlide(_sliderState.index + 1);
        attachSwipe(slider);
        attachKeyboard();
    }
}

function goToSlide(targetIndex) {
    if (!_sliderState) return;
    const total = _sliderState.total;
    // wrap around
    const i = ((targetIndex % total) + total) % total;
    _sliderState.index = i;
    updateSliderUI();
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

function attachSwipe(el) {
    // The slider re-renders on every language change; bind the swipe only once
    // so one swipe always moves one slide.
    if (el.dataset.swipeBound) return;
    el.dataset.swipeBound = '1';
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


