import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "assets", "data", "calendar.json");

const SPORTS_DB_BASE = "https://www.thesportsdb.com/api/v1/json/123";

const SERIES_CONFIG = [
  { id: "f1", name: "Formula 1", shortName: "F1", leagueId: 4370, season: "2026" },
  { id: "f2", name: "Formula 2", shortName: "F2", leagueId: 4486, season: "2026" },
  { id: "f3", name: "Formula 3", shortName: "F3", leagueId: 4487, season: "2026" },
  { id: "motogp", name: "MotoGP", shortName: "MotoGP", leagueId: 4407, season: "2026" },
  { id: "indycar", name: "IndyCar", shortName: "IndyCar", leagueId: 4373, season: "2026" },
  { id: "wec", name: "WEC", shortName: "WEC", leagueId: 4413, season: "2026" }
];

async function main() {
  const allEvents = await Promise.all(SERIES_CONFIG.map(fetchSeriesSeason));
  const flattened = allEvents.flat();
  const groupedEvents = groupEvents(flattened);
  const startDate = findPreferredWindowStart(groupedEvents);

  const payload = {
    generatedAt: new Date().toISOString(),
    window: { startDate },
    sources: [
      {
        name: "TheSportsDB",
        type: "api",
        url: "https://www.thesportsdb.com/documentation"
      },
      {
        name: "OpenF1",
        type: "api",
        url: "https://openf1.org/",
        usage: "Optional enrichment source for future F1-specific session detail."
      }
    ],
    series: SERIES_CONFIG.map(({ id, name, shortName }) => ({ id, name, shortName })),
    events: groupedEvents
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`Wrote ${groupedEvents.length} grouped events to ${outputPath}`);
}

async function fetchSeriesSeason(series) {
  const url = `${SPORTS_DB_BASE}/eventsseason.php?id=${series.leagueId}&s=${encodeURIComponent(series.season)}`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "MotorsportHub Agenda Builder"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${series.name}: ${response.status}`);
  }

  const json = await response.json();
  const events = Array.isArray(json.events) ? json.events : [];

  return events.map((event) => normalizeSourceEvent(series, event)).filter(Boolean);
}

function normalizeSourceEvent(series, event) {
  const eventDate = event.dateEvent || event.strTimestamp?.slice(0, 10);
  if (!eventDate) {
    return null;
  }

  const normalizedVenue = normalizeVenue(event.strVenue || event.strCircuit || event.strEvent || "TBC");
  const groupedName = buildGroupedName(event.strEvent, normalizedVenue);
  const sessions = extractSessions(event.strEvent);

  return {
    venueKey: slugify(normalizedVenue),
    name: groupedName,
    venue: normalizedVenue,
    startDate: eventDate,
    endDate: eventDate,
    series: [
      {
        id: series.id,
        name: series.name,
        sessions
      }
    ]
  };
}

function groupEvents(events) {
  const grouped = [];
  const sorted = [...events].sort((left, right) => left.startDate.localeCompare(right.startDate));

  for (const event of sorted) {
    const existing = grouped.find((candidate) => {
      if (candidate.venueKey !== event.venueKey) {
        return false;
      }

      const eventStart = new Date(`${event.startDate}T00:00:00`);
      const candidateEnd = new Date(`${candidate.endDate}T00:00:00`);
      const dayGap = Math.abs((eventStart - candidateEnd) / (24 * 60 * 60 * 1000));
      return dayGap <= 4;
    });

    if (!existing) {
      grouped.push(structuredClone(event));
      continue;
    }

    existing.startDate = existing.startDate < event.startDate ? existing.startDate : event.startDate;
    existing.endDate = existing.endDate > event.endDate ? existing.endDate : event.endDate;

    if (event.name.length > existing.name.length) {
      existing.name = event.name;
    }

    const currentSeries = existing.series.find((series) => series.id === event.series[0].id);
    if (currentSeries) {
      currentSeries.sessions = unique([...currentSeries.sessions, ...event.series[0].sessions]);
    } else {
      existing.series.push(event.series[0]);
    }
  }

  return grouped
    .map((event) => ({
      id: `${slugify(event.name)}-${event.startDate}`,
      name: event.series.length > 1 ? `${event.venue} Weekend` : event.name,
      venue: event.venue,
      startDate: event.startDate,
      endDate: event.endDate,
      series: event.series.sort((left, right) => left.name.localeCompare(right.name))
    }))
    .sort((left, right) => left.startDate.localeCompare(right.startDate));
}

function extractSessions(eventName = "") {
  const lower = eventName.toLowerCase();
  const knownSessions = [
    ["free practice 1", "Practice 1"],
    ["free practice 2", "Practice 2"],
    ["free practice 3", "Practice 3"],
    ["practice 1", "Practice 1"],
    ["practice 2", "Practice 2"],
    ["practice 3", "Practice 3"],
    ["practice", "Practice"],
    ["qualifying", "Qualifying"],
    ["sprint qualifying", "Sprint Qualifying"],
    ["sprint shootout", "Sprint Shootout"],
    ["sprint", "Sprint"],
    ["warm-up", "Warm-Up"],
    ["warm up", "Warm-Up"],
    ["feature race", "Feature Race"],
    ["race", "Race"]
  ];

  const matches = knownSessions.filter(([pattern]) => lower.includes(pattern)).map(([, label]) => label);
  return matches.length ? unique(matches) : ["Race"];
}

function buildGroupedName(eventName = "", venue) {
  const stripped = eventName
    .replace(/\b(practice|qualifying|sprint shootout|sprint qualifying|sprint|feature race|race|warm-up|warm up)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (stripped && stripped.length >= 8) {
    return stripped;
  }

  return `${venue} Weekend`;
}

function normalizeVenue(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\bgrand prix\b/gi, "")
    .trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-");
}

function unique(values) {
  return [...new Set(values)];
}

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

function findPreferredWindowStart(events) {
  const today = currentDate();
  return events.find((event) => event.endDate >= today)?.startDate ?? events[0]?.startDate ?? today;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
