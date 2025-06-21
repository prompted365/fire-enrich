-- P&C Insurance Agent Platform Schema (MVP)

-- Stores information about different insurance agencies
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    -- status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')), -- For future use
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores settings specific to each agency, like commission rates and retention
CREATE TABLE IF NOT EXISTS agency_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    new_business_comp_pct DECIMAL(5,2) DEFAULT 15.00,
    first_renewal_comp_pct DECIMAL(5,2) DEFAULT 10.00,
    renewal_comp_pct DECIMAL(5,2) DEFAULT 8.00,
    retention_rate_pct DECIMAL(5,2) DEFAULT 75.00,
    -- target_dials_per_day INTEGER DEFAULT 100, -- For future use
    -- target_contacts_per_day INTEGER DEFAULT 30, -- For future use
    -- target_quotes_per_day INTEGER DEFAULT 10, -- For future use
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agency_id) -- Each agency has only one settings row
);

-- Core table for tracking daily activities and dial efficiency metrics
-- For MVP, we assume one agent per agency or agency-level tracking to simplify.
-- Agent-specific tracking can be added by linking to an 'agents' table.
CREATE TABLE IF NOT EXISTS daily_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    -- agent_id UUID REFERENCES agents(id) ON DELETE CASCADE, -- For future agent-specific tracking
    activity_date DATE NOT NULL,

    -- Core Lead Conversion Funnel Metrics (as per prompt)
    dials INTEGER DEFAULT 0,
    contacts INTEGER DEFAULT 0,
    transfers INTEGER DEFAULT 0,            -- Qualified leads passed to closers
    quoted_transfers INTEGER DEFAULT 0,     -- Transfers that received a quote
    failed_transfers INTEGER DEFAULT 0,     -- Transfers that did not result in a quote
    sales_qty INTEGER DEFAULT 0,            -- Number of policies sold
    premium_sold DECIMAL(12,2) DEFAULT 0,   -- Total premium amount from sales

    -- Marketing & Cost Tracking (as per prompt)
    marketing_spend DECIMAL(10,2) DEFAULT 0,
    lead_cost DECIMAL(8,2) DEFAULT 0,       -- Cost per lead, if applicable
    -- leads_purchased INTEGER DEFAULT 0, -- Can be added if tracking lead volume directly

    -- For MVP, keeping notes simple. Can be expanded.
    -- notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensures one activity entry per agency per day.
    -- If agent_id is added, it would be UNIQUE(agency_id, agent_id, activity_date)
    UNIQUE(agency_id, activity_date)
);

-- Optional: Add a trigger function to update 'updated_at' columns automatically
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to relevant tables
CREATE TRIGGER set_timestamp_agencies
BEFORE UPDATE ON agencies
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_agency_settings
BEFORE UPDATE ON agency_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_daily_activities
BEFORE UPDATE ON daily_activities
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
