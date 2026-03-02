"""
schemas.py – loads and returns platform preset definitions.
Presets are stored under presets/video/, presets/image/, presets/audio/.
"""
import json
import os
from typing import List, Dict, Any

PRESETS_DIR = os.path.join(os.path.dirname(__file__), "presets")

MEDIA_TYPES = ("video", "image", "audio")


def _load_from_subdir(subdir: str) -> List[Dict[str, Any]]:
    path = os.path.join(PRESETS_DIR, subdir)
    presets = []
    if not os.path.isdir(path):
        return presets
    for fname in sorted(os.listdir(path)):
        if fname.endswith(".json"):
            fpath = os.path.join(path, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Ensure mediaType is set from folder name
                data.setdefault("mediaType", subdir)
                presets.append(data)
    return presets


def load_all_presets() -> Dict[str, List[Dict[str, Any]]]:
    """Return presets grouped by mediaType: {"video": [...], "image": [...], "audio": [...]}."""
    return {mt: _load_from_subdir(mt) for mt in MEDIA_TYPES}


def load_flat_presets() -> List[Dict[str, Any]]:
    """Return all presets as a flat list."""
    result = []
    for mt in MEDIA_TYPES:
        result.extend(_load_from_subdir(mt))
    return result


def get_preset_by_platform(platform: str, media_type: str = "") -> Dict[str, Any]:
    """Find a preset by platform name, optionally filtering by mediaType."""
    search_types = [media_type] if media_type and media_type in MEDIA_TYPES else list(MEDIA_TYPES)
    for mt in search_types:
        for p in _load_from_subdir(mt):
            if p.get("platform") == platform:
                return p
    raise ValueError(f"No preset found for platform: {platform!r} (mediaType={media_type!r})")

