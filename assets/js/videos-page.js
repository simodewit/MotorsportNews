const VIDEOS_DATA_URL = "assets/data/videos.json";

const state = {
  data: null,
  selectedSeries: "all",
};

const filtersEl = document.querySelector("#videos-filters");
const videosGridEl = document.querySelector("#videos-grid");
const videosStatusEl = document.querySelector("#videos-status");
const videosSourceEl = document.querySelector("#videos-source");
const videosEmptyEl = document.querySelector("#videos-empty");

init();

async function init() {
  try {
    const response = await fetch(VIDEOS_DATA_URL);
    if (!response.ok) {
      throw new Error(`Unable to load videos data (${response.status})`);
    }

    state.data = await response.json();
    renderFilters();
    renderVideos();
  } catch (error) {
    videosStatusEl.textContent = "Video feed could not be loaded.";
    videosSourceEl.textContent = "Check that assets/data/videos.json is published with the site.";
    videosEmptyEl.hidden = false;
    videosEmptyEl.querySelector("h2").textContent = "Videos unavailable";
    videosEmptyEl.querySelector("p").textContent = error.message;
  }
}

function renderFilters() {
  const filters = [
    { id: "all", label: "All" },
    ...((state.data?.series || []).map((series) => ({ id: series.id, label: series.name }))),
  ];

  filtersEl.innerHTML = filters
    .map(
      (filter) => `<button class="video-filter ${filter.id === state.selectedSeries ? "active" : ""}" type="button" data-series="${escapeHtml(filter.id)}">${escapeHtml(filter.label)}</button>`
    )
    .join("");

  filtersEl.querySelectorAll(".video-filter").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSeries = button.dataset.series;
      renderFilters();
      renderVideos();
    });
  });
}

function renderVideos() {
  const videos = filterVideos(state.data?.videos || []);

  videosStatusEl.textContent = `${videos.length} embedded video ${videos.length === 1 ? "card" : "cards"} available${state.selectedSeries === "all" ? " across all series" : ` for ${getSeriesLabel(state.selectedSeries)}`}.`;
  videosSourceEl.textContent = buildSourceLabel(state.data?.sources || []);
  videosEmptyEl.hidden = videos.length !== 0;

  videosGridEl.innerHTML = videos
    .map(
      (video) => `<article class="video-card">
        <div class="video-embed">
          <iframe
            src="https://www.youtube.com/embed/${escapeHtml(video.videoId)}"
            title="${escapeHtml(video.title)}"
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen>
          </iframe>
        </div>
        <div class="video-card-body">
          <div class="video-tags">
            ${video.seriesLabels.map((series) => `<span class="video-tag">${escapeHtml(series)}</span>`).join("")}
          </div>
          <h2>${escapeHtml(video.title)}</h2>
          <p class="video-card-channel">${escapeHtml(video.channel)}</p>
        </div>
      </article>`
    )
    .join("");
}

function filterVideos(videos) {
  if (state.selectedSeries === "all") {
    return videos;
  }

  return videos.filter((video) => video.series.includes(state.selectedSeries));
}

function getSeriesLabel(seriesId) {
  return state.data?.series?.find((series) => series.id === seriesId)?.name || "selected series";
}

function buildSourceLabel(sources) {
  if (!sources.length) {
    return "Source metadata unavailable.";
  }

  return `Sources: ${sources.map((source) => source.name).join(", ")}. Static JSON workflow keeps the page GitHub Pages compatible.`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
