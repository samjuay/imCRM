-- ImCRM Production-Ready PostgreSQL / Supabase Schema Migration
-- Designed in compliance with the ImCRM Product Requirements Document and synchronized Types

-- 1. EXTENSIONS & CUSTOM TYPE DEFINITIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Role Enum
CREATE TYPE user_role AS ENUM (
  'company_admin',
  'team_leader',
  'sales_executive'
);

-- Site Visit Status
CREATE TYPE site_visit_status AS ENUM (
  'scheduled',
  'confirmed',
  'visited',
  'cancelled'
);

-- Lead Status Enum (Hardened: Removed legacy 'None' value)
CREATE TYPE lead_status AS ENUM (
  'New',
  'Attempted',
  'Connected',
  'Followup Scheduled',
  'Interested',
  'Site Visit Scheduled',
  'Site Visit Done',
  'Negotiation',
  'Booking Done',
  'Not Interested',
  'Lost',
  'Invalid'
);


-- 2. CORE DATABASE TABLES

-- Table: companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team_leader_id UUID, -- Will point to profiles.id as FK later or handled logically
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: profiles (corresponds to users, linked with auth.users in Supabase)
CREATE TABLE profiles (
  id UUID PRIMARY KEY, -- references auth.users(id)
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'sales_executive',
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint back to teams
ALTER TABLE teams ADD CONSTRAINT fk_teams_leader FOREIGN KEY (team_leader_id) REFERENCES profiles(id) ON DELETE RESTRICT;

-- Table: lead_sources
CREATE TABLE lead_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: cold_data
CREATE TABLE cold_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  alternate_phone TEXT,
  city TEXT,
  location TEXT,
  source_id UUID NOT NULL REFERENCES lead_sources(id) ON DELETE RESTRICT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'New', -- New, Attempted, Connected, Followup Required, Interested, Not Interested, Wrong Number, Duplicate, Converted To Lead
  assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  converted_lead_id UUID, -- Will link to leads table
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  alternate_phone TEXT,
  email TEXT,
  city TEXT,
  location TEXT,
  source_id UUID NOT NULL REFERENCES lead_sources(id) ON DELETE RESTRICT,
  project_interests UUID[] DEFAULT '{}', -- Array of project GUIDs
  budget_min NUMERIC,
  budget_max NUMERIC,
  bedroom_preference TEXT, -- "1BHK" | "2BHK" | "3BHK" etc.
  status lead_status NOT NULL DEFAULT 'New',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  booking_amount NUMERIC,
  booking_date DATE,
  converted_from_cold_id UUID REFERENCES cold_data(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint back to cold_data
ALTER TABLE cold_data ADD CONSTRAINT fk_cold_data_converted_lead FOREIGN KEY (converted_lead_id) REFERENCES leads(id) ON DELETE SET NULL;

-- Table: lead_status_updates (Hardened: remark is made NOT NULL to be mandatory)
CREATE TABLE lead_status_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  previous_status lead_status NOT NULL,
  new_status lead_status NOT NULL,
  outcome TEXT,
  remark TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: followups
CREATE TABLE followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL DEFAULT 'Call', -- Call / WhatsApp / In-Person
  notes TEXT, -- Agenda
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  outcome_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  builder_name TEXT,
  rera_number TEXT,
  city TEXT NOT NULL,
  location TEXT,
  description TEXT,
  amenities JSONB DEFAULT '[]'::jsonb,
  possession_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- active, sold_out, on_hold
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: project_configurations (replaces legacy physical inventory units)
CREATE TABLE project_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  configuration_type TEXT NOT NULL, -- "1BHK" | "2BHK" | "3BHK"
  carpet_area NUMERIC NOT NULL,     -- In sqft
  price NUMERIC NOT NULL,           -- Total package list price in currency
  unit_count INT NOT NULL DEFAULT 1,-- Number of available units for sale
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: site_visits
CREATE TABLE site_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  visitors_count INT NOT NULL DEFAULT 1,
  transport_arranged BOOLEAN NOT NULL DEFAULT FALSE,
  status site_visit_status NOT NULL DEFAULT 'scheduled',
  visited_at TIMESTAMPTZ,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: activities
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT
);


-- 3. KEY DATABASE INDEXES
-- Profiles Indexes
CREATE INDEX idx_profiles_company_role ON profiles (company_id, role);
CREATE INDEX idx_profiles_team ON profiles (team_id);

-- Leads Indexes
CREATE INDEX idx_leads_company_status ON leads (company_id, status);
CREATE INDEX idx_leads_assigned_to ON leads (assigned_to);
CREATE INDEX idx_leads_source_id ON leads (source_id);

-- Followups Indexes
CREATE INDEX idx_followups_lead_id ON followups (lead_id);
CREATE INDEX idx_followups_scheduled ON followups (company_id, scheduled_at, completed);

-- Site Visits Indexes
CREATE INDEX idx_site_visits_lead_id ON site_visits (lead_id);
CREATE INDEX idx_site_visits_date ON site_visits (company_id, scheduled_date);

-- Status Updates Indexes
CREATE INDEX idx_status_updates_lead_id ON lead_status_updates (lead_id);
CREATE INDEX idx_status_updates_user_date ON lead_status_updates (user_id, created_at);

-- Cold Data and Projects Configurations Indexes
CREATE INDEX idx_cold_data_phone ON cold_data (company_id, phone);
CREATE INDEX idx_project_configurations_proj ON project_configurations (project_id);

-- Activities Indexes
CREATE INDEX idx_activities_lead_id ON activities (lead_id);
CREATE INDEX idx_activities_company_type_date ON activities (company_id, activity_type, created_at);
CREATE INDEX idx_activities_user_date ON activities (user_id, created_at);


-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Dynamic helper functions for custom checks
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY policy_profiles_access ON profiles
  FOR ALL TO authenticated
  USING (
    (get_current_user_role() = 'company_admin' AND company_id = get_current_user_company_id()) OR
    (get_current_user_role() = 'team_leader' AND team_id = get_current_user_team_id()) OR
    (id = auth.uid())
  );

-- Teams policies
CREATE POLICY policy_teams_access ON teams
  FOR ALL TO authenticated
  USING (
    (get_current_user_role() = 'company_admin' AND company_id = get_current_user_company_id()) OR
    (get_current_user_role() = 'team_leader' AND id = get_current_user_team_id())
  );

-- Lead Sources policies (Supports universal/system-wide defaults where company_id is NULL)
CREATE POLICY policy_lead_sources_access ON lead_sources
  FOR ALL TO authenticated
  USING (
    company_id IS NULL OR company_id = get_current_user_company_id()
  );

-- Leads Policies
CREATE POLICY policy_leads_access ON leads
  FOR ALL TO authenticated
  USING (
    (get_current_user_role() = 'company_admin' AND company_id = get_current_user_company_id()) OR
    (get_current_user_role() = 'team_leader' AND assigned_to IN (SELECT id FROM profiles WHERE team_id = get_current_user_team_id())) OR
    (assigned_to = auth.uid())
  );

-- Cold Data Policies
CREATE POLICY policy_cold_data_access ON cold_data
  FOR ALL TO authenticated
  USING (
    (get_current_user_role() = 'company_admin' AND company_id = get_current_user_company_id()) OR
    (get_current_user_role() = 'team_leader' AND assigned_to IN (SELECT id FROM profiles WHERE team_id = get_current_user_team_id())) OR
    (assigned_to = auth.uid())
  );

-- Site Visits Policies
CREATE POLICY policy_site_visits_access ON site_visits
  FOR ALL TO authenticated
  USING (
    (get_current_user_role() = 'company_admin' AND company_id = get_current_user_company_id()) OR
    (get_current_user_role() = 'team_leader' AND user_id IN (SELECT id FROM profiles WHERE team_id = get_current_user_team_id())) OR
    (user_id = auth.uid())
  );

-- Followups Policies
CREATE POLICY policy_followups_access ON followups
  FOR ALL TO authenticated
  USING (
    (get_current_user_role() = 'company_admin' AND company_id = get_current_user_company_id()) OR
    (get_current_user_role() = 'team_leader' AND user_id IN (SELECT id FROM profiles WHERE team_id = get_current_user_team_id())) OR
    (user_id = auth.uid())
  );

-- Status Updates Policies
CREATE POLICY policy_status_updates_access ON lead_status_updates
  FOR ALL TO authenticated
  USING (
    (get_current_user_role() = 'company_admin' AND company_id = get_current_user_company_id()) OR
    (get_current_user_role() = 'team_leader' AND user_id IN (SELECT id FROM profiles WHERE team_id = get_current_user_team_id())) OR
    (user_id = auth.uid())
  );

-- Project Configurations Policies
CREATE POLICY policy_project_configurations_access ON project_configurations
  FOR ALL TO authenticated
  USING (
    company_id = get_current_user_company_id()
  );

-- Projects Policies
CREATE POLICY policy_projects_access ON projects
  FOR ALL TO authenticated
  USING (
    company_id = get_current_user_company_id()
  );

-- Companies Policies
CREATE POLICY policy_companies_access ON companies
  FOR ALL TO authenticated
  USING (
    id = get_current_user_company_id()
  );

-- Activities Policies
CREATE POLICY policy_activities_access ON activities
  FOR ALL TO authenticated
  USING (
    (get_current_user_role() = 'company_admin' AND company_id = get_current_user_company_id()) OR
    (get_current_user_role() = 'team_leader' AND user_id IN (SELECT id FROM profiles WHERE team_id = get_current_user_team_id())) OR
    (user_id = auth.uid())
  );
