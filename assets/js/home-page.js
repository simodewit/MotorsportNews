const HOME_SOURCES = {
  news: "assets/data/news.json",
  videos: "assets/data/videos.json",
  broadcasts: "assets/data/broadcasts.json",
  calendar: "assets/data/calendar.json",
};

const heroNextEventEl = document.querySelector("#hero-next-event");
const heroNextEventMetaEl = document.querySelector("#hero-next-event-meta");
const heroLiveCountEl = document.querySelector("#hero-live-count");
const heroLiveCountMetaEl = document.querySelector("#hero-live-count-meta");
const calendarPreviewEl = document.querySelector("#home-calendar-preview");
const newsPreviewEl = document.querySelector("#home-news-preview");
const videosPreviewEl = document.querySelector("#home-videos-preview");
const broadcastsPreviewEl = document.querySelector("#home-broadcasts-preview");

init();

async function init() {
  const [newsData, videosData, broadcastsData, calendarData] = await Promise.all([
    fetchJson(HOME_SOURCES.news),
    fetchJson(HOME_SOURCES.videos),
    fetchJson(HOME_SOURCES.broadcasts),
    fetchJson(HOME_SOURCES.calendar),
  ]);

  renderCalendarPreview(calendarData);
  renderNewsPreview(newsData);
  renderVideosPreview(videosData);
  renderBroadcastsPreview(broadcastsData);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load ${url}`);
  }
  return response.json();
}

function renderCalendarPreview(calendarData) {
  const upcoming = (calendarData.events || [])
    .map((event) => ({
      ...event,
      startDateObj: new Date(`${event.startDate}T00:00:00`),
      endDateObj: new Date(`${event.endDate}T00:00:00`),
    }))
    .filter((event) => event.endDateObj >= startOfDay(new Date()))
    .sort((left, right) => left.startDateObj - right.startDateObj)
    .slice(0, 3);

  if (!upcoming.length) {
    calendarPreviewEl.innerHTML = `<article class="calendar-preview-item"><h3>No upcoming events</h3><p>The agenda feed will populate here as new schedule data arrives.</p></article>`;
    heroNextEventEl.textContent = "No upcoming event";
    heroNextEventMetaEl.textContent = "Agenda preview unavailable";
    return;
  }

  const nextEvent = upcoming[0];
  heroNextEventEl.textContent = nextEvent.name;
  heroNextEventMetaEl.textContent = `${formatDateRange(nextEvent.startDateObj, nextEvent.endDateObj)} | ${nextEvent.venue}`;

  calendarPreviewEl.innerHTML = upcoming
    .map(
      (event) => `<article class="calendar-preview-item">
        <h3>${escapeHtml(event.name)}</h3>
        <p>${escapeHtml(event.venue)} | ${escapeHtml(formatDateRange(event.startDateObj, event.endDateObj))}</p>
        <div class="calendar-preview-tags">
          ${event.series.slice(0, 4).map((series) => `<span class="preview-tag">${escapeHtml(series.name)}</span>`).join("")}
        </div>
      </article>`
    )
    .join("");
}

function renderNewsPreview(newsData) {
  const items = (newsData.featured || newsData.articles || []).slice(0, 3);
  newsPreviewEl.innerHTML = items
    .map(
      (article) => `<article class="home-card">
        <div class="home-card-media"><span>${escapeHtml(article.seriesLabel)}</span></div>
        <div class="home-card-body">
          <div class="home-card-tags">
            <span class="preview-tag">${escapeHtml(article.source)}</span>
          </div>
          <h3>${escapeHtml(article.title)}</h3>
          <p class="home-card-meta">${escapeHtml(article.publishedLabel || "External source feed")}</p>
          <a class="home-card-link" href="${escapeHtml(article.url)}" target="_blank" rel="noreferrer noopener">Read article</a>
        </div>
      </article>`
    )
    .join("");
}

function renderVideosPreview(videosData) {
  const items = (videosData.videos || []).slice(0, 2);
  videosPreviewEl.innerHTML = items
    .map(
      (video) => `<article class="home-card">
        <div class="home-card-embed">
          <iframe
            src="https://www.youtube.com/embed/${escapeHtml(video.videoId)}"
            title="${escapeHtml(video.title)}"
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen>
          </iframe>
        </div>
        <div class="home-card-body">
          <div class="home-card-tags">
            ${video.seriesLabels.slice(0, 2).map((series) => `<span class="preview-tag">${escapeHtml(series)}</span>`).join("")}
          </div>
          <h3>${escapeHtml(video.title)}</h3>
          <p class="home-card-meta">${escapeHtml(video.channel)}</p>
          <a class="home-card-link" href="videos.html">Open video hub</a>
        </div>
      </article>`
    )
    .join("");
}

function renderBroadcastsPreview(broadcastsData) {
  const items = (broadcastsData.broadcasts || []).slice(0, 2);
  const liveCount = (broadcastsData.broadcasts || []).filter((item) => /live/i.test(item.statusLabel)).length;

  heroLiveCountEl.textContent = `${liveCount} live now`;
  heroLiveCountMetaEl.textContent = `${(broadcastsData.broadcasts || []).length} total broadcast entries available`;

  broadcastsPreviewEl.innerHTML = items
    .map((broadcast) => `<article class="home-card">
      <div class="home-card-body">
        <div class="home-card-tags">
          <span class="preview-tag">${escapeHtml(broadcast.platformLabel)}</span>
          <span class="preview-tag">${escapeHtml(broadcast.statusLabel)}</span>
          ${broadcast.seriesLabels.slice(0, 2).map((series) => `<span class="preview-tag">${escapeHtml(series)}</span>`).join("")}
        </div>
        <h3>${escapeHtml(broadcast.title)}</h3>
        <p class="home-card-meta">${escapeHtml(broadcast.channel)}</p>
        <a class="home-card-link" href="broadcasts.html">Open broadcasts</a>
      </div>
    </article>`)
    .join("");
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDateRange(start, end) {
  const left = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const right = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return left === right ? left : `${left} - ${right}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
