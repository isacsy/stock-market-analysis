#!/usr/bin/env python3
"""Sync course materials from WBLE into a locally organized notes folder.

Usage:
    python sync.py             # log in (or reuse cached session) and sync
    python sync.py --dry-run   # just list what would be downloaded
"""
import argparse
import pathlib

from playwright.sync_api import sync_playwright

from wble_sync.config import load_config
from wble_sync.login import ensure_logged_in
from wble_sync.organizer import Manifest, save_file
from wble_sync.scraper import get_course_sections, get_enrolled_courses, resolve_download


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default="config.yaml", type=pathlib.Path)
    parser.add_argument("--dry-run", action="store_true",
                         help="List files that would be synced without downloading them")
    args = parser.parse_args()

    config = load_config(args.config)
    download_dir = pathlib.Path(config.download_dir)
    manifest = Manifest(pathlib.Path(config.download_dir) / "manifest.json")

    with sync_playwright() as p:
        browser, context, page = ensure_logged_in(p, config)
        try:
            courses = get_enrolled_courses(page, config.wble_base_url)
            print(f"[sync] Found {len(courses)} enrolled course(s).")

            new_count = 0
            skip_count = 0
            for course_id, course_name in courses.items():
                sections = get_course_sections(page, config.wble_base_url, course_id)
                for section in sections:
                    for f in section["files"]:
                        href = f["href"]
                        if manifest.has(href):
                            skip_count += 1
                            continue

                        if args.dry_run:
                            print(f"[dry-run] {course_name} / {section['name']} / {f['title']}")
                            new_count += 1
                            continue

                        filename, content = resolve_download(context.request, href)
                        if content is None:
                            print(f"[skip] Could not resolve a file for: "
                                  f"{course_name} / {section['name']} / {f['title']} ({href})")
                            continue

                        out_path = save_file(download_dir, course_name, section["name"],
                                              filename, content)
                        manifest.record(href, str(out_path))
                        new_count += 1
                        print(f"[saved] {out_path}")

            verb = "would download" if args.dry_run else "downloaded"
            print(f"\n[sync] Done. {verb} {new_count} new file(s), skipped {skip_count} already-synced.")
        finally:
            context.close()
            browser.close()


if __name__ == "__main__":
    main()
