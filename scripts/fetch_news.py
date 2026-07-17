#!/usr/bin/env python3
"""Fetch news relevant to configured topics and write docs/data/news.json.

Groups stories into sections (Work, Technology, Finance, Education, Projects,
Personal Interests, ...), tags each with which topic(s) matched, generates a
rule-based summary/key-points/"why recommended" note, scores importance, and
writes a templated Daily Brief of the top stories.

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
SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")


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
        items.append(raw)
    return items


def item_key(item):
    normalized_title = re.sub(r"\W+", "", item["title"].lower())
    return hashlib.sha1((normalized_title or item["link"]).encode("utf-8")).hexdigest()


def is_blocked(item, blocklist):
    if not blocklist:
        return False
    haystack = (item["title"] + " " + item["summary"]).lower()
    return any(term.lower() in haystack for term in blocklist)


def key_points(summary, max_points=2):
    if not summary:
        return []
    sentences = [s.strip() for s in SENTENCE_RE.split(summary) if s.strip()]
    return sentences[:max_points]


def why_recommended(topic_names):
    if len(topic_names) == 1:
        return f"Matched your \"{topic_names[0]}\" topic."
    joined = ", ".join(f'"{t}"' for t in topic_names)
    return f"Matched multiple topics you follow: {joined}."


def score_importance(item, topic_names):
    now = datetime.now(timezone.utc)
    age_hours = (now - item["published"]).total_seconds() / 3600
    score = 0
    score += 2 * (len(topic_names) - 1)  # cross-topic corroboration
    if age_hours <= 3:
        score += 2
    elif age_hours <= 24:
        score += 1
    if score >= 3:
        return "High"
    if score >= 1:
        return "Medium"
    return "Low"


def build_daily_brief(items, section_of):
    if not items:
        return "No stories yet — the first scheduled scan hasn't run."
    ranked = sorted(
        items,
        key=lambda i: ({"High": 2, "Medium": 1, "Low": 0}[i["importance"]], i["published"]),
        reverse=True,
    )
    top = ranked[:5]
    bullets = [f"{i['title']} ({', '.join(i['sections'])})" for i in top]
    return "Top stories right now: " + " | ".join(bullets)


def main():
    config = json.loads(CONFIG_PATH.read_text())
    max_per_topic = config.get("max_items_per_topic", 12)
    max_age_days = config.get("max_item_age_days", 10)
    blocklist = config.get("blocklist", [])
    cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)

    merged = {}
    section_names = []

    for section in config["sections"]:
        section_name = section["name"]
        if section_name not in section_names:
            section_names.append(section_name)

        for topic in section["topics"]:
            topic_items = fetch_topic(topic)
            topic_items = [
                i for i in topic_items
                if i["published"] and i["published"] >= cutoff and not is_blocked(i, blocklist)
            ]
            topic_items.sort(key=lambda i: i["published"], reverse=True)
            topic_items = topic_items[:max_per_topic]

            for item in topic_items:
                key = item_key(item)
                if key in merged:
                    existing = merged[key]
                    if topic["name"] not in existing["topics"]:
                        existing["topics"].append(topic["name"])
                    if section_name not in existing["sections"]:
                        existing["sections"].append(section_name)
                else:
                    merged[key] = {**item, "topics": [topic["name"]], "sections": [section_name]}

    all_items = list(merged.values())
    all_items.sort(key=lambda i: i["published"], reverse=True)

    output_items = []
    for i in all_items:
        importance = score_importance(i, i["topics"])
        output_items.append(
            {
                "title": i["title"],
                "link": i["link"],
                "source": i["source"] or "Unknown",
                "published": i["published"].isoformat(),
                "summary": i["summary"][:400],
                "key_points": key_points(i["summary"]),
                "why_recommended": why_recommended(i["topics"]),
                "importance": importance,
                "topics": i["topics"],
                "sections": i["sections"],
            }
        )

    daily_brief = build_daily_brief(
        [{**oi, "published": datetime.fromisoformat(oi["published"])} for oi in output_items],
        section_of=None,
    )

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sections": section_names,
        "daily_brief": daily_brief,
        "count": len(output_items),
        "items": output_items,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"Wrote {len(output_items)} items to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
