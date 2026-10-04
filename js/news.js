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
            loader.textContent = window.i18n('news_empty', 'No news has been published yet.');
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
        loader.textContent = window.i18n('news_error', "News couldn't be loaded. Please try again later.");
    }
}

function readMoreLabel() {
    return window.i18n('np_featured_link', 'Read Full Story →');
}

/** Date row, or nothing when the article has no date. */
function dateRow(article, lang) {
    const formatted = window.SanityAPI.formatNewsDate(article.date, lang);
    return formatted ? `<div class="news-date">&#128197; <span>${formatted}</span></div>` : '';
}

function renderFeatured(article, container, lang) {
    if (!article) return;
    const api = window.SanityAPI;

    const title = api.escapeHTML(api.localizedField(article, 'title', lang));
    const excerpt = api.escapeHTML(api.newsExcerpt(api.localizedField(article, 'content', lang), 150));
    const imageUrl = api.urlFor(article.image);
    const articleId = api.safeDocId(article._id);

    container.innerHTML = `
        <div class="reveal" style="display:grid;grid-template-columns:2fr;gap:28px;margin-bottom:28px;">
            <div class="news-card" style="display:grid;grid-template-columns:1fr 1fr;">
                 <div class="news-card-img" style="height:100%;min-height:320px;${imageUrl ? "background-image:url('" + imageUrl + "');" : ''} background-color:#f4f5f7; background-size:contain; background-position:center; background-repeat:no-repeat;">
                 </div>
                 <div class="news-card-body" style="padding:40px 36px;display:flex;flex-direction:column;justify-content:center;">
                     ${dateRow(article, lang)}
                     <h2 style="font-size:20px;margin-bottom:14px;">${title}</h2>
                     <p>${excerpt}</p>
                     <a href="${api.escapeHTML(window.withLang('article.html?id=' + encodeURIComponent(articleId)))}" style="color:var(--gold);font-weight:700;font-size:14px;margin-top:16px;display:inline-flex;align-items:center;gap:6px;">${readMoreLabel()}</a>
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

    const api = window.SanityAPI;
    const html = articles.map(article => {
        const title = api.escapeHTML(api.localizedField(article, 'title', lang));
        const excerpt = api.escapeHTML(api.newsExcerpt(api.localizedField(article, 'content', lang), 150));
        const imageUrl = api.urlFor(article.image);
        const articleId = encodeURIComponent(api.safeDocId(article._id));

        return `
            <div class="news-card reveal" style="cursor:pointer;" data-article-id="${articleId}">
                <div class="news-card-img" style="${imageUrl ? "background-image:url('" + imageUrl + "');" : ''} background-color:#f4f5f7; background-size:contain; background-position:center; background-repeat:no-repeat;"></div>
                <div class="news-card-body">
                    ${dateRow(article, lang)}
                    <h2>${title}</h2>
                    <p>${excerpt}</p>
                     <a href="${api.escapeHTML(window.withLang('article.html?id=' + articleId))}" style="color:var(--gold);font-weight:700;font-size:14px;margin-top:16px;display:inline-flex;align-items:center;gap:6px;">${readMoreLabel()}</a>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    container.querySelectorAll('.news-card[data-article-id]').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-article-id');
            if (id) window.location.href = window.withLang('article.html?id=' + id);
        });
    });
}
