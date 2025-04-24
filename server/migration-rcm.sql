-- RCM Module Tables

-- Systems table
CREATE TABLE IF NOT EXISTS systems (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    operating_context TEXT NOT NULL,
    boundaries TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Components table with self-referencing parent relationship
CREATE TABLE IF NOT EXISTS components (
    id SERIAL PRIMARY KEY,
    system_id INTEGER NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    function TEXT NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES components(id),
    criticality TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Performance Standards table
CREATE TABLE IF NOT EXISTS performance_standards (
    id SERIAL PRIMARY KEY,
    system_id INTEGER NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    component_id INTEGER REFERENCES components(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    target_value TEXT NOT NULL,
    unit TEXT,
    tolerance TEXT,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Functional Failures table
CREATE TABLE IF NOT EXISTS functional_failures (
    id SERIAL PRIMARY KEY,
    component_id INTEGER NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    failure_impact TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- FMECA Ratings table
CREATE TABLE IF NOT EXISTS fmeca_ratings (
    id SERIAL PRIMARY KEY,
    failure_mode_id INTEGER NOT NULL REFERENCES failure_modes(id) ON DELETE CASCADE,
    severity INTEGER NOT NULL,
    occurrence INTEGER NOT NULL,
    detection INTEGER NOT NULL,
    rpn INTEGER NOT NULL,
    criticality TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- RCM Consequences table
CREATE TABLE IF NOT EXISTS rcm_consequences (
    id SERIAL PRIMARY KEY,
    failure_mode_id INTEGER NOT NULL REFERENCES failure_modes(id) ON DELETE CASCADE,
    safety BOOLEAN DEFAULT FALSE,
    environmental BOOLEAN DEFAULT FALSE,
    operational BOOLEAN DEFAULT FALSE,
    economic BOOLEAN DEFAULT FALSE,
    consequence_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Maintenance Tasks table
CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id SERIAL PRIMARY KEY,
    failure_mode_id INTEGER NOT NULL REFERENCES failure_modes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    task_type TEXT NOT NULL,
    interval REAL,
    interval_unit TEXT,
    rationale TEXT NOT NULL,
    effectiveness INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- RAM Metrics table
CREATE TABLE IF NOT EXISTS ram_metrics (
    id SERIAL PRIMARY KEY,
    component_id INTEGER NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    failure_rate REAL NOT NULL,
    mtbf REAL NOT NULL,
    mttr REAL NOT NULL,
    availability REAL NOT NULL,
    calculated_reliability REAL NOT NULL,
    time_horizon REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);