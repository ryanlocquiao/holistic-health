-------------------------------------------------------
-- Add changes with: npm run migrate
-- Verify migration by checking table/index presence
-- in your PostgreSQL client after execution.
-------------------------------------------------------

-- Compounds: Every herb, supplement, or natural remedy
CREATE TABLE IF NOT EXISTS compounds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100),
    description TEXT,
    evidence_tier INTEGER CHECK (evidence_tier IN (1, 2, 3)),
    source_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ailments: Conditions and symptoms users search by
CREATE TABLE IF NOT EXISTS ailments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);

-- Users: Authenticated accounts
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Medications:
CREATE TABLE IF NOT EXISTS medications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    common_name VARCHAR(255)
);

-- Sources: Stores citation data for compounds
CREATE TABLE IF NOT EXISTS sources (
    id SERIAL PRIMARY KEY,
    compound_id INTEGER REFERENCES compounds(id) ON DELETE CASCADE,
    title TEXT,
    url TEXT,
    doi VARCHAR(255),
    publisher VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Compound Ailments:
CREATE TABLE IF NOT EXISTS compound_ailments (
    compound_id INTEGER REFERENCES compounds(id) ON DELETE CASCADE,
    ailment_id INTEGER REFERENCES ailments(id) ON DELETE CASCADE,
    PRIMARY KEY (compound_id, ailment_id)
);

-- User Medications:
CREATE TABLE IF NOT EXISTS user_medications (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    medication_id INTEGER REFERENCES medications(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, medication_id)
);

-- Interactions:
CREATE TABLE IF NOT EXISTS interactions (
    id SERIAL PRIMARY KEY,
    compound_id INTEGER REFERENCES compounds(id) ON DELETE CASCADE,
    medication_id INTEGER REFERENCES medications(id) ON DELETE CASCADE,
    severity INTEGER CHECK (severity IN (1, 2, 3)),
    description TEXT
);

-- Indexes for common lookups and join paths.
CREATE INDEX IF NOT EXISTS idx_compounds_name ON compounds(name);
CREATE INDEX IF NOT EXISTS idx_ailments_name ON ailments(name);
CREATE INDEX IF NOT EXISTS idx_compound_ailments_compound ON compound_ailments(compound_id);
CREATE INDEX IF NOT EXISTS idx_compound_ailments_ailment ON compound_ailments(ailment_id);
CREATE INDEX IF NOT EXISTS idx_compounds_evidence_tier ON compounds(evidence_tier);