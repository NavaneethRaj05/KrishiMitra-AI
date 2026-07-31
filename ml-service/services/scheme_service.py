import logging

logger = logging.getLogger("krishimitraai.schemes")

SCHEMES_DB = [
    {
        "id": "pm_kisan",
        "name": "PM-KISAN",
        "description": "₹6000/year direct income support to small and marginal farmers",
        "eligibility": {"land_holding_max_acres": 5, "land_ownership": "required"},
        "benefit": "₹6,000/year in 3 installments",
        "apply_url": "https://pmkisan.gov.in",
        "keywords": ["income", "support", "paise", "subsidy", "money"]
    },
    {
        "id": "pmfby",
        "name": "PM Fasal Bima Yojana (PMFBY)",
        "description": "Crop insurance scheme supporting sustainable production in agriculture sector",
        "eligibility": {"land_holding_max_acres": 100, "land_ownership": "tenant_or_owner"},
        "benefit": "Financial support for crop loss due to natural calamities",
        "apply_url": "https://pmfby.gov.in",
        "keywords": ["insurance", "bima", "claim", "damage", "calamity", "drought", "flood"]
    },
    {
        "id": "kcc",
        "name": "Kisan Credit Card (KCC)",
        "description": "Provides farmers with timely access to credit/loans for cultivation expenses",
        "eligibility": {"land_holding_max_acres": 50, "land_ownership": "any"},
        "benefit": "Subsidized crop loans up to ₹3 Lakhs at 4% interest rate",
        "apply_url": "https://pmkisan.gov.in/kisancard.aspx",
        "keywords": ["loan", "credit", "card", "bank", "money", "capital"]
    },
    {
        "id": "drip_irrigation",
        "name": "Per Drop More Crop (Micro Irrigation Scheme)",
        "description": "Government subsidy for installation of drip and sprinkler irrigation systems (varies by country/state — check local agriculture department)",
        "eligibility": {"land_holding_max_acres": 25, "state": "any"},
        "benefit": "Subsidy of 50-90% for drip and sprinkler systems (check local rates)",
        "apply_url": "https://pmksy.gov.in",
        "keywords": ["drip", "sprinkler", "water", "irrigation", "subsidy"]
    }
]

class SchemeService:
    def __init__(self):
        self.model = None

    async def find_schemes(self, query: str, farmer_profile: dict) -> list:
        q = query.lower()
        matched = []

        # Simple keyword matching as fallback
        for s in SCHEMES_DB:
            score = 0.0
            if any(kw in q for kw in s["keywords"]):
                score = 0.8
            if s["name"].lower() in q or s["description"].lower() in q:
                score = 0.95

            # Filter eligibility
            eligibility_status = "eligible"
            reasons = []

            farmer_land = farmer_profile.get("farmSize", 2.0)
            max_acres = s["eligibility"].get("land_holding_max_acres", 100)
            if farmer_land > max_acres:
                eligibility_status = "check_required"
                reasons.append(f"Land exceeds {max_acres} acres")

            req_state = s["eligibility"].get("state")
            # If scheme is open to any state, skip state check
            if req_state and req_state.lower() != "any":
                farmer_state = farmer_profile.get("state", "")
                if farmer_state and req_state.lower() != farmer_state.lower():
                    eligibility_status = "likely_eligible"
                    reasons.append(f"Scheme may be specific to {req_state}")

            if score > 0:
                matched.append({
                    **s,
                    "score": score,
                    "eligibility_status": eligibility_status,
                    "reasons": reasons
                })

        # Return sorted by score
        if matched:
            return sorted(matched, key=lambda x: x["score"], reverse=True)
        
        # Return all schemes if no specific search hits
        return [{**s, "score": 0.5, "eligibility_status": "eligible", "reasons": []} for s in SCHEMES_DB]

scheme_service = SchemeService()

async def find_schemes(query: str, farmer_profile: dict) -> list:
    return await scheme_service.find_schemes(query, farmer_profile)
