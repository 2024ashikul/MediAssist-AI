import sqlite3
import re
from pathlib import Path
from .models import MedicineSearchResult,MedicineSearchResponse,MedicineDetail

DB_PATH = Path(__file__).parent.parent / "medicine_data" / "medex.db"
def get_connection():
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)  
    conn.row_factory = sqlite3.Row
    return conn

def strip_html(text: str) -> str:
    if not text:
        return ""
    return re.sub(r"<[^>]+>", "", text).strip()

def search_brand(query: str, limit: int = 5) -> list[MedicineSearchResult]:
    conn = get_connection()
    safe_query = query.replace('"', '""')
    fts_query = f'"{safe_query}"'

    rows = conn.execute("""
        SELECT bf.brand_id, bf.brand_name, bf.generic_name,
            bf.strength, bf.dosage_form, bf.manufacturer, bf.type
        FROM brand_search bs
        JOIN brand_full bf ON bf.brand_id = bs.rowid
        WHERE brand_search MATCH ?
        ORDER BY rank
        LIMIT ?
    """, (fts_query, limit)).fetchall()
    conn.close()

    return [MedicineSearchResult(**dict(row)) for row in rows]

def get_brand_by_id(brand_id: int) -> MedicineDetail | None:
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM brand_full WHERE brand_id = ?", (brand_id,)
    ).fetchone()
    conn.close()

    if not row:
        return None

    data = dict(row)

    html_fields = [
    "indication_description", "pharmacology_description",
    "administration_description",
    "interaction_description", "contraindications_description",
    "side_effects_description", "pregnancy_and_lactation_description",
    "precautions_description", "pediatric_usage_description",
    "overdose_effects_description", "duration_of_treatment_description",
    "reconstitution_description", "storage_conditions_description",
    # "dosage_description" intentionally excluded — kept as raw HTML
    ]    
    for field in html_fields:
        data[field] = strip_html(data.get(field))

    return MedicineDetail(**data)