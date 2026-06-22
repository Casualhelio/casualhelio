let _newsLoadId = 0;

document.addEventListener('DOMContentLoaded', () => {
    initNewsContent();
});

document.addEventListener('languageChanged', (e) => {
    initNewsContent(e.detail.lang);
});

async function initNewsContent(forceLang = null) {
    const loader = document.getElementById('sanity-news-loader');
    const featuredContainer = document.getElementById('sanity-news-featured');
    const gridContainer = document.getElementById('sanity-news-grid');

    if (!loader || !featuredContainer || !gridContainer) return;

    const loadId = ++_newsLoadId;
    const currentLang = forceLang || document.documentElement.lang || 'en';

    loader.style.display = 'block';
    featuredContainer.style.display = 'none';
    gridContainer.style.display = 'none';

    try {
        const query = `*[_type == "news"] | order(date desc) {
            _id,
            title_en, title_mn, title_ja,
            date,
            image,
            content_en, content_mn, content_ja
        }`;

        const articles = await window.SanityAPI.fetch(query);

        if (loadId !== _newsLoadId) return;

        if (!articles || articles.length === 0) {
            loader.innerHTML = "No news articles found.";
            return;
        }

        const featuredArticle = articles[0];
        const restArticles = articles.slice(1);

        renderFeatured(featuredArticle, featuredContainer, currentLang);
        renderGrid(restArticles, gridContainer, currentLang);

        loader.style.display = 'none';
        featuredContainer.style.display = 'block';
        gridContainer.style.display = 'grid';

        const newsObserver = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
        }, { threshold: 0.12 });

        document.querySelectorAll('#sanity-news-featured .reveal, #sanity-news-grid .reveal').forEach(el => {
            newsObserver.observe(el);
        });

    } catch (error) {
        if (loadId !== _newsLoadId) return;
        loader.innerHTML = "Failed to load news articles. Please try again later.";
    }
}

function getLocalizedField(article, fieldName, lang) {
    // Try requested language first, fallback to English, then whatever exists
    if (article[`${fieldName}_${lang}`]) return article[`${fieldName}_${lang}`];
    if (article[`${fieldName}_en`]) return article[`${fieldName}_en`];
    return article[`${fieldName}_mn`] || article[`${fieldName}_ja`] || '';
}

// Sanity ids are interpolated into hrefs — only allow plain id characters
function safeArticleId(id) {
    return /^[a-zA-Z0-9._-]+$/.test(String(id)) ? String(id) : '';
}

function formatNewsDate(dateStr, lang) {
    const d = dateStr ? new Date(dateStr) : new Date();
    const locale = lang === 'mn' ? 'mn-MN' : lang === 'ja' ? 'ja-JP' : 'en-US';
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

function getExcerpt(blocks) {
    if (!blocks || !Array.isArray(blocks)) return '';
    const firstParagraph = blocks.find(b => b.style === 'normal' || !b.style);
    if (!firstParagraph || !firstParagraph.children) return '';

    const text = firstParagraph.children.map(c => c.text).join(' ');
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
}

function renderFeatured(article, container, lang) {
    if (!article) return;
    const esc = window.SanityAPI && window.SanityAPI.escapeHTML ? window.SanityAPI.escapeHTML : (s) => s;

    const title = esc(getLocalizedField(article, 'title', lang));
    const contentBlocks = getLocalizedField(article, 'content', lang);
    const excerpt = esc(getExcerpt(contentBlocks));
    const imageUrl = window.SanityAPI.urlFor(article.image);
    const formattedDate = formatNewsDate(article.date, lang);
    const articleId = safeArticleId(article._id);

    container.innerHTML = `
        <div class="reveal" style="display:grid;grid-template-columns:2fr;gap:28px;margin-bottom:28px;">
            <div class="news-card" style="display:grid;grid-template-columns:1fr 1fr;">
                 <div class="news-card-img" style="height:100%;min-height:320px;${imageUrl ? "background-image:url('" + imageUrl + "');" : ''} background-color:#f4f5f7; background-size:contain; background-position:center; background-repeat:no-repeat;">
                 </div>
                 <div class="news-card-body" style="padding:40px 36px;display:flex;flex-direction:column;justify-content:center;">
                     <div class="news-date">&#128197; <span>${formattedDate}</span></div>
                     <h4 style="font-size:20px;margin-bottom:14px;">${title}</h4>
                     <p>${excerpt}</p>
                     <a href="article.html?id=${encodeURIComponent(articleId)}" style="color:var(--gold);font-weight:700;font-size:14px;margin-top:16px;display:inline-flex;align-items:center;gap:6px;">Read Full Story &rarr;</a>
                 </div>
            </div>
        </div>
    `;
}

function renderGrid(articles, container, lang) {
    if (!articles || articles.length === 0) {
        container.innerHTML = '';
        return;
    }

    const esc = window.SanityAPI && window.SanityAPI.escapeHTML ? window.SanityAPI.escapeHTML : (s) => s;
    const html = articles.map(article => {
        const title = esc(getLocalizedField(article, 'title', lang));
        const contentBlocks = getLocalizedField(article, 'content', lang);
        const excerpt = esc(getExcerpt(contentBlocks));
        const imageUrl = window.SanityAPI.urlFor(article.image);
        const formattedDate = formatNewsDate(article.date, lang);
        const articleId = encodeURIComponent(safeArticleId(article._id));

        return `
            <div class="news-card reveal" style="cursor:pointer;" data-article-id="${articleId}">
                <div class="news-card-img" style="${imageUrl ? "background-image:url('" + imageUrl + "');" : ''} background-color:#f4f5f7; background-size:contain; background-position:center; background-repeat:no-repeat;"></div>
                <div class="news-card-body">
                    <div class="news-date">&#128197; <span>${formattedDate}</span></div>
                    <h4>${title}</h4>
                    <p>${excerpt}</p>
                     <a href="article.html?id=${articleId}" style="color:var(--gold);font-weight:700;font-size:14px;margin-top:16px;display:inline-flex;align-items:center;gap:6px;">Read Full Story &rarr;</a>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    container.querySelectorAll('.news-card[data-article-id]').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-article-id');
            if (id) window.location.href = 'article.html?id=' + id;
        });
    });
}
