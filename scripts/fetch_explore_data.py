"""Fetch trend data for Explore page and write to data/explore_data.json.

- Google Trends via pytrends (12 months, weekly) collapsed into last 6 months.
- City scaling uses Google Trends interest_by_region (CITY) as a multiplier.
- Optional Google Places counts (requires GOOGLE_API_KEY) to add saturation signals.

Run:
    conda activate shurukerai
    python scripts/fetch_explore_data.py

Outputs:
    data/explore_data.json
"""

import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

import requests
from pytrends.request import TrendReq
from pytrends.exceptions import TooManyRequestsError

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_PATH = BASE_DIR / "data" / "explore_data.json"
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Categories mapped to representative keywords (Pakistan context)
CATEGORIES = {
    "Cloud Kitchen": ["food delivery", "cloud kitchen", "biryani delivery"],
    "Boutique Fashion": ["pret wear", "women clothing", "boutique"],
    "EdTech Bootcamp": ["coding bootcamp", "online course", "skill training"],
    "Used Cars": ["used car", "car for sale", "buy car"],
    "Pharmacy Delivery": ["online pharmacy", "medicine delivery", "pharmacy"],
    "Home Bakery": ["home bakery", "custom cake", "cupcakes order"],
}

# Cities to surface; geo uses national trends, scaled by city interest
CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan"]

# Optional Google Places query terms per category (textsearch)
PLACES_QUERY = {
    "Cloud Kitchen": "cloud kitchen",
    "Boutique Fashion": "boutique",
    "EdTech Bootcamp": "training center",
    "Used Cars": "used car dealer",
    "Pharmacy Delivery": "pharmacy",
    "Home Bakery": "bakery",
}


def compress_last_6_months(series) -> Tuple[List[str], List[int]]:
    """Collapse weekly series into last 6 monthly averages."""
    df = series.to_frame("score")
    df["month"] = df.index.to_period("M")
    monthly = df.groupby("month")["score"].mean().tail(6)
    labels = [str(m) for m in monthly.index]
    values = [int(round(v)) for v in monthly.values]
    return labels, values


def get_city_multipliers(pytrends, keywords) -> Dict[str, float]:
    """Use interest_by_region to derive relative city weights (0-1)."""
    try:
        region_df = pytrends.interest_by_region(resolution="CITY", inc_low_vol=True)
        if region_df.empty:
            return {c: 0.6 for c in CITIES}
        region_df["mean"] = region_df.mean(axis=1)
        region_df = region_df.reset_index().rename(columns={"geoName": "city"})
        max_val = region_df["mean"].max() or 1
        multipliers = {}
        for city in CITIES:
            val = region_df.loc[region_df["city"].str.contains(city, case=False, na=False), "mean"]
            score = float(val.iloc[0]) if not val.empty else max_val * 0.45
            multipliers[city] = max(0.2, min(score / max_val, 1.0))
        return multipliers
    except Exception:
        return {c: 0.6 for c in CITIES}


def fetch_places_count(city: str, category: str) -> int:
    """Optional: rough count of places per city/category using Text Search (first page)."""
    if not GOOGLE_API_KEY:
        return -1
    query = f"{PLACES_QUERY.get(category, category)} in {city}, Pakistan"
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    try:
        resp = requests.get(url, params={"query": query, "key": GOOGLE_API_KEY}, timeout=10)
        data = resp.json()
        results = data.get("results", [])
        return len(results)
    except Exception:
        return -1


def build_payload_with_retry(pytrends, keywords, max_retries=3):
    """Build payload with exponential backoff retry."""
    for attempt in range(max_retries):
        try:
            pytrends.build_payload(kw_list=keywords, timeframe="today 12-m", geo="PK")
            return True
        except TooManyRequestsError:
            if attempt < max_retries - 1:
                wait = 2 ** attempt * 5  # 5, 10, 20 seconds
                print(f"  Rate limited, waiting {wait}s...")
                time.sleep(wait)
            else:
                raise
    return False


def collect_category(pytrends, category: str, keywords: List[str]):
    build_payload_with_retry(pytrends, keywords)
    time.sleep(2)  # Small delay between API calls
    
    try:
        df = pytrends.interest_over_time()
    except TooManyRequestsError:
        print(f"  Still rate limited after retries, using fallback data")
        return None
    
    if df.empty:
        return None
    mean_series = df[keywords].mean(axis=1)
    labels, values = compress_last_6_months(mean_series)
    
    # Skip city multipliers to reduce API calls - use simple scaling instead
    # multipliers = get_city_multipliers(pytrends, keywords)
    multipliers = {
        "Karachi": 0.85, "Lahore": 0.80, "Islamabad": 0.65,
        "Rawalpindi": 0.55, "Faisalabad": 0.50, "Multan": 0.45
    }

    city_values = {}
    for city, mult in multipliers.items():
        city_values[city] = [int(round(v * (0.55 + 0.6 * mult))) for v in values]

    places = {city: fetch_places_count(city, category) for city in CITIES}

    return {
        "labels": labels,
        "national": values,
        "cities": city_values,
        "places": places,
    }


def main():
    pytrends = TrendReq(hl="en-US", tz=300)
    output = {
        "updatedAt": datetime.utcnow().isoformat() + "Z",
        "categories": {},
    }

    for idx, (category, keywords) in enumerate(CATEGORIES.items()):
        print(f"[{idx+1}/{len(CATEGORIES)}] Fetching trends for {category}...")
        try:
            data = collect_category(pytrends, category, keywords)
            if data:
                output["categories"][category] = data
            # Add delay between categories to avoid rate limiting
            if idx < len(CATEGORIES) - 1:
                time.sleep(3)
        except Exception as e:
            print(f"  Error fetching {category}: {e}")
            continue

    # Derive top movers from national series
    movers = []
    for cat, data in output["categories"].items():
        vals = data["national"]
        if len(vals) >= 2 and vals[0] > 0:
            growth = (vals[-1] - vals[0]) / vals[0]
        else:
            growth = 0
        movers.append({"category": cat, "growth": round(growth, 3), "latest": vals[-1]})
    output["topMovers"] = sorted(movers, key=lambda x: x["growth"], reverse=True)[:5]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"✅ Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
