let _homeNewsLoadId = 0;

document.addEventListener('DOMContentLoaded', () => {
    initHomeNews();
});

document.addEventListener('languageChanged', (e) => {
    initHomeNews(e.detail.lang);
});

async function initHomeNews(forceLang = null) {
    const loader = document.getElementById('sanity-home-news-loader');
    const gridContainer = document.getElementById('sanity-home-news-grid');

    if (!loader || !gridContainer) return;

    const loadId = ++_homeNewsLoadId;
    const currentLang = forceLang || document.documentElement.lang || 'en';

    loader.style.display = 'block';
    gridContainer.style.display = 'none';

    try {
        const query = `*[_type == "news"] | order(date desc)[0...3] {
            _id,
            title_en, title_mn, title_ja,
            date,
            image,
            content_en, content_mn, content_ja
        }`;

        const articles = await window.SanityAPI.fetch(query);

        if (loadId !== _homeNewsLoadId) return;

        if (!articles || articles.length === 0) {
            loader.textContent = window.i18n('news_empty', 'No news has been published yet.');
            return;
        }

        renderHomeGrid(articles, gridContainer, currentLang);

        loader.style.display = 'none';
        gridContainer.style.display = 'grid';

        const newsObserver = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
        }, { threshold: 0.12 });

        document.querySelectorAll('#sanity-home-news-grid .reveal').forEach(el => {
            newsObserver.observe(el);
        });

    } catch (error) {
        if (loadId !== _homeNewsLoadId) return;
        loader.textContent = window.i18n('news_error', "News couldn't be loaded. Please try again later.");
    }
}

function renderHomeGrid(articles, container, lang) {
    const api = window.SanityAPI;
    const readMore = window.i18n('np_featured_link', 'Read Full Story →');
    const html = articles.map(article => {
        const title = api.escapeHTML(api.localizedField(article, 'title', lang));
        const excerpt = api.escapeHTML(api.newsExcerpt(api.localizedField(article, 'content', lang), 100));
        const imageUrl = api.urlFor(article.image);
        const formattedDate = api.formatNewsDate(article.date, lang);
        const articleId = encodeURIComponent(api.safeDocId(article._id));

        return `
            <div class="news-card reveal" style="cursor:pointer;" data-article-id="${articleId}">
                <div class="news-card-img" style="${imageUrl ? "background-image:url('" + imageUrl + "');" : ''} background-color:#f4f5f7; background-size:contain; background-position:center; background-repeat:no-repeat;"></div>
                <div class="news-card-body">
                    ${formattedDate ? `<div class="news-date">&#128197; <span>${formattedDate}</span></div>` : ''}
                    <h4>${title}</h4>
                    <p>${excerpt}</p>
                    <a href="article.html?id=${articleId}" style="color:var(--gold);font-weight:700;font-size:14px;margin-top:16px;display:inline-flex;align-items:center;gap:6px;">${readMore}</a>
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
