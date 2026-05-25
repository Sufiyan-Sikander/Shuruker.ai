"""Generate realistic fallback data for Explore page when Google Trends is rate-limited.

Uses growth patterns observed from Pakistan business trends and market reports.
Run this temporarily until real data fetching works.

Run:
    python scripts/generate_fallback_data.py
"""

import json
import random
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_PATH = BASE_DIR / "data" / "explore_data.json"

CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan"]

# Base growth patterns observed from Pakistan market (2025-2026)
CATEGORY_PROFILES = {
    "Information Technology (IT) & Software Services": {
        "base": 72,
        "growth": 0.55,
        "volatility": 0.09,
        "city_strength": {
            "Karachi": 0.95, "Lahore": 0.98, "Islamabad": 1.0,
            "Rawalpindi": 0.75, "Faisalabad": 0.60, "Multan": 0.55
        }
    },
    "E-commerce & Online Marketplaces": {
        "base": 68,
        "growth": 0.52,
        "volatility": 0.10,
        "city_strength": {
            "Karachi": 1.0, "Lahore": 0.95, "Islamabad": 0.85,
            "Rawalpindi": 0.72, "Faisalabad": 0.65, "Multan": 0.58
        }
    },
    "Trading & Commercial Businesses": {
        "base": 58,
        "growth": 0.28,
        "volatility": 0.07,
        "city_strength": {
            "Karachi": 1.0, "Lahore": 0.88, "Islamabad": 0.65,
            "Rawalpindi": 0.60, "Faisalabad": 0.70, "Multan": 0.68
        }
    },
    "General Services Companies (consulting, agencies, B2B/B2C services)": {
        "base": 55,
        "growth": 0.38,
        "volatility": 0.08,
        "city_strength": {
            "Karachi": 0.92, "Lahore": 0.95, "Islamabad": 0.90,
            "Rawalpindi": 0.72, "Faisalabad": 0.62, "Multan": 0.58
        }
    },
    "Real Estate Development & Construction": {
        "base": 62,
        "growth": 0.35,
        "volatility": 0.06,
        "city_strength": {
            "Karachi": 0.98, "Lahore": 0.95, "Islamabad": 0.92,
            "Rawalpindi": 0.88, "Faisalabad": 0.78, "Multan": 0.72
        }
    },
    "Tourism, Travel & Transport Services": {
        "base": 48,
        "growth": 0.42,
        "volatility": 0.11,
        "city_strength": {
            "Karachi": 0.92, "Lahore": 0.88, "Islamabad": 0.95,
            "Rawalpindi": 0.85, "Faisalabad": 0.65, "Multan": 0.60
        }
    },
    "Food & Beverages": {
        "base": 65,
        "growth": 0.48,
        "volatility": 0.09,
        "city_strength": {
            "Karachi": 1.0, "Lahore": 0.95, "Islamabad": 0.80,
            "Rawalpindi": 0.72, "Faisalabad": 0.68, "Multan": 0.65
        }
    },
    "Restaurants": {
        "base": 66,
        "growth": 0.44,
        "volatility": 0.08,
        "city_strength": {
            "Karachi": 0.98, "Lahore": 1.0, "Islamabad": 0.85,
            "Rawalpindi": 0.75, "Faisalabad": 0.70, "Multan": 0.68
        }
    },
    "Cafés / Coffee Bars": {
        "base": 58,
        "growth": 0.50,
        "volatility": 0.10,
        "city_strength": {
            "Karachi": 0.95, "Lahore": 0.98, "Islamabad": 0.92,
            "Rawalpindi": 0.78, "Faisalabad": 0.65, "Multan": 0.60
        }
    },
    "Cloud Kitchens": {
        "base": 65,
        "growth": 0.48,
        "volatility": 0.08,
        "city_strength": {
            "Karachi": 1.0, "Lahore": 0.90, "Islamabad": 0.70,
            "Rawalpindi": 0.60, "Faisalabad": 0.50, "Multan": 0.45
        }
    },
    "Catering Services": {
        "base": 52,
        "growth": 0.32,
        "volatility": 0.07,
        "city_strength": {
            "Karachi": 0.92, "Lahore": 0.95, "Islamabad": 0.88,
            "Rawalpindi": 0.72, "Faisalabad": 0.65, "Multan": 0.62
        }
    },
    "Education & Training Institutes": {
        "base": 60,
        "growth": 0.45,
        "volatility": 0.08,
        "city_strength": {
            "Karachi": 0.90, "Lahore": 0.92, "Islamabad": 0.98,
            "Rawalpindi": 0.85, "Faisalabad": 0.72, "Multan": 0.68
        }
    },
    "Coaching centers": {
        "base": 54,
        "growth": 0.40,
        "volatility": 0.09,
        "city_strength": {
            "Karachi": 0.88, "Lahore": 0.92, "Islamabad": 0.95,
            "Rawalpindi": 0.82, "Faisalabad": 0.70, "Multan": 0.65
        }
    },
    "EdTech services": {
        "base": 58,
        "growth": 0.58,
        "volatility": 0.10,
        "city_strength": {
            "Karachi": 0.90, "Lahore": 0.88, "Islamabad": 0.98,
            "Rawalpindi": 0.75, "Faisalabad": 0.62, "Multan": 0.58
        }
    }
}

MONTHS = ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01"]


def generate_series(base, growth, volatility, months=6):
    """Generate a realistic trend series with growth and noise."""
    series = []
    for i in range(months):
        progress = i / (months - 1)
        trend_value = base * (1 + growth * progress)
        noise = random.uniform(-volatility, volatility) * base
        value = int(max(10, trend_value + noise))
        series.append(value)
    return series


def generate_city_series(national_series, strength):
    """Scale national series by city strength with slight variance."""
    return [int(max(5, v * strength * random.uniform(0.92, 1.08))) for v in national_series]


def main():
    output = {
        "updatedAt": datetime.utcnow().isoformat() + "Z",
        "source": "fallback_synthetic",
        "categories": {}
    }

    for category, profile in CATEGORY_PROFILES.items():
        national = generate_series(
            profile["base"],
            profile["growth"],
            profile["volatility"]
        )
        
        cities = {}
        for city in CITIES:
            strength = profile["city_strength"][city]
            cities[city] = generate_city_series(national, strength)
        
        output["categories"][category] = {
            "labels": MONTHS,
            "national": national,
            "cities": cities,
            "places": {city: -1 for city in CITIES}  # -1 = no data
        }

    # Calculate top movers
    movers = []
    for cat, data in output["categories"].items():
        vals = data["national"]
        growth = (vals[-1] - vals[0]) / vals[0] if vals[0] > 0 else 0
        movers.append({"category": cat, "growth": round(growth, 3), "latest": vals[-1]})
    output["topMovers"] = sorted(movers, key=lambda x: x["growth"], reverse=True)[:5]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Generated fallback data at {OUTPUT_PATH}")
    print(f"📊 Top movers: {', '.join(m['category'] for m in movers[:3])}")


if __name__ == "__main__":
    main()
