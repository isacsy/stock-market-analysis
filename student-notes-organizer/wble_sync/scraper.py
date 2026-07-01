import re
from urllib.parse import unquote, urlparse

FILE_LINK_PATTERN = re.compile(
    r"pluginfile\.php|mod/resource/view\.php|mod/folder/view\.php|mod/url/view\.php"
)


def get_enrolled_courses(page, base_url: str) -> dict[int, str]:
    """Returns {course_id: course_fullname} from the dashboard."""
    page.goto(f"{base_url}/my/", wait_until="networkidle")
    courses: dict[int, str] = {}
    for link in page.query_selector_all("a[href*='course/view.php?id=']"):
        href = link.get_attribute("href") or ""
        text = link.inner_text().strip()
        m = re.search(r"id=(\d+)", href)
        if not m or not text:
            continue
        course_id = int(m.group(1))
        if course_id == 1:  # Moodle site home, not a real course
            continue
        courses[course_id] = text
    return courses


def get_course_sections(page, base_url: str, course_id: int) -> list[dict]:
    """Returns [{"name": section_name, "files": [{"title", "href"}]}] for a course."""
    page.goto(f"{base_url}/course/view.php?id={course_id}", wait_until="networkidle")

    section_els = page.query_selector_all("li.section, div.section")
    if not section_els:
        section_els = [page.query_selector("body")]

    sections = []
    for idx, sec in enumerate(section_els):
        name_el = sec.query_selector(".sectionname, h3")
        name = name_el.inner_text().strip() if name_el else ""
        if not name:
            name = f"section-{idx}"

        files = []
        seen_hrefs = set()
        for link in sec.query_selector_all("a"):
            href = link.get_attribute("href") or ""
            if not FILE_LINK_PATTERN.search(href):
                continue
            if href in seen_hrefs:
                continue
            seen_hrefs.add(href)
            title = link.inner_text().strip() or "untitled"
            files.append({"title": title, "href": href})

        if files:
            sections.append({"name": name, "files": files})

    return sections


def resolve_download(request_context, url: str):
    """Follows a course link and returns (filename, content_bytes) for the
    actual file, or (None, None) if the link didn't lead to a downloadable
    file (e.g. a forum/quiz page we don't handle in v1)."""
    response = request_context.get(url)
    if not response.ok:
        return None, None

    content_type = response.headers.get("content-type", "")
    if content_type.startswith("text/html"):
        # Intermediate Moodle "resource" page -- look for the real file link.
        html = response.text()
        m = re.search(r'href="([^"]*pluginfile\.php[^"]*)"', html)
        if not m:
            return None, None
        return resolve_download(request_context, m.group(1))

    filename = _filename_from_response(response, url)
    return filename, response.body()


def _filename_from_response(response, url: str) -> str:
    disposition = response.headers.get("content-disposition", "")
    m = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^";]+)"?', disposition)
    if m:
        return unquote(m.group(1))
    return unquote(urlparse(url).path.rsplit("/", 1)[-1]) or "download"
