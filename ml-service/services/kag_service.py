"""
KAG Service — Knowledge Augmented Generation via Neo4j graph queries.
Complements RAG: RAG handles unstructured document retrieval,
KAG handles structured relational reasoning
(crop ↔ disease ↔ soil ↔ treatment).
"""
import logging
import os
from typing import Any, Optional

from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable

logger = logging.getLogger("krishimitraai.kag")

URI  = os.getenv("NEO4J_URI",      "bolt://neo4j:7687")
USER = os.getenv("NEO4J_USER",     "neo4j")
PASS = os.getenv("NEO4J_PASSWORD", "krishimitraai123")


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

    def _run(self, query: Any, **params) -> list:
        with self._get_driver().session() as session:
            return [dict(record) for record in session.run(query, **params)]

    # ──────────────────────────────────────────
    def get_diseases_for_crop(self, crop_name: str) -> list:
        """Return all diseases a crop is vulnerable to."""
        return self._run(
            """
            MATCH (c:Crop {name: $crop})-[:VULNERABLE_TO]->(d:Disease)
            RETURN d.name AS disease, d.type AS type,
                   d.severity AS severity, d.cause AS cause
            """,
            crop=crop_name,
        )

    def get_treatments_for_disease(self, disease_name: str) -> list:
        """Return all treatments for a given disease."""
        return self._run(
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
            return self._run(
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
        return self._run(
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
        crop_info = self._run(
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
        return self._run(
            f"""
            MATCH (d:Disease {{name: $disease}})-[:TREATED_BY]->(t:Treatment)
            WHERE 1=1 {filter_clause}
            RETURN t.name AS treatment, t.type AS type,
                   t.organic AS organic, t.dosage AS dosage
            """,
            disease=disease_name,
        )

    def health_check(self) -> bool:
        try:
            self._run("RETURN 1 AS ok")
            return True
        except (ServiceUnavailable, Exception) as e:
            logger.warning("KAG health check failed: %s", e)
            return False

    def get_entire_graph(self) -> dict:
        """Fetch all nodes and relationships for visualization."""
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
