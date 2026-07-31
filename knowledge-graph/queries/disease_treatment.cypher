// Find all diseases affecting a specific crop with treatments
MATCH (c:Crop {name: $crop_name})-[vt:VULNERABLE_TO]->(d:Disease)
OPTIONAL MATCH (d)-[:TREATED_BY]->(p:Pesticide)
RETURN c.name AS crop,
       d.name AS disease,
       d.type AS disease_type,
       d.severity AS severity,
       d.cause AS cause,
       collect(p.name + ' (' + p.dosage + ')') AS treatments
ORDER BY d.severity DESC;

// Find treatment for a specific disease
MATCH (d:Disease {name: $disease_name})
OPTIONAL MATCH (d)-[tb:TREATED_BY]->(p:Pesticide)
RETURN d.name, d.type, d.cause, d.severity,
       p.name AS pesticide,
       p.type AS pesticide_type,
       p.dosage AS dosage,
       tb.stage AS application_stage;

// Full disease network — all crops, diseases and treatments
MATCH (c:Crop)-[:VULNERABLE_TO]->(d:Disease)-[:TREATED_BY]->(p:Pesticide)
RETURN c.name AS crop, d.name AS disease, d.type AS type,
       collect(DISTINCT p.name) AS treatments
ORDER BY c.name, d.severity DESC;

// Find alternative crops for a disease-affected field
// (crops that are NOT vulnerable to a given disease)
MATCH (safe:Crop)
WHERE NOT (safe)-[:VULNERABLE_TO]->(:Disease {name: $disease_name})
RETURN safe.name AS safe_crop, safe.season, safe.water_req
ORDER BY safe.name;
