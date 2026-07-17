#!/usr/bin/env python3
"""Fetch news relevant to configured topics and write docs/data/news.json.

Run manually with `python3 scripts/fetch_news.py`, or on a schedule via the
`.github/workflows/update-news.yml` GitHub Action.
"""
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import quote

import requests

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "scripts" / "config.json"
OUTPUT_PATH = ROOT / "docs" / "data" / "news.json"

USER_AGENT = (
    "Mozilla/5.0 (compatible; NewsAggregatorBot/1.0; "
    "+https://github.com/isacsy/stock-market-analysis)"
)
REQUEST_TIMEOUT = 15
TAG_RE = re.compile(r"<[^>]+>")


def strip_html(text):
    if not text:
        return ""
    return re.sub(r"\s+", " ", TAG_RE.sub("", text)).strip()


def google_news_url(query):
    return (
        "https://news.google.com/rss/search?q="
        + quote(query)
        + "&hl=en-US&gl=US&ceid=US:en"
    )


def parse_date(raw):
    if not raw:
        return None
    raw = raw.strip()
    try:
        dt = parsedate_to_datetime(raw)
    except (TypeError, ValueError):
        try:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def parse_feed(xml_text):
    """Parse RSS 2.0 or Atom XML into a list of raw item dicts."""
    root = ET.fromstring(xml_text)
    items = []

    # RSS 2.0: <rss><channel><item>...
    channel = root.find("channel")
    if channel is not None:
        feed_title = strip_html((channel.findtext("title") or "").strip())
        for item in channel.findall("item"):
            source_el = item.find("source")
            source = source_el.text.strip() if source_el is not None and source_el.text else feed_title
            items.append(
                {
                    "title": strip_html(item.findtext("title")),
                    "link": (item.findtext("link") or "").strip(),
                    "published": parse_date(item.findtext("pubDate")),
                    "summary": strip_html(item.findtext("description")),
                    "source": source,
                }
            )
        return items

    # Atom: <feed><entry>...
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    entries = root.findall("atom:entry", ns)
    if entries:
        feed_title = strip_html((root.findtext("atom:title", namespaces=ns) or "").strip())
        for entry in entries:
            link_el = entry.find("atom:link", ns)
            link = link_el.get("href") if link_el is not None else ""
            published = entry.findtext("atom:published", namespaces=ns) or entry.findtext(
                "atom:updated", namespaces=ns
            )
            items.append(
                {
                    "title": strip_html(entry.findtext("atom:title", namespaces=ns)),
                    "link": (link or "").strip(),
                    "published": parse_date(published),
                    "summary": strip_html(entry.findtext("atom:summary", namespaces=ns)),
                    "source": feed_title,
                }
            )
    return items


def fetch_topic(topic):
    if topic["type"] == "google_news":
        url = google_news_url(topic["query"])
    else:
        url = topic["url"]

    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        raw_items = parse_feed(resp.content)
    except Exception as exc:  # noqa: BLE001 - one bad feed shouldn't kill the run
        print(f"[warn] failed to fetch topic {topic['name']!r} ({url}): {exc}", file=sys.stderr)
        return []

    items = []
    for raw in raw_items:
        if not raw["title"] or not raw["link"]:
            continue
        items.append({**raw, "topics": [topic["name"]]})
    return items


def item_key(item):
    normalized_title = re.sub(r"\W+", "", item["title"].lower())
    return hashlib.sha1((normalized_title or item["link"]).encode("utf-8")).hexdigest()


def main():
    config = json.loads(CONFIG_PATH.read_text())
    max_per_topic = config.get("max_items_per_topic", 12)
    max_age_days = config.get("max_item_age_days", 10)
    cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)

    merged = {}
    topic_names = []
    for topic in config["topics"]:
        if topic["name"] not in topic_names:
            topic_names.append(topic["name"])

        topic_items = fetch_topic(topic)
        topic_items = [i for i in topic_items if i["published"] and i["published"] >= cutoff]
        topic_items.sort(key=lambda i: i["published"], reverse=True)
        topic_items = topic_items[:max_per_topic]

        for item in topic_items:
            key = item_key(item)
            if key in merged:
                for t in item["topics"]:
                    if t not in merged[key]["topics"]:
                        merged[key]["topics"].append(t)
            else:
                merged[key] = item

    all_items = list(merged.values())
    all_items.sort(key=lambda i: i["published"], reverse=True)

    output_items = [
        {
            "title": i["title"],
            "link": i["link"],
            "source": i["source"] or "Unknown",
            "published": i["published"].isoformat(),
            "summary": i["summary"][:400],
            "topics": i["topics"],
        }
        for i in all_items
    ]

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "topics": topic_names,
        "count": len(output_items),
        "items": output_items,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"Wrote {len(output_items)} items to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
