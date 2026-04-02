const NEWS_DATA_URL = "assets/data/news.json";
const FEATURED_ROTATE_MS = 7000;

const state = {
  data: null,
  selectedSeries: "all",
  featuredIndex: 0,
  timerId: null,
};

const featuredCardEl = document.querySelector("#featured-card");
const featuredDotsEl = document.querySelector("#featured-dots");
const prevButtonEl = document.querySelector("#featured-prev");
const nextButtonEl = document.querySelector("#featured-next");
const filtersEl = document.querySelector("#news-filters");
const newsListEl = document.querySelector("#news-list");
const newsStatusEl = document.querySelector("#news-status");
const newsSourceEl = document.querySelector("#news-source");
const newsEmptyEl = document.querySelector("#news-empty");

init();

async function init() {
  bindCarouselControls();

  try {
    const response = await fetch(NEWS_DATA_URL);
    if (!response.ok) {
      throw new Error(`Unable to load news data (${response.status})`);
    }

    state.data = await response.json();
    renderFilters();
    renderNews();
    startFeaturedRotation();
  } catch (error) {
    newsStatusEl.textContent = "News feed could not be loaded.";
    newsSourceEl.textContent = "Check that assets/data/news.json is published with the site.";
    newsEmptyEl.hidden = false;
    newsEmptyEl.querySelector("h3").textContent = "News unavailable";
    newsEmptyEl.querySelector("p").textContent = error.message;
  }
}

function bindCarouselControls() {
  prevButtonEl.addEventListener("click", () => moveFeatured(-1));
  nextButtonEl.addEventListener("click", () => moveFeatured(1));
}

function renderFilters() {
  const series = state.data.series || [];
  const filters = [
    { id: "all", label: "All" },
    ...series.map((item) => ({ id: item.id, label: item.name })),
  ];

  filtersEl.innerHTML = filters
    .map(
      (filter) => `<button class="filter-button ${filter.id === state.selectedSeries ? "active" : ""}" type="button" data-series="${escapeHtml(filter.id)}">${escapeHtml(filter.label)}</button>`
    )
    .join("");

  filtersEl.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSeries = button.dataset.series;
      state.featuredIndex = 0;
      renderFilters();
      renderNews();
      restartFeaturedRotation();
    });
  });
}

function renderNews() {
  const featuredArticles = getFilteredFeaturedArticles();
  const feedArticles = getFilteredFeedArticles();

  newsStatusEl.textContent = `${feedArticles.length} article ${feedArticles.length === 1 ? "link" : "links"} available${state.selectedSeries === "all" ? " across all series" : ` for ${getSeriesLabel(state.selectedSeries)}`}.`;
  newsSourceEl.textContent = buildSourceText(state.data.sources || []);
  newsEmptyEl.hidden = feedArticles.length !== 0;

  renderFeaturedCard(featuredArticles);
  renderArticleList(feedArticles);
}

function renderFeaturedCard(featuredArticles) {
  if (!featuredArticles.length) {
    featuredCardEl.innerHTML = `
      <div class="placeholder-image"><span>No feed</span></div>
      <div class="featured-body">
        <div class="featured-tags"><span class="tag-pill">No featured stories</span></div>
        <h2>No featured article is available for this filter yet.</h2>
        <p class="featured-meta">Switch back to All or wait for the next feed refresh.</p>
      </div>
    `;
    featuredDotsEl.innerHTML = "";
    return;
  }

  const article = featuredArticles[state.featuredIndex % featuredArticles.length];
  featuredCardEl.innerHTML = `
    <div class="placeholder-image"><span>${escapeHtml(article.seriesLabel)}</span></div>
    <div class="featured-body">
      <div class="featured-tags">
        <span class="tag-pill">${escapeHtml(article.source)}</span>
        <span class="tag-pill">${escapeHtml(article.seriesLabel)}</span>
      </div>
      <h2>${escapeHtml(article.title)}</h2>
      <p class="featured-meta">${escapeHtml(article.publishedLabel || "Latest coverage from the source feed.")}</p>
      <a class="featured-link" href="${escapeHtml(article.url)}" target="_blank" rel="noreferrer noopener">Open original article</a>
    </div>
  `;

  featuredDotsEl.innerHTML = featuredArticles
    .map(
      (_, index) => `<button class="featured-dot ${index === state.featuredIndex % featuredArticles.length ? "active" : ""}" type="button" data-index="${index}" aria-label="Show featured story ${index + 1}"></button>`
    )
    .join("");

  featuredDotsEl.querySelectorAll(".featured-dot").forEach((button) => {
    button.addEventListener("click", () => {
      state.featuredIndex = Number(button.dataset.index) || 0;
      renderFeaturedCard(featuredArticles);
      restartFeaturedRotation();
    });
  });
}

function renderArticleList(feedArticles) {
  newsListEl.innerHTML = feedArticles
    .map(
      (article) => `<article class="article-card">
        <div class="placeholder-image"><span>${escapeHtml(article.seriesLabel)}</span></div>
        <div class="article-card-body">
          <div class="article-card-tags">
            <span class="tag-pill">${escapeHtml(article.source)}</span>
            <span class="tag-pill">${escapeHtml(article.seriesLabel)}</span>
          </div>
          <h3>${escapeHtml(article.title)}</h3>
          <p class="article-card-source">${escapeHtml(article.publishedLabel || "External source")}</p>
          <a class="article-link" href="${escapeHtml(article.url)}" target="_blank" rel="noreferrer noopener">Read on source site</a>
        </div>
      </article>`
    )
    .join("");
}

function moveFeatured(direction) {
  const featuredArticles = getFilteredFeaturedArticles();
  if (!featuredArticles.length) {
    return;
  }

  const total = featuredArticles.length;
  state.featuredIndex = (state.featuredIndex + direction + total) % total;
  renderFeaturedCard(featuredArticles);
  restartFeaturedRotation();
}

function startFeaturedRotation() {
  clearFeaturedRotation();
  state.timerId = window.setInterval(() => {
    const featuredArticles = getFilteredFeaturedArticles();
    if (featuredArticles.length <= 1) {
      return;
    }

    state.featuredIndex = (state.featuredIndex + 1) % featuredArticles.length;
    renderFeaturedCard(featuredArticles);
  }, FEATURED_ROTATE_MS);
}

function restartFeaturedRotation() {
  startFeaturedRotation();
}

function clearFeaturedRotation() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
  }
}

function getFilteredFeaturedArticles() {
  const articles = state.data?.featured || [];
  return filterArticlesBySeries(articles);
}

function getFilteredFeedArticles() {
  const articles = state.data?.articles || [];
  return filterArticlesBySeries(articles);
}

function filterArticlesBySeries(articles) {
  if (state.selectedSeries === "all") {
    return articles;
  }

  return articles.filter((article) => article.series.includes(state.selectedSeries));
}

function getSeriesLabel(seriesId) {
  return state.data?.series?.find((item) => item.id === seriesId)?.name || "selected series";
}

function buildSourceText(sources) {
  if (!sources.length) {
    return "Source metadata unavailable.";
  }

  return `Sources: ${sources.map((source) => source.name).join(", ")}. Static JSON refresh workflow ready for automation.`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
