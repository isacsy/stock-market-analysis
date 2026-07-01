# Student Notes Organizer (WBLE sync)

Logs into UTAR WBLE (Moodle) and downloads your course materials into a
locally organized `notes/<course>/<section>/` folder, so you don't have to
click through every course page by hand.

## How login works (read this before using it)

WBLE's login page has a Google reCAPTCHA on it. This tool does **not** try
to automate or bypass that -- it opens a real, visible browser window and
you log in yourself (type your username/password, tick the reCAPTCHA,
click Login), exactly like you normally would.

Once you're logged in, the tool takes over and does the repetitive part:
walking your course pages and downloading files.

- Your password is typed directly into the real WBLE page. It never passes
  through this script or gets written to disk.
- After login, the session cookie is cached in `session_state.json` (local
  only, gitignored) so you don't have to solve the CAPTCHA every single
  run. Delete that file any time to force a fresh login.
- Treat `session_state.json` like a login session -- don't share it or
  commit it. It's already in `.gitignore`.

## Setup

```bash
cd student-notes-organizer
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium

cp config.example.yaml config.yaml
# edit config.yaml: set wble_base_url to your campus's WBLE entry point
```

## Usage

```bash
# See what would be synced without downloading anything
python sync.py --dry-run

# Actually sync
python sync.py
```

The first run opens a browser window for you to log in manually. Later
runs reuse the cached session silently (fully unattended) until it
expires, at which point it'll prompt you to log in again.

Re-running `sync.py` only downloads new files -- already-synced ones are
tracked in `notes/manifest.json` and skipped.

## Known limitations (v1)

This is a first pass and the course page structure was written against the
public login page only (I couldn't reach WBLE from the environment that
built this). If a course's files aren't showing up, or `--dry-run` looks
wrong, share the console output / a snippet of the course page HTML so the
selectors in `wble_sync/scraper.py` can be adjusted:

- Only resource/folder/url-type links and direct file links are handled.
  Forums, quizzes, assignments (submission pages) are intentionally
  skipped in v1.
- Section names are pulled from Moodle's usual `.sectionname`/`h3`
  markup; if this WBLE instance's theme differs, section names may fall
  back to `section-0`, `section-1`, etc.
