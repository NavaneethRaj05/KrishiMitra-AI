// Find crops suitable for a given soil type and region
MATCH (r:Region {name: $region})-[:HISTORICALLY_GROWS]->(c:Crop)-[:GROWS_IN]->(s:SoilType {name: $soil_type})
RETURN c.name AS crop, c.season, c.water_req, c.duration_days
ORDER BY c.name;

// Find crops for a given soil pH range
MATCH (c:Crop)-[:GROWS_IN]->(s:SoilType)
WHERE s.ph_min <= $ph AND s.ph_max >= $ph
RETURN DISTINCT c.name AS crop, c.season, s.name AS soil
ORDER BY c.name;

// Full crop profile with disease risks and treatment
MATCH (c:Crop {name: $crop_name})
OPTIONAL MATCH (c)-[vt:VULNERABLE_TO]->(d:Disease)-[:TREATED_BY]->(p:Pesticide)
OPTIONAL MATCH (c)-[:NEEDS]->(f:Fertilizer)
RETURN c.name, c.season, c.water_req,
       collect(DISTINCT d.name) AS diseases,
       collect(DISTINCT p.name) AS treatments,
       collect(DISTINCT f.name) AS fertilizers;
