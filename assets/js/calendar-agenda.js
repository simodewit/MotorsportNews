const DATA_URL = "assets/data/calendar.json";
const DAY_MS = 24 * 60 * 60 * 1000;

const state = {
  view: "week",
  series: "all",
  data: null,
};

const gridEl = document.querySelector("#agenda-grid");
const sourceEl = document.querySelector("#agenda-source");
const statusEl = document.querySelector("#agenda-status");
const emptyEl = document.querySelector("#agenda-empty");
const filterEl = document.querySelector("#series-filter");
const viewButtons = Array.from(document.querySelectorAll(".view-button"));

init();

async function init() {
  bindControls();

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Unable to load schedule data (${response.status})`);
    }

    state.data = await response.json();
    hydrateFilter(state.data.series);
    render();
  } catch (error) {
    statusEl.textContent = "Schedule data could not be loaded.";
    sourceEl.textContent = "Check that assets/data/calendar.json is published with the site.";
    emptyEl.hidden = false;
    emptyEl.querySelector("h3").textContent = "Calendar unavailable";
    emptyEl.querySelector("p").textContent = error.message;
  }
}

function bindControls() {
  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      viewButtons.forEach((candidate) => {
        candidate.classList.toggle("active", candidate === button);
      });
      render();
    });
  });

  filterEl.addEventListener("change", () => {
    state.series = filterEl.value;
    render();
  });
}

function hydrateFilter(seriesList = []) {
  const options = [
    `<option value="all">All series</option>`,
    ...seriesList.map((series) => `<option value="${escapeHtml(series.id)}">${escapeHtml(series.name)}</option>`),
  ];

  filterEl.innerHTML = options.join("");
}

function render() {
  if (!state.data) {
    return;
  }

  const visibleSeries = getVisibleSeries();
  const visibleDates = getVisibleDates();
  const visibleEvents = getVisibleEvents(visibleSeries, visibleDates);

  statusEl.textContent = `${visibleEvents.length} grouped event ${visibleEvents.length === 1 ? "node" : "nodes"} across ${visibleDates.length} days and ${visibleSeries.length} series.`;
  sourceEl.textContent = buildSourceLabel(state.data.sources || []);

  gridEl.innerHTML = "";
  emptyEl.hidden = visibleEvents.length !== 0;

  if (!visibleSeries.length || !visibleDates.length) {
    emptyEl.hidden = false;
    return;
  }

  gridEl.style.gridTemplateColumns = `220px repeat(${visibleDates.length}, minmax(148px, 1fr))`;
  gridEl.style.gridTemplateRows = `88px repeat(${visibleSeries.length}, minmax(112px, auto))`;

  renderHeaders(visibleDates, visibleSeries);
  renderBackgroundCells(visibleDates, visibleSeries);
  renderEvents(visibleEvents, visibleDates, visibleSeries);
}

function renderHeaders(visibleDates, visibleSeries) {
  gridEl.insertAdjacentHTML(
    "beforeend",
    `<div class="agenda-corner" style="grid-column:1;grid-row:1;"><strong>Series</strong><span>Dates</span></div>`
  );

  visibleDates.forEach((date, index) => {
    gridEl.insertAdjacentHTML(
      "beforeend",
      `<div class="agenda-date" style="grid-column:${index + 2};grid-row:1;">
        <strong>${formatDayLabel(date)}</strong>
        <span>${formatShortDate(date)}</span>
      </div>`
    );
  });

  visibleSeries.forEach((series, index) => {
    gridEl.insertAdjacentHTML(
      "beforeend",
      `<div class="agenda-series" style="grid-column:1;grid-row:${index + 2};">
        <strong>${escapeHtml(series.name)}</strong>
        <span>${series.shortName ? escapeHtml(series.shortName) : "Series"}</span>
      </div>`
    );
  });
}

function renderBackgroundCells(visibleDates, visibleSeries) {
  visibleSeries.forEach((series, rowIndex) => {
    visibleDates.forEach((date, columnIndex) => {
      gridEl.insertAdjacentHTML(
        "beforeend",
        `<div class="agenda-cell" style="grid-column:${columnIndex + 2};grid-row:${rowIndex + 2};" aria-hidden="true"></div>`
      );
    });
  });
}

function renderEvents(visibleEvents, visibleDates, visibleSeries) {
  const seriesIndexById = new Map(visibleSeries.map((series, index) => [series.id, index]));
  const startBoundary = visibleDates[0];

  visibleEvents.forEach((event) => {
    const participatingRows = event.series
      .map((series) => seriesIndexById.get(series.id))
      .filter((value) => Number.isInteger(value))
      .sort((a, b) => a - b);

    if (!participatingRows.length) {
      return;
    }

    const startIndex = clamp(
      differenceInDays(startBoundary, event.startDate),
      0,
      visibleDates.length - 1
    );
    const endIndex = clamp(
      differenceInDays(startBoundary, event.endDate),
      0,
      visibleDates.length - 1
    );

    const rowStart = participatingRows[0] + 2;
    const rowSpan = participatingRows[participatingRows.length - 1] - participatingRows[0] + 1;
    const columnStart = startIndex + 2;
    const columnSpan = Math.max(1, endIndex - startIndex + 1);

    gridEl.insertAdjacentHTML(
      "beforeend",
      `<article class="agenda-event" style="grid-column:${columnStart} / span ${columnSpan};grid-row:${rowStart} / span ${rowSpan};">
        <h3>${escapeHtml(event.name)}</h3>
        <p class="agenda-event-meta">${escapeHtml(event.venue)} • ${formatRange(event.startDate, event.endDate)}</p>
        <div class="agenda-event-series">${event.series
          .map((series) => `<span class="series-pill">${escapeHtml(series.name)}</span>`)
          .join("")}</div>
        <div class="agenda-event-session-groups">${event.series
          .map(
            (series) => `<section class="session-group">
              <strong>${escapeHtml(series.name)}</strong>
              <div class="session-pills">${series.sessions
                .map((session) => `<span class="session-pill">${escapeHtml(session)}</span>`)
                .join("")}</div>
            </section>`
          )
          .join("")}</div>
      </article>`
    );
  });
}

function getVisibleSeries() {
  const seriesList = state.data.series || [];
  if (state.series === "all") {
    return seriesList;
  }
  return seriesList.filter((series) => series.id === state.series);
}

function getVisibleDates() {
  const span = state.view === "month" ? 28 : 14;
  const start = getAgendaStartDate();

  return Array.from({ length: span }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getAgendaStartDate() {
  const today = startOfDay(new Date());
  const events = (state.data.events || [])
    .map((event) => ({
      startDate: new Date(`${event.startDate}T00:00:00`),
      endDate: new Date(`${event.endDate}T00:00:00`)
    }))
    .sort((left, right) => left.startDate - right.startDate);

  const nextUpcoming = events.find((event) => event.endDate >= today);
  const referenceDate = nextUpcoming?.startDate
    || (state.data.window?.startDate ? new Date(`${state.data.window.startDate}T00:00:00`) : null)
    || events[0]?.startDate
    || today;

  const start = new Date(referenceDate);
  start.setDate(start.getDate() - 4);
  return startOfDay(start);
}

function getVisibleEvents(visibleSeries, visibleDates) {
  const allowedSeriesIds = new Set(visibleSeries.map((series) => series.id));
  const start = visibleDates[0];
  const end = visibleDates[visibleDates.length - 1];

  return (state.data.events || [])
    .map((event) => ({
      ...event,
      startDate: new Date(`${event.startDate}T00:00:00`),
      endDate: new Date(`${event.endDate}T00:00:00`),
      series: event.series.filter((series) => allowedSeriesIds.has(series.id)),
    }))
    .filter((event) => event.series.length > 0)
    .filter((event) => event.endDate >= start && event.startDate <= end)
    .sort((left, right) => left.startDate - right.startDate);
}

function buildSourceLabel(sources) {
  if (!sources.length) {
    return "Source metadata unavailable.";
  }

  const labels = sources.map((source) => source.name);
  return `Data pipeline: ${labels.join(", ")}.`;
}

function formatDayLabel(date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function formatShortDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRange(start, end) {
  if (start.toDateString() === end.toDateString()) {
    return formatShortDate(start);
  }

  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function differenceInDays(start, end) {
  return Math.round((startOfDay(end) - startOfDay(start)) / DAY_MS);
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
