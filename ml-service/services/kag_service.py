"""
KAG Service — Knowledge Augmented Generation via Neo4j graph queries.
Complements RAG: RAG handles unstructured document retrieval,
KAG handles structured relational reasoning
(crop ↔ disease ↔ soil ↔ treatment).
"""
import logging
import os
import time
from typing import Any, Optional

from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable

logger = logging.getLogger("krishimitraai.kag")

URI  = os.getenv("NEO4J_URI",      "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER",     "neo4j")
PASS = os.getenv("NEO4J_PASSWORD", "krishimitraai123")

# Availability cache — avoid connection hammering when Neo4j is down
_KAG_AVAILABLE: Optional[bool] = None
_KAG_LAST_CHECK: float = 0.0
_KAG_CHECK_TTL: float = 60.0  # re-check every 60 seconds


class KAGService:
    def __init__(self):
        self._driver = None  # lazy connect — Neo4j may not be ready at startup

    def _get_driver(self):
        if self._driver is None:
            self._driver = GraphDatabase.driver(URI, auth=(USER, PASS), connection_timeout=3.0)
        return self._driver

    def close(self):
        if self._driver:
            self._driver.close()
            self._driver = None

    def is_available(self) -> bool:
        """
        Returns True if Neo4j is reachable.
        Result is cached for _KAG_CHECK_TTL seconds to avoid hammering
        a down server on every single request.
        """
        global _KAG_AVAILABLE, _KAG_LAST_CHECK
        now = time.monotonic()
        if _KAG_AVAILABLE is not None and (now - _KAG_LAST_CHECK) < _KAG_CHECK_TTL:
            return _KAG_AVAILABLE
        try:
            self._run("RETURN 1 AS ok")
            _KAG_AVAILABLE = True
            logger.debug("KAG Neo4j: connection OK")
        except Exception as e:
            _KAG_AVAILABLE = False
            logger.info("KAG Neo4j unavailable (will retry in %ds): %s", int(_KAG_CHECK_TTL), e)
        _KAG_LAST_CHECK = now
        return bool(_KAG_AVAILABLE)

    def _run(self, query: Any, **params) -> list:
        with self._get_driver().session() as session:
            return [dict(record) for record in session.run(query, **params)]

    def _safe_run(self, query: Any, **params) -> list:
        """Run a Cypher query, returning [] if Neo4j is unavailable instead of raising."""
        if not self.is_available():
            return []
        try:
            return self._run(query, **params)
        except (ServiceUnavailable, Exception) as e:
            logger.debug("KAG query failed: %s", e)
            return []

    # ──────────────────────────────────────────
    def get_diseases_for_crop(self, crop_name: str) -> list:
        """Return all diseases a crop is vulnerable to."""
        return self._safe_run(
            """
            MATCH (c:Crop {name: $crop})-[:VULNERABLE_TO]->(d:Disease)
            RETURN d.name AS disease, d.type AS type,
                   d.severity AS severity, d.cause AS cause
            """,
            crop=crop_name,
        )

    def get_treatments_for_disease(self, disease_name: str) -> list:
        """Return all treatments for a given disease."""
        return self._safe_run(
            """
            MATCH (d:Disease {name: $disease})-[:TREATED_BY]->(t:Treatment)
            RETURN t.name AS treatment, t.type AS type,
                   t.organic AS organic, t.dosage AS dosage
            """,
            disease=disease_name,
        )

    def get_crops_for_climate(
        self, climate_zone: str, soil_type: Optional[str] = None
    ) -> list:
        """Return crops suited to a climate zone, optionally filtered by soil type."""
        if soil_type:
            return self._safe_run(
                """
                MATCH (c:Crop)-[:THRIVES_IN]->(z:ClimateZone {name: $zone})
                MATCH (c)-[:GROWS_IN]->(s:SoilType {name: $soil})
                RETURN c.name AS crop, c.duration_days AS duration,
                       c.water_req AS water_req,
                       c.min_temp AS min_temp, c.max_temp AS max_temp
                ORDER BY c.name
                """,
                zone=climate_zone,
                soil=soil_type,
            )
        return self._safe_run(
            """
            MATCH (c:Crop)-[:THRIVES_IN]->(z:ClimateZone {name: $zone})
            RETURN c.name AS crop, c.duration_days AS duration,
                   c.water_req AS water_req,
                   c.min_temp AS min_temp, c.max_temp AS max_temp
            ORDER BY c.name
            """,
            zone=climate_zone,
        )

    def get_full_crop_profile(self, crop_name: str) -> dict:
        """
        Full knowledge graph context for a crop:
        - suitable soils and climate zones
        - diseases it's vulnerable to
        - treatments for each disease
        Used to enrich RAG context before LLM generation.
        """
        if not self.is_available():
            return {"crop": {}, "diseases": []}

        crop_info = self._safe_run(
            """
            MATCH (c:Crop {name: $crop})
            OPTIONAL MATCH (c)-[:GROWS_IN]->(s:SoilType)
            OPTIONAL MATCH (c)-[:THRIVES_IN]->(z:ClimateZone)
            RETURN c.name AS name, c.duration_days AS duration,
                   c.water_req AS water_req,
                   collect(DISTINCT s.name) AS soils,
                   collect(DISTINCT z.name) AS climates
            """,
            crop=crop_name,
        )

        diseases     = self.get_diseases_for_crop(crop_name)
        disease_details = []
        for d in diseases:
            treatments = self.get_treatments_for_disease(d["disease"])
            disease_details.append({**d, "treatments": treatments})

        return {
            "crop":     crop_info[0] if crop_info else {},
            "diseases": disease_details,
        }

    def find_safe_treatments(
        self, disease_name: str, organic_only: bool = False
    ) -> list:
        """Return treatments — optionally only organic ones."""
        filter_clause = "AND t.organic = true" if organic_only else ""
        return self._safe_run(
            f"""
            MATCH (d:Disease {{name: $disease}})-[:TREATED_BY]->(t:Treatment)
            WHERE 1=1 {filter_clause}
            RETURN t.name AS treatment, t.type AS type,
                   t.organic AS organic, t.dosage AS dosage
            """,
            disease=disease_name,
        )

    def health_check(self) -> bool:
        return self.is_available()

    def get_entire_graph(self) -> dict:
        """Fetch all nodes and relationships for visualization."""
        if not self.is_available():
            return {"nodes": [], "edges": []}
        try:
            nodes = self._run(
                """
                MATCH (n)
                RETURN id(n) AS id, labels(n)[0] AS label, n.name AS name
                """
            )
            edges = self._run(
                """
                MATCH (n)-[r]->(m)
                RETURN id(n) AS source, id(m) AS target, type(r) AS type
                """
            )
            return {"nodes": nodes, "edges": edges}
        except Exception as e:
            logger.error("Failed to fetch Neo4j graph: %s", e)
            return {"nodes": [], "edges": []}


kag_service = KAGService()
