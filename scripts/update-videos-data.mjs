import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "assets", "data", "videos.json");

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

const CHANNEL_FEEDS = [
  {
    name: "FORMULA 1",
    channelId: "UCB_qr75-ydFVKSF9Dmo6izg",
    series: ["f1"],
    seriesLabels: ["Formula 1"]
  },
  {
    name: "MotoGP",
    channelId: "UC8pYaQzbBBXg9GIOHRvTmDQ",
    series: ["motogp"],
    seriesLabels: ["MotoGP"]
  },
  {
    name: "FIA World Endurance Championship",
    channelId: "UCwU7U7PiarcJKLjDJTnANjw",
    series: ["wec"],
    seriesLabels: ["WEC"]
  },
  {
    name: "NTT INDYCAR SERIES",
    channelId: "UCy1F61QvUUQXAXi2Voa_fUw",
    series: ["indycar"],
    seriesLabels: ["IndyCar"]
  },
  {
    name: "FIA World Rally Championship",
    channelId: "UC5G6kTnHXDz0WIBC2VGBOqg",
    series: ["rally"],
    seriesLabels: ["Rally"]
  },
  {
    name: "Red Bull Motorsports",
    channelId: "UC0mJA1lqKjB4Qaaa2PNf0zg",
    series: ["other"],
    seriesLabels: ["Other"]
  }
];

const STATIC_FALLBACK_VIDEOS = [
  {
    videoId: "mAe5mMx0LRc",
    title: "F2 Sprint Race Highlights | 2026 Australian Grand Prix",
    channel: "FORMULA 1",
    series: ["f2"],
    seriesLabels: ["Formula 2"]
  },
  {
    videoId: "c1165UCrQ_E",
    title: "F3 Feature Race Highlights | 2025 Austrian Grand Prix",
    channel: "FORMULA 1",
    series: ["f3"],
    seriesLabels: ["Formula 3"]
  }
];

const ITEMS_PER_FEED = 4;

async function main() {
  const feedVideos = await Promise.all(CHANNEL_FEEDS.map(fetchChannelFeed));
  const combinedVideos = dedupeVideos([...STATIC_FALLBACK_VIDEOS, ...feedVideos.flat()]);

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: [
      { name: "YouTube channel feeds", url: "https://www.youtube.com/feeds/videos.xml" }
    ],
    series: SERIES,
    videos: combinedVideos
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${combinedVideos.length} videos to ${outputPath}`);
}

async function fetchChannelFeed(feed) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${feed.channelId}`;
  const response = await fetch(url, {
    headers: { "user-agent": "MotorsportHub Videos Builder" }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${feed.name}: ${response.status}`);
  }

  const xml = await response.text();
  return extractEntries(xml).slice(0, ITEMS_PER_FEED).map((entry) => ({
    videoId: entry.videoId,
    title: entry.title || "Untitled video",
    channel: feed.name,
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

function dedupeVideos(videos) {
  const seen = new Set();
  return videos.filter((video) => {
    if (seen.has(video.videoId)) {
      return false;
    }
    seen.add(video.videoId);
    return true;
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
