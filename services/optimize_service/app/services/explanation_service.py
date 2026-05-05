"""Template-driven multilingual farmer explanations."""

from __future__ import annotations

from typing import Any, Dict, Optional


class ExplanationService:
    TEMPLATES: Dict[tuple[str, str], str] = {
        ("en", "why_this_crop"): (
            "{crop_name} fits this field because soil pH is {ph}, water availability is {water_mm} mm, "
            "expected yield is {yield_t} t/ha, and expected price is LKR {price}/kg."
        ),
        ("en", "why_not_paddy"): (
            "Paddy is less attractive right now because drought risk is {drought_pct}% and the current water outlook is {water_mm} mm."
        ),
        ("en", "what_changed"): (
            "The recommendation changed from {prev_crop} on {prev_date} because {change_reason}."
        ),
        ("si", "why_this_crop"): (
            "{crop_name} මෙම ඉඩමට සුදුසුයි. පසෙහි pH අගය {ph}යි, ජලය {water_mm} මි.මී. ක් ඇති අතර, "
            "අපේක්ෂිත අස්වැන්න හෙක්ටයාරයකට ටොන් {yield_t} ක් සහ මිල කිලෝවකට රු. {price} ක් වේ."
        ),
        ("si", "why_not_paddy"): (
            "දැනට වී වගාව අඩු වශයෙන් සුදුසුය. නියඟ අවදානම {drought_pct}%ක් වන අතර ජල ප්‍රවණතාව {water_mm} මි.මී. පමණි."
        ),
        ("si", "what_changed"): (
            "{prev_date} දින {prev_crop} සිට නිර්දේශය වෙනස් වුණේ {change_reason} නිසාය."
        ),
        ("ta", "why_this_crop"): (
            "{crop_name} இந்த நிலத்திற்கு பொருத்தமானது. மண் pH {ph}, நீர் கிடைமட்டு {water_mm} மிமீ, "
            "எதிர்பார்க்கப்படும் விளைச்சல் {yield_t} டன்/ஹெக்டேர், விலை கிலோக்கு ரூ. {price}."
        ),
        ("ta", "why_not_paddy"): (
            "இப்போது நெல் குறைவாக பொருத்தமாக உள்ளது. வறட்சி அபாயம் {drought_pct}% மற்றும் நீர் நிலை {water_mm} மிமீ மட்டுமே."
        ),
        ("ta", "what_changed"): (
            "{prev_date} அன்று இருந்த {prev_crop} பரிந்துரை {change_reason} காரணமாக மாற்றப்பட்டது."
        ),
    }

    @classmethod
    def generate_explanation(
        cls,
        explanation_type: str,
        language: str,
        context: Dict[str, Any],
        previous_recommendation: Optional[Dict[str, Any]] = None,
    ) -> str:
        key = (language.lower(), explanation_type)
        template = cls.TEMPLATES.get(key) or cls.TEMPLATES[("en", explanation_type)]
        merged = {
            "crop_name": context.get("crop_name", "This crop"),
            "ph": cls._fmt(context.get("ph"), 1),
            "water_mm": cls._fmt(context.get("water_mm"), 0),
            "yield_t": cls._fmt(context.get("yield_t"), 1),
            "price": cls._fmt(context.get("price"), 0),
            "profit_k": cls._fmt(context.get("profit_k"), 0),
            "drought_pct": cls._fmt(context.get("drought_pct"), 0),
            "prev_date": context.get("prev_date") or (previous_recommendation or {}).get("prev_date") or "the previous run",
            "prev_crop": context.get("prev_crop") or (previous_recommendation or {}).get("crop_name") or "the previous crop",
            "change_reason": context.get("change_reason") or "new water and market conditions were detected",
        }
        return template.format(**merged)

    @staticmethod
    def compute_change_reason(
        prev_rec: Optional[Dict[str, Any]],
        curr_rec: Optional[Dict[str, Any]],
    ) -> str:
        if not prev_rec or not curr_rec:
            return "no earlier recommendation was available"
        prev_crop = str(prev_rec.get("crop_name") or prev_rec.get("crop_id") or "")
        curr_crop = str(curr_rec.get("crop_name") or curr_rec.get("crop_id") or "")
        if prev_crop and curr_crop and prev_crop != curr_crop:
            return f"the top crop moved from {prev_crop} to {curr_crop}"

        prev_price = float(prev_rec.get("predicted_price_per_kg") or prev_rec.get("price") or 0.0)
        curr_price = float(curr_rec.get("predicted_price_per_kg") or curr_rec.get("price") or 0.0)
        prev_water = float(prev_rec.get("water_requirement_mm") or prev_rec.get("water_mm") or 0.0)
        curr_water = float(curr_rec.get("water_requirement_mm") or curr_rec.get("water_mm") or 0.0)
        if prev_price and curr_price and abs(curr_price - prev_price) / prev_price > 0.1:
            return "market price expectations shifted materially"
        if prev_water and curr_water and abs(curr_water - prev_water) / prev_water > 0.1:
            return "the water outlook changed enough to affect crop ranking"
        return "small changes in water, price, or crop fit affected the ranking"

    @staticmethod
    def _fmt(value: Any, digits: int) -> str:
        try:
            return f"{float(value):.{digits}f}"
        except (TypeError, ValueError):
            return "0"
