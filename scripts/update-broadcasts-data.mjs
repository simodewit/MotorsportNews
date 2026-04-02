import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "assets", "data", "broadcasts.json");

const SERIES = [
  { id: "f1", name: "Formula 1" },
  { id: "f2", name: "Formula 2" },
  { id: "f3", name: "Formula 3" },
  { id: "motogp", name: "MotoGP" },
  { id: "wec", name: "WEC" },
  { id: "indycar", name: "IndyCar" },
  { id: "rally", name: "Rally" },
  { id: "other", name: "Other" }
];

const YOUTUBE_FEEDS = [
  {
    name: "FORMULA 1",
    channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
    series: ["f1"],
    seriesLabels: ["Formula 1"],
    statusLabel: "Broadcast"
  },
  {
    name: "MotoGP",
    channelId: "UC8pYaQzbBBXg9GIOHRvTmDQ",
    series: ["motogp"],
    seriesLabels: ["MotoGP"],
    statusLabel: "Broadcast"
  },
  {
    name: "FIA World Endurance Championship",
    channelId: "UCwU7U7PiarcJKLjDJTnANjw",
    series: ["wec"],
    seriesLabels: ["WEC"],
    statusLabel: "Broadcast"
  },
  {
    name: "NTT INDYCAR SERIES",
    channelId: "UCy1F61QvUUQXAXi2Voa_fUw",
    series: ["indycar"],
    seriesLabels: ["IndyCar"],
    statusLabel: "Broadcast"
  },
  {
    name: "FIA World Rally Championship",
    channelId: "UC5G6kTnHXDz0WIBC2VGBOqg",
    series: ["rally"],
    seriesLabels: ["Rally"],
    statusLabel: "Broadcast"
  },
  {
    name: "Red Bull Motorsports",
    channelId: "UC0mJA1lqKjB4Qaaa2PNf0zg",
    series: ["other"],
    seriesLabels: ["Other"],
    statusLabel: "Broadcast"
  }
];

const TWITCH_CHANNELS = [
  {
    platform: "twitch",
    platformLabel: "Twitch",
    statusLabel: "Live channel",
    title: "iRacing official live hub",
    channel: "iracing",
    url: "https://www.twitch.tv/iracing",
    series: ["other"],
    seriesLabels: ["Other"],
    embedNote: "Twitch embeds depend on the current site hostname. If embedding is unavailable, open the channel directly."
  },
  {
    platform: "twitch",
    platformLabel: "Twitch",
    statusLabel: "Live channel",
    title: "RaceSpot broadcast channel",
    channel: "racespot",
    url: "https://www.twitch.tv/racespot",
    series: ["other"],
    seriesLabels: ["Other"],
    embedNote: "Twitch embeds depend on the current site hostname. If embedding is unavailable, open the channel directly."
  }
];

const ITEMS_PER_FEED = 8;

async function main() {
  const youtubeBroadcasts = await Promise.all(YOUTUBE_FEEDS.map(fetchChannelFeed));
  const broadcasts = dedupeBroadcasts([
    ...youtubeBroadcasts.flat(),
    ...TWITCH_CHANNELS
  ]);

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: [
      { name: "YouTube channel feeds", url: "https://www.youtube.com/feeds/videos.xml" },
      { name: "Curated Twitch channels", url: "https://www.twitch.tv/directory" }
    ],
    series: SERIES,
    broadcasts
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${broadcasts.length} broadcasts to ${outputPath}`);
}

async function fetchChannelFeed(feed) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${feed.channelId}`;
  const response = await fetch(url, {
    headers: { "user-agent": "MotorsportHub Broadcasts Builder" }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${feed.name}: ${response.status}`);
  }

  const xml = await response.text();
  const entries = extractEntries(xml).slice(0, ITEMS_PER_FEED);
  const verifiedEntries = await Promise.all(entries.map((entry) => verifyYouTubeBroadcast(entry)));

  return verifiedEntries
    .filter((entry) => entry?.statusLabel)
    .map((entry) => ({
      platform: "youtube",
      platformLabel: "YouTube",
      statusLabel: entry.statusLabel,
      title: entry.title || "Untitled broadcast",
      channel: feed.name,
      videoId: entry.videoId,
      url: `https://www.youtube.com/watch?v=${entry.videoId}`,
      series: feed.series,
      seriesLabels: feed.seriesLabels
    }));
}

function extractEntries(xml) {
  const matches = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];
  return matches
    .map((match) => {
      const entryXml = match[1];
      return {
        videoId: extractTag(entryXml, "yt:videoId"),
        title: decodeXml(extractTag(entryXml, "title"))
      };
    })
    .filter((entry) => entry.videoId);
}

function extractTag(xml, tagName) {
  const escapedTag = tagName.replace(":", "\\:");
  const match = xml.match(new RegExp(`<${escapedTag}>([\\s\\S]*?)<\\/${escapedTag}>`, "i"));
  return match?.[1]?.trim() || "";
}

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function dedupeBroadcasts(broadcasts) {
  const seen = new Set();
  return broadcasts.filter((broadcast) => {
    const key = broadcast.videoId || `${broadcast.platform}:${broadcast.channel}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function verifyYouTubeBroadcast(entry) {
  const response = await fetch(`https://www.youtube.com/watch?v=${entry.videoId}`, {
    headers: { "user-agent": "Mozilla/5.0" }
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  if (/"isLiveContent":true/.test(html)) {
    return { ...entry, statusLabel: "Live now" };
  }

  if (/"isUpcoming":true/.test(html) || /"upcomingEventData":\{/.test(html)) {
    return { ...entry, statusLabel: "Upcoming" };
  }

  return null;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
