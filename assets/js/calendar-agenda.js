const DATA_URL = "assets/data/calendar.json";
const DAY_MS = 24 * 60 * 60 * 1000;
const VISIBLE_DAY_SPAN = 28;
const SERIES_COLUMN_WIDTH = 220;
const DATE_COLUMN_MIN_WIDTH = 132;
const HEADER_ROW_HEIGHT = 92;
const SERIES_ROW_HEIGHT = 104;

const state = {
  data: null,
};

const gridEl = document.querySelector("#agenda-grid");
const sourceEl = document.querySelector("#agenda-source");
const statusEl = document.querySelector("#agenda-status");
const emptyEl = document.querySelector("#agenda-empty");

init();

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Unable to load schedule data (${response.status})`);
    }

    state.data = await response.json();
    render();
  } catch (error) {
    statusEl.textContent = "Schedule data could not be loaded.";
    sourceEl.textContent = "Check that assets/data/calendar.json is published with the site.";
    emptyEl.hidden = false;
    emptyEl.querySelector("h3").textContent = "Calendar unavailable";
    emptyEl.querySelector("p").textContent = error.message;
  }
}

function render() {
  if (!state.data) {
    return;
  }

  const visibleSeries = state.data.series || [];
  const visibleDates = getVisibleDates();
  const visibleEvents = getVisibleEvents(visibleSeries, visibleDates);
  const eventCountBySeries = buildSeriesCounts(visibleSeries, visibleEvents);

  statusEl.textContent = `${visibleEvents.length} scheduled event ${visibleEvents.length === 1 ? "entry" : "entries"} across the next ${visibleDates.length} days.`;
  sourceEl.textContent = buildSourceLabel(state.data.sources || []);

  gridEl.innerHTML = "";
  emptyEl.hidden = visibleEvents.length !== 0;

  if (!visibleSeries.length || !visibleDates.length) {
    emptyEl.hidden = false;
    return;
  }

  gridEl.style.gridTemplateColumns = `${SERIES_COLUMN_WIDTH}px repeat(${visibleDates.length}, minmax(${DATE_COLUMN_MIN_WIDTH}px, 1fr))`;
  gridEl.style.gridTemplateRows = `${HEADER_ROW_HEIGHT}px repeat(${visibleSeries.length}, minmax(${SERIES_ROW_HEIGHT}px, auto))`;

  renderHeaders(visibleDates, visibleSeries, eventCountBySeries);
  renderBackgroundCells(visibleDates, visibleSeries);
  renderSeriesEvents(visibleEvents, visibleDates, visibleSeries);
}

function renderHeaders(visibleDates, visibleSeries, eventCountBySeries) {
  gridEl.insertAdjacentHTML(
    "beforeend",
    `<div class="agenda-corner" style="grid-column:1;grid-row:1;"><strong>Racing series</strong><span>4-week planner</span></div>`
  );

  visibleDates.forEach((date, index) => {
    const isToday = isSameDay(date, new Date());
    gridEl.insertAdjacentHTML(
      "beforeend",
      `<div class="agenda-date ${isToday ? "today" : ""}" style="grid-column:${index + 2};grid-row:1;">
        <strong>${formatDayLabel(date)}</strong>
        <span>${formatShortDate(date)}</span>
        <small>${formatMonthLabel(date)}</small>
      </div>`
    );
  });

  visibleSeries.forEach((series, index) => {
    gridEl.insertAdjacentHTML(
      "beforeend",
      `<div class="agenda-series" style="grid-column:1;grid-row:${index + 2};">
        <strong>${escapeHtml(series.name)}</strong>
        <span>${series.shortName ? escapeHtml(series.shortName) : "Series"}</span>
        <span class="agenda-series-count">${eventCountBySeries.get(series.id) || 0} events</span>
      </div>`
    );
  });
}

function renderBackgroundCells(visibleDates, visibleSeries) {
  visibleSeries.forEach((series, rowIndex) => {
    visibleDates.forEach((date, columnIndex) => {
      const isToday = isSameDay(date, new Date());
      const isWeekend = [0, 6].includes(date.getDay());
      gridEl.insertAdjacentHTML(
        "beforeend",
        `<div class="agenda-cell ${isToday ? "today" : ""} ${isWeekend ? "weekend" : ""}" style="grid-column:${columnIndex + 2};grid-row:${rowIndex + 2};" aria-hidden="true"></div>`
      );
    });
  });
}

function renderSeriesEvents(visibleEvents, visibleDates, visibleSeries) {
  const seriesIndexById = new Map(visibleSeries.map((series, index) => [series.id, index]));
  const startBoundary = visibleDates[0];

  visibleEvents.forEach((event) => {
    const startIndex = clamp(differenceInDays(startBoundary, event.startDate), 0, visibleDates.length - 1);
    const endIndex = clamp(differenceInDays(startBoundary, event.endDate), 0, visibleDates.length - 1);
    const columnStart = startIndex + 2;
    const columnSpan = Math.max(1, endIndex - startIndex + 1);

    event.series
      .map((series) => ({ ...series, shortName: findShortName(visibleSeries, series.id) }))
      .sort((left, right) => seriesIndexById.get(left.id) - seriesIndexById.get(right.id))
      .forEach((series) => {
        const rowIndex = seriesIndexById.get(series.id);
        if (!Number.isInteger(rowIndex)) {
          return;
        }

        gridEl.insertAdjacentHTML(
          "beforeend",
          `<article class="agenda-event" style="grid-column:${columnStart} / span ${columnSpan};grid-row:${rowIndex + 2};">
            <h4>${escapeHtml(event.name)}</h4>
            <div class="session-pills">${series.sessions
              .map((session) => {
                const details = formatSession(session);
                return `<span class="session-pill"><strong>${escapeHtml(details.name)}</strong><em>${escapeHtml(details.time)}</em></span>`;
              })
              .join("")}</div>
          </article>`
        );
      });
  });
}

function getVisibleDates() {
  const start = getAgendaStartDate();

  return Array.from({ length: VISIBLE_DAY_SPAN }, (_, index) => {
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

function buildSeriesCounts(visibleSeries, visibleEvents) {
  const counts = new Map(visibleSeries.map((series) => [series.id, 0]));

  visibleEvents.forEach((event) => {
    event.series.forEach((series) => {
      counts.set(series.id, (counts.get(series.id) || 0) + 1);
    });
  });

  return counts;
}

function findShortName(seriesList, seriesId) {
  return seriesList.find((series) => series.id === seriesId)?.shortName || "";
}

function formatSession(session) {
  if (typeof session === "object" && session !== null) {
    const name = session.name || session.label || "Session";
    const start = session.startTime || session.start || "TBC";
    const end = session.endTime || session.end || "TBC";
    return { name, time: `${start} - ${end}` };
  }

  return {
    name: String(session),
    time: "TBC - TBC",
  };
}

function buildSourceLabel(sources) {
  if (!sources.length) {
    return "Source metadata unavailable.";
  }

  const labels = sources.map((source) => source.name);
  return `Data pipeline: ${labels.join(", ")}. Fixed 4-week view.`;
}

function formatDayLabel(date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function formatShortDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonthLabel(date) {
  return date.toLocaleDateString("en-US", { month: "long" });
}

function differenceInDays(start, end) {
  return Math.round((startOfDay(end) - startOfDay(start)) / DAY_MS);
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(left, right) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
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
