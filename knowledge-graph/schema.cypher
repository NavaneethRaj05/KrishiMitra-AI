// ── KrishiMind Knowledge Graph Schema ──
// Run in Neo4j Browser (localhost:7474) after seeding

// Constraints (ensure uniqueness)
CREATE CONSTRAINT crop_name    IF NOT EXISTS FOR (c:Crop)      REQUIRE c.name IS UNIQUE;
CREATE CONSTRAINT disease_name IF NOT EXISTS FOR (d:Disease)   REQUIRE d.name IS UNIQUE;
CREATE CONSTRAINT soil_type    IF NOT EXISTS FOR (s:SoilType)  REQUIRE s.name IS UNIQUE;
CREATE CONSTRAINT pesticide_id IF NOT EXISTS FOR (p:Pesticide) REQUIRE p.name IS UNIQUE;
CREATE CONSTRAINT season_name  IF NOT EXISTS FOR (s:Season)    REQUIRE s.name IS UNIQUE;
CREATE CONSTRAINT region_name  IF NOT EXISTS FOR (r:Region)    REQUIRE r.name IS UNIQUE;
CREATE CONSTRAINT fertilizer_n IF NOT EXISTS FOR (f:Fertilizer) REQUIRE f.name IS UNIQUE;

// Indexes for fast lookup
CREATE INDEX crop_season_idx  IF NOT EXISTS FOR (c:Crop)    ON (c.season);
CREATE INDEX disease_type_idx IF NOT EXISTS FOR (d:Disease) ON (d.type);
CREATE INDEX region_state_idx IF NOT EXISTS FOR (r:Region)  ON (r.state);

// Government schemes constraints
CREATE CONSTRAINT scheme_id IF NOT EXISTS FOR (s:Scheme) REQUIRE s.id IS UNIQUE;

// Market nodes constraints
CREATE CONSTRAINT mandi_id IF NOT EXISTS FOR (m:Mandi) REQUIRE m.id IS UNIQUE;

// Input dealer constraints
CREATE CONSTRAINT dealer_id IF NOT EXISTS FOR (d:InputDealer) REQUIRE d.id IS UNIQUE;

