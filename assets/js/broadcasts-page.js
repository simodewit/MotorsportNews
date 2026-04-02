const BROADCASTS_DATA_URL = "assets/data/broadcasts.json";

const state = {
  data: null,
  selectedSeries: "all",
};

const filtersEl = document.querySelector("#broadcasts-filters");
const gridEl = document.querySelector("#broadcasts-grid");
const statusEl = document.querySelector("#broadcasts-status");
const sourceEl = document.querySelector("#broadcasts-source");
const emptyEl = document.querySelector("#broadcasts-empty");

init();

async function init() {
  try {
    const response = await fetch(BROADCASTS_DATA_URL);
    if (!response.ok) {
      throw new Error(`Unable to load broadcasts data (${response.status})`);
    }

    state.data = await response.json();
    renderFilters();
    renderBroadcasts();
  } catch (error) {
    statusEl.textContent = "Broadcast feed could not be loaded.";
    sourceEl.textContent = "Check that assets/data/broadcasts.json is published with the site.";
    emptyEl.hidden = false;
    emptyEl.querySelector("h2").textContent = "Broadcasts unavailable";
    emptyEl.querySelector("p").textContent = error.message;
  }
}

function renderFilters() {
  const filters = [
    { id: "all", label: "All" },
    ...((state.data?.series || []).map((series) => ({ id: series.id, label: series.name }))),
  ];

  filtersEl.innerHTML = filters
    .map(
      (filter) => `<button class="broadcast-filter ${filter.id === state.selectedSeries ? "active" : ""}" type="button" data-series="${escapeHtml(filter.id)}">${escapeHtml(filter.label)}</button>`
    )
    .join("");

  filtersEl.querySelectorAll(".broadcast-filter").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSeries = button.dataset.series;
      renderFilters();
      renderBroadcasts();
    });
  });
}

function renderBroadcasts() {
  const broadcasts = filterBroadcasts(state.data?.broadcasts || []);

  statusEl.textContent = `${broadcasts.length} broadcast ${broadcasts.length === 1 ? "entry" : "entries"} available${state.selectedSeries === "all" ? " across all series" : ` for ${getSeriesLabel(state.selectedSeries)}`}.`;
  sourceEl.textContent = buildSourceLabel(state.data?.sources || []);
  emptyEl.hidden = broadcasts.length !== 0;

  gridEl.innerHTML = broadcasts.map(renderBroadcastCard).join("");
}

function renderBroadcastCard(broadcast) {
  const embedMarkup = renderEmbed(broadcast);
  const tagsMarkup = broadcast.seriesLabels
    .map((series) => `<span class="broadcast-tag">${escapeHtml(series)}</span>`)
    .join("");

  return `<article class="${embedMarkup ? "broadcast-card" : "broadcast-empty-card"}">
    ${embedMarkup || ""}
    <div class="broadcast-card-body">
      <div class="broadcast-meta-row">
        <span class="platform-badge">${escapeHtml(broadcast.platformLabel)}</span>
        <span class="status-badge">${escapeHtml(broadcast.statusLabel)}</span>
      </div>
      <div class="broadcast-tags">${tagsMarkup}</div>
      <h2>${escapeHtml(broadcast.title)}</h2>
      <p class="broadcast-card-source">${escapeHtml(broadcast.channel)}</p>
      ${!embedMarkup ? `<p>${escapeHtml(broadcast.embedNote || "This broadcast opens on the source platform.")}</p>` : ""}
      <a class="broadcast-link" href="${escapeHtml(broadcast.url)}" target="_blank" rel="noreferrer noopener">Open on ${escapeHtml(broadcast.platformLabel)}</a>
    </div>
  </article>`;
}

function renderEmbed(broadcast) {
  if (broadcast.platform === "youtube" && broadcast.videoId) {
    return `<div class="broadcast-embed">
      <iframe
        src="https://www.youtube.com/embed/${escapeHtml(broadcast.videoId)}"
        title="${escapeHtml(broadcast.title)}"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen>
      </iframe>
    </div>`;
  }

  if (broadcast.platform === "twitch" && broadcast.channel && canEmbedTwitch()) {
    const parent = encodeURIComponent(window.location.hostname);
    return `<div class="broadcast-embed">
      <iframe
        src="https://player.twitch.tv/?channel=${encodeURIComponent(broadcast.channel)}&parent=${parent}&muted=true"
        title="${escapeHtml(broadcast.title)}"
        loading="lazy"
        allowfullscreen>
      </iframe>
    </div>`;
  }

  return "";
}

function canEmbedTwitch() {
  return Boolean(window.location.hostname);
}

function filterBroadcasts(broadcasts) {
  if (state.selectedSeries === "all") {
    return broadcasts;
  }

  return broadcasts.filter((broadcast) => broadcast.series.includes(state.selectedSeries));
}

function getSeriesLabel(seriesId) {
  return state.data?.series?.find((series) => series.id === seriesId)?.name || "selected series";
}

function buildSourceLabel(sources) {
  if (!sources.length) {
    return "Source metadata unavailable.";
  }

  return `Sources: ${sources.map((source) => source.name).join(", ")}. YouTube embeds and Twitch-aware fallback cards keep the page GitHub Pages compatible.`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
