import dataclasses
import pathlib

import yaml

DEFAULT_CONFIG_PATH = pathlib.Path("config.yaml")


@dataclasses.dataclass
class Config:
    wble_base_url: str
    download_dir: str
    session_state_file: str
    headless_after_login: bool = True


def load_config(path: pathlib.Path = DEFAULT_CONFIG_PATH) -> Config:
    if not path.exists():
        raise FileNotFoundError(
            f"{path} not found. Copy config.example.yaml to {path} and edit it first."
        )
    with open(path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)
    return Config(
        wble_base_url=raw["wble_base_url"].rstrip("/"),
        download_dir=raw.get("download_dir", "./notes"),
        session_state_file=raw.get("session_state_file", "./session_state.json"),
        headless_after_login=raw.get("headless_after_login", True),
    )
