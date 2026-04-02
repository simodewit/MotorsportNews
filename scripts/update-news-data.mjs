import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "assets", "data", "news.json");

const FEEDS = [
  {
    source: "Motorsport.com RSS",
    url: "https://www.motorsport.com/rss/f1/news/",
    series: ["f1"],
    seriesLabel: "Formula 1",
    linkIncludes: ["/f1/"]
  },
  {
    source: "Motorsport.com RSS",
    url: "https://www.motorsport.com/rss/fia-f2/news/",
    series: ["f2"],
    seriesLabel: "Formula 2",
    linkIncludes: ["/fia-f2/"]
  },
  {
    source: "Motorsport.com RSS",
    url: "https://www.motorsport.com/rss/fia-f3/news/",
    series: ["f3"],
    seriesLabel: "Formula 3",
    linkIncludes: ["/fia-f3/", "/f3/"]
  },
  {
    source: "Motorsport.com RSS",
    url: "https://www.motorsport.com/rss/motogp/news/",
    series: ["motogp"],
    seriesLabel: "MotoGP",
    linkIncludes: ["/motogp/"]
  },
  {
    source: "Motorsport.com RSS",
    url: "https://www.motorsport.com/rss/indycar/news/",
    series: ["indycar"],
    seriesLabel: "IndyCar",
    linkIncludes: ["/indycar/"]
  },
  {
    source: "Motorsport.com RSS",
    url: "https://www.motorsport.com/rss/wec/news/",
    series: ["wec"],
    seriesLabel: "WEC",
    linkIncludes: ["/wec/"]
  },
  {
    source: "Autosport RSS",
    url: "https://www.autosport.com/rss/f1/news/",
    series: ["f1"],
    seriesLabel: "Formula 1",
    linkIncludes: ["/f1/news/"]
  },
  {
    source: "Autosport RSS",
    url: "https://www.autosport.com/rss/motogp/news/",
    series: ["motogp"],
    seriesLabel: "MotoGP",
    linkIncludes: ["/motogp/news/"]
  },
  {
    source: "Autosport RSS",
    url: "https://www.autosport.com/rss/wec/news/",
    series: ["wec"],
    seriesLabel: "WEC",
    linkIncludes: ["/wec/news/"]
  }
];
const ITEMS_PER_FEED = 4;

const STATIC_SERIES = [
  { id: "f1", name: "Formula 1" },
  { id: "f2", name: "Formula 2" },
  { id: "f3", name: "Formula 3" },
  { id: "motogp", name: "MotoGP" },
  { id: "wec", name: "WEC" },
  { id: "indycar", name: "IndyCar" },
  { id: "other", name: "Other" }
];

async function main() {
  const fetched = await Promise.all(FEEDS.map(fetchFeed));
  const articles = dedupeArticles(fetched.flat()).slice(0, 24);

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: [
      { name: "Motorsport.com RSS", url: "https://www.motorsport.com/rss/" },
      { name: "Autosport RSS", url: "https://www.autosport.com/rss/" }
    ],
    series: STATIC_SERIES,
    featured: pickFeaturedArticles(articles),
    articles
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${articles.length} articles to ${outputPath}`);
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: { "user-agent": "MotorsportHub News Builder" }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${feed.url}: ${response.status}`);
  }

  const xml = await response.text();
  return extractItems(xml)
    .filter((item) => isRelevantItem(item, feed))
    .slice(0, ITEMS_PER_FEED)
    .map((item, index) => ({
      id: `${slugify(item.title || `${feed.seriesLabel}-${index}`)}-${index}`,
      title: item.title || "Untitled article",
      source: feed.source,
      url: item.link || feed.url,
      series: feed.series,
      seriesLabel: feed.seriesLabel,
      publishedLabel: item.pubDate ? new Date(item.pubDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "External source feed"
    }));
}

function extractItems(xml) {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)];
  return itemMatches.map((match) => {
    const itemXml = match[0];
    return {
      title: decodeXml(extractTag(itemXml, "title")),
      link: decodeXml(extractTag(itemXml, "link")),
      pubDate: decodeXml(extractTag(itemXml, "pubDate"))
    };
  });
}

function extractTag(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1]?.trim() || "";
}

function isRelevantItem(item, feed) {
  if (!feed.linkIncludes?.length) {
    return true;
  }

  return feed.linkIncludes.some((fragment) => item.link?.includes(fragment));
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

function dedupeArticles(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    const key = article.url;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function pickFeaturedArticles(articles) {
  const featured = [];
  const seenSeries = new Set();

  for (const article of articles) {
    const key = article.series.join(",");
    if (seenSeries.has(key)) {
      continue;
    }

    featured.push(article);
    seenSeries.add(key);

    if (featured.length === 4) {
      break;
    }
  }

  return featured.length ? featured : articles.slice(0, 4);
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
