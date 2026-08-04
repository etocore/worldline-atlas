#!/usr/bin/env python3
"""Build static historical surface tiles from published paleoDEM grids.

The generated color tiles are an elevation-derived visual synthesis. They do not
claim climate, vegetation, river, ice, or settlement accuracy. The DEM tiles use
Mapbox Terrain-RGB encoding so MapLibre can add hillshade and later 3D terrain.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import tempfile
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import xarray as xr
from PIL import Image
from scipy.ndimage import map_coordinates

DEFAULT_SOURCE = (
    "https://zenodo.org/records/5460860/files/"
    "Scotese_Wright_2018_Maps_1-88_1degX1deg_PaleoDEMS_nc.zip?download=1"
)
TILE_SIZE = 256
MAX_MERCATOR_LAT = 85.05112878


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--age", type=float, default=250.0)
    parser.add_argument("--max-zoom", type=int, default=3)
    parser.add_argument("--source-url", default=DEFAULT_SOURCE)
    parser.add_argument("--output-root", default="data/surface/worlds")
    parser.add_argument("--manifest", default="data/surface/worlds.json")
    return parser.parse_args()


def download(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": "WorldlineAtlasSurfaceBuilder/1.0"})
    with urllib.request.urlopen(request, timeout=180) as response, destination.open("wb") as target:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            target.write(chunk)


def age_candidates_from_text(value: str) -> list[float]:
    candidates: list[float] = []
    for pattern in (
        r"(?<!\d)(\d+(?:\.\d+)?)\s*(?:Ma|Myr|MYA)(?![A-Za-z])",
        r"(?:age|time)[_\- ]*(\d+(?:\.\d+)?)",
        r"(?<!\d)(\d{1,3}(?:\.\d+)?)(?!\d)",
    ):
        for match in re.finditer(pattern, value, flags=re.IGNORECASE):
            number = float(match.group(1))
            if 0 <= number <= 600:
                candidates.append(number)
    return candidates


def dataset_age(path: Path) -> float | None:
    candidates = age_candidates_from_text(path.name)
    try:
        with xr.open_dataset(path, decode_times=False, mask_and_scale=False) as dataset:
            for key, value in dataset.attrs.items():
                if any(token in key.lower() for token in ("age", "time", "title", "history")):
                    candidates.extend(age_candidates_from_text(str(value)))
            for name in dataset.variables:
                lowered = name.lower()
                variable = dataset[name]
                if variable.size == 1 and any(token in lowered for token in ("age", "time", "ma")):
                    try:
                        number = float(variable.values.reshape(-1)[0])
                    except (TypeError, ValueError):
                        continue
                    if 0 <= number <= 600:
                        candidates.append(number)
    except Exception as error:  # pragma: no cover - diagnostic fallback
        print(f"Could not inspect {path.name}: {error}")
    if not candidates:
        return None
    return min(candidates, key=lambda candidate: abs(candidate - 250.0))


def select_dataset(paths: list[Path], target_age: float) -> tuple[Path, float]:
    ranked: list[tuple[float, Path, float]] = []
    for path in paths:
        age = dataset_age(path)
        if age is None:
            continue
        ranked.append((abs(age - target_age), path, age))
    if not ranked:
        raise RuntimeError("No age-bearing paleoDEM NetCDF file could be identified")
    ranked.sort(key=lambda item: item[0])
    _, path, age = ranked[0]
    if abs(age - target_age) > 8:
        raise RuntimeError(f"Closest identified paleoDEM age was {age} Ma in {path.name}")
    return path, age


def choose_grid_variable(dataset: xr.Dataset) -> xr.DataArray:
    candidates: list[tuple[int, str, xr.DataArray]] = []
    for name, variable in dataset.data_vars.items():
        squeezed = variable.squeeze(drop=True)
        if squeezed.ndim != 2 or not np.issubdtype(squeezed.dtype, np.number):
            continue
        score = squeezed.size
        lowered = name.lower()
        if any(token in lowered for token in ("elev", "topo", "dem", "height", "z")):
            score += 10_000_000
        candidates.append((score, name, squeezed))
    if not candidates:
        raise RuntimeError("No two-dimensional numeric elevation variable found")
    candidates.sort(reverse=True, key=lambda item: item[0])
    return candidates[0][2]


def coordinate_for(array: xr.DataArray, axis: str) -> tuple[str, np.ndarray]:
    aliases = {
        "lat": ("lat", "latitude", "y"),
        "lon": ("lon", "longitude", "x"),
    }[axis]
    for dimension in array.dims:
        if dimension.lower() in aliases:
            values = np.asarray(array[dimension].values, dtype=np.float64)
            return dimension, values
    dimension = array.dims[0 if axis == "lat" else 1]
    size = array.sizes[dimension]
    values = np.linspace(-90, 90, size) if axis == "lat" else np.linspace(-180, 180, size, endpoint=False)
    return dimension, values


def load_grid(path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    with xr.open_dataset(path, decode_times=False) as dataset:
        variable = choose_grid_variable(dataset)
        lat_dim, latitudes = coordinate_for(variable, "lat")
        lon_dim, longitudes = coordinate_for(variable, "lon")
        variable = variable.transpose(lat_dim, lon_dim)
        elevation = np.asarray(variable.values, dtype=np.float64)

    elevation = np.nan_to_num(elevation, nan=0.0, posinf=9000.0, neginf=-11000.0)
    elevation = np.clip(elevation, -11000.0, 9000.0)

    if latitudes[0] > latitudes[-1]:
        latitudes = latitudes[::-1]
        elevation = elevation[::-1, :]

    normalized_lon = ((longitudes + 180.0) % 360.0) - 180.0
    order = np.argsort(normalized_lon)
    normalized_lon = normalized_lon[order]
    elevation = elevation[:, order]

    unique_lon, unique_indices = np.unique(np.round(normalized_lon, 8), return_index=True)
    elevation = elevation[:, unique_indices]
    normalized_lon = unique_lon

    # Add a wrapped column so sampling at +180 blends into -180.
    normalized_lon = np.concatenate([normalized_lon, [normalized_lon[0] + 360.0]])
    elevation = np.concatenate([elevation, elevation[:, :1]], axis=1)
    return elevation, latitudes, normalized_lon


def tile_lon_lat(z: int, x: int, y: int) -> tuple[np.ndarray, np.ndarray]:
    count = 2**z
    px = (x + (np.arange(TILE_SIZE, dtype=np.float64) + 0.5) / TILE_SIZE) / count
    py = (y + (np.arange(TILE_SIZE, dtype=np.float64) + 0.5) / TILE_SIZE) / count
    lon = px * 360.0 - 180.0
    mercator = math.pi * (1.0 - 2.0 * py)
    lat = np.degrees(np.arctan(np.sinh(mercator)))
    lon_grid, lat_grid = np.meshgrid(lon, lat)
    return lon_grid, np.clip(lat_grid, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT)


def sample_grid(
    elevation: np.ndarray,
    latitudes: np.ndarray,
    longitudes: np.ndarray,
    lon_grid: np.ndarray,
    lat_grid: np.ndarray,
) -> np.ndarray:
    normalized_lon = ((lon_grid + 180.0) % 360.0) - 180.0
    lon_index = np.interp(normalized_lon, longitudes, np.arange(longitudes.size))
    lat_index = np.interp(lat_grid, latitudes, np.arange(latitudes.size))
    sampled = map_coordinates(elevation, [lat_index, lon_index], order=1, mode="nearest")
    return sampled.astype(np.float32)


def colorize(elevation: np.ndarray, lon: np.ndarray, lat: np.ndarray) -> np.ndarray:
    stops = np.array([-11000, -6500, -4000, -1800, -500, -80, 0, 120, 500, 1300, 2600, 5000, 9000], dtype=np.float32)
    colors = np.array(
        [
            [2, 12, 27],
            [4, 24, 46],
            [7, 43, 70],
            [12, 69, 94],
            [34, 103, 117],
            [72, 135, 134],
            [153, 139, 86],
            [165, 151, 96],
            [150, 139, 91],
            [128, 116, 78],
            [112, 99, 75],
            [151, 140, 119],
            [214, 209, 198],
        ],
        dtype=np.float32,
    )
    rgb = np.stack([np.interp(elevation, stops, colors[:, channel]) for channel in range(3)], axis=-1)

    # Relief is derived only from the paleoDEM. The texture below is deliberately
    # low amplitude and does not encode climate or vegetation claims.
    gradient_y, gradient_x = np.gradient(elevation)
    slope = np.pi / 2.0 - np.arctan(np.hypot(gradient_x, gradient_y) / 140.0)
    aspect = np.arctan2(-gradient_x, gradient_y)
    azimuth = np.deg2rad(315.0)
    altitude = np.deg2rad(38.0)
    shade = np.sin(altitude) * np.sin(slope) + np.cos(altitude) * np.cos(slope) * np.cos(azimuth - aspect)
    shade = np.clip((shade + 1.0) / 2.0, 0.0, 1.0)
    shade_factor = 0.68 + shade[..., None] * 0.48

    texture = (
        np.sin(np.deg2rad(lon * 3.1))
        + np.sin(np.deg2rad(lat * 5.7))
        + np.sin(np.deg2rad((lon + lat) * 1.9))
    ) / 3.0
    texture_factor = 1.0 + texture[..., None] * 0.025
    rgb = rgb * shade_factor * texture_factor

    # Continental shelves receive a subtle turquoise lift to make shallow seas legible.
    shelf = np.clip((elevation + 550.0) / 550.0, 0.0, 1.0) * np.clip((-elevation) / 80.0, 0.0, 1.0)
    rgb[..., 1] += shelf * 9.0
    rgb[..., 2] += shelf * 12.0

    alpha = np.full((*elevation.shape, 1), 255.0, dtype=np.float32)
    return np.concatenate([np.clip(rgb, 0, 255), alpha], axis=-1).astype(np.uint8)


def terrain_rgb(elevation: np.ndarray) -> np.ndarray:
    encoded = np.clip(np.rint((elevation + 10000.0) * 10.0), 0, 256**3 - 1).astype(np.uint32)
    red = (encoded // 65536).astype(np.uint8)
    green = ((encoded // 256) % 256).astype(np.uint8)
    blue = (encoded % 256).astype(np.uint8)
    alpha = np.full(elevation.shape, 255, dtype=np.uint8)
    return np.stack([red, green, blue, alpha], axis=-1)


def write_tiles(
    elevation: np.ndarray,
    latitudes: np.ndarray,
    longitudes: np.ndarray,
    output: Path,
    max_zoom: int,
) -> None:
    for z in range(max_zoom + 1):
        count = 2**z
        for x in range(count):
            for y in range(count):
                lon, lat = tile_lon_lat(z, x, y)
                sampled = sample_grid(elevation, latitudes, longitudes, lon, lat)
                color_path = output / "color" / str(z) / str(x) / f"{y}.png"
                dem_path = output / "dem" / str(z) / str(x) / f"{y}.png"
                color_path.parent.mkdir(parents=True, exist_ok=True)
                dem_path.parent.mkdir(parents=True, exist_ok=True)
                Image.fromarray(colorize(sampled, lon, lat), mode="RGBA").save(color_path, optimize=True)
                Image.fromarray(terrain_rgb(sampled), mode="RGBA").save(dem_path, optimize=True)
        print(f"Generated zoom {z} ({count * count} color and DEM tiles)")


def update_manifest(manifest_path: Path, target_age: float, actual_age: float, max_zoom: int) -> None:
    manifest = json.loads(manifest_path.read_text())
    world = next(item for item in manifest["worlds"] if item["id"] == "250-ma")
    world["status"] = "generated"
    world["actualAgeMa"] = actual_age
    world["generatedAt"] = datetime.now(timezone.utc).isoformat()
    world["layers"].update({"elevation": "available", "bathymetry": "available"})
    world["assets"] = {
        "colorTiles": "/data/surface/worlds/250-ma/color/{z}/{x}/{y}.png",
        "demTiles": "/data/surface/worlds/250-ma/dem/{z}/{x}/{y}.png",
        "tileSize": TILE_SIZE,
        "minzoom": 0,
        "maxzoom": max_zoom,
        "encoding": "mapbox",
        "attribution": "PaleoDEM: Scotese and Wright (2018), doi:10.5281/zenodo.5460860",
    }
    manifest["generatedAt"] = datetime.now(timezone.utc).isoformat()
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")


def main() -> None:
    args = parse_args()
    output_root = Path(args.output_root)
    manifest_path = Path(args.manifest)
    world_output = output_root / "250-ma"

    with tempfile.TemporaryDirectory(prefix="worldline-surface-") as temporary:
        temp = Path(temporary)
        archive = temp / "paleodem.zip"
        extracted = temp / "paleodem"
        print(f"Downloading PaleoDEM archive from {args.source_url}")
        download(args.source_url, archive)
        with zipfile.ZipFile(archive) as bundle:
            bundle.extractall(extracted)
        netcdf_files = sorted(extracted.rglob("*.nc"))
        if not netcdf_files:
            raise RuntimeError("Downloaded archive did not contain NetCDF files")
        dataset_path, actual_age = select_dataset(netcdf_files, args.age)
        print(f"Using {dataset_path.name} at {actual_age} Ma")
        elevation, latitudes, longitudes = load_grid(dataset_path)

        if world_output.exists():
            import shutil

            shutil.rmtree(world_output)
        write_tiles(elevation, latitudes, longitudes, world_output, args.max_zoom)

    metadata = {
        "schemaVersion": 1,
        "id": "250-ma",
        "targetAgeMa": args.age,
        "actualAgeMa": actual_age,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "title": "PALEOMAP Paleodigital Elevation Models for the Phanerozoic",
            "authors": "Christopher R. Scotese and Nicky M. Wright",
            "year": 2018,
            "doi": "10.5281/zenodo.5460860",
            "sourceGrid": dataset_path.name,
        },
        "representation": {
            "elevation": "source-derived",
            "bathymetry": "source-derived",
            "surfaceColor": "deterministic elevation-derived visual synthesis",
            "climate": "not represented",
            "vegetation": "not represented",
            "settlements": "not represented",
        },
        "tiles": {"tileSize": TILE_SIZE, "minzoom": 0, "maxzoom": args.max_zoom},
    }
    (world_output / "world.json").write_text(json.dumps(metadata, indent=2) + "\n")
    update_manifest(manifest_path, args.age, actual_age, args.max_zoom)
    print(f"Surface package written to {world_output}")


if __name__ == "__main__":
    main()
