import pathlib
import time

from .config import Config


def is_logged_in(page) -> bool:
    try:
        body_text = page.inner_text("body")
    except Exception:
        return False
    if "You are not logged in" in body_text:
        return False
    return page.query_selector("a[href*='logout']") is not None


def ensure_logged_in(playwright, config: Config):
    """Returns (browser, context, page) for an authenticated session.

    Never touches your password: if a cached session exists it's reused
    silently, otherwise a real (visible) browser window is opened and you
    log in by hand -- including solving the reCAPTCHA yourself. Only the
    resulting session cookies are cached locally for next time.
    """
    session_path = pathlib.Path(config.session_state_file)

    if session_path.exists():
        browser = playwright.chromium.launch(headless=config.headless_after_login)
        context = browser.new_context(storage_state=str(session_path))
        page = context.new_page()
        page.goto(f"{config.wble_base_url}/my/", wait_until="domcontentloaded")
        if is_logged_in(page):
            print("[login] Reusing cached session, already logged in.")
            return browser, context, page
        print("[login] Cached session expired, need to log in again.")
        context.close()
        browser.close()

    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    page.goto(f"{config.wble_base_url}/login/index.php", wait_until="domcontentloaded")

    print("\n" + "=" * 60)
    print("A browser window has opened. Please log in manually:")
    print("  1. Enter your username and password")
    print("  2. Solve the reCAPTCHA checkbox")
    print("  3. Click Login")
    print("Waiting up to 5 minutes for you to finish...")
    print("=" * 60 + "\n")

    deadline = time.time() + 300
    while time.time() < deadline:
        if is_logged_in(page):
            print("[login] Login detected, saving session for next time...")
            context.storage_state(path=str(session_path))
            return browser, context, page
        page.wait_for_timeout(2000)

    browser.close()
    raise TimeoutError("Timed out waiting for manual login (5 minutes).")
