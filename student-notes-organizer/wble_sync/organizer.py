import json
import pathlib
import re

_UNSAFE_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def sanitize(name: str, max_len: int = 100) -> str:
    name = _UNSAFE_CHARS.sub("_", name).strip(" .")
    return (name or "untitled")[:max_len]


class Manifest:
    """Tracks which URLs have already been downloaded so re-runs only fetch
    new material instead of re-downloading everything."""

    def __init__(self, path: pathlib.Path):
        self.path = path
        self._downloaded: dict[str, str] = {}
        if path.exists():
            self._downloaded = json.loads(path.read_text(encoding="utf-8"))

    def has(self, href: str) -> bool:
        return href in self._downloaded

    def record(self, href: str, local_path: str) -> None:
        self._downloaded[href] = local_path
        self.path.write_text(json.dumps(self._downloaded, indent=2), encoding="utf-8")


def save_file(download_dir: pathlib.Path, course_name: str, section_name: str,
              filename: str, content: bytes) -> pathlib.Path:
    course_dir = download_dir / sanitize(course_name) / sanitize(section_name)
    course_dir.mkdir(parents=True, exist_ok=True)
    out_path = course_dir / sanitize(filename, max_len=150)
    out_path.write_bytes(content)
    return out_path
