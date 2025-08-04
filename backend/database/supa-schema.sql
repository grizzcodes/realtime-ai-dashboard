-- Supabase Database Schema for SUPA Dashboard
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- People table (contacts, team members)
CREATE TABLE people (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  company TEXT,
  email TEXT,
  linkedin TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'lost')),
  contact_id UUID REFERENCES people(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads table
CREATE TABLE leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT DEFAULT 'linkedin' CHECK (source IN ('linkedin', 'email', 'referral', 'website', 'cold')),
  stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'demo', 'proposal', 'won', 'lost')),
  assigned_to UUID REFERENCES people(id),
  client_id UUID REFERENCES clients(id),
  confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach table
CREATE TABLE outreach (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  channel TEXT DEFAULT 'email' CHECK (channel IN ('email', 'linkedin', 'call', 'meeting', 'text')),
  date TIMESTAMPTZ DEFAULT NOW(),
  content TEXT,
  response TEXT,
  next_step TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs table (activity tracking)
CREATE TABLE logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ai_chat', 'email_sent', 'deal_updated', 'lead_added', 'outreach_sent', 'meeting_scheduled', 'task_completed')),
  message TEXT NOT NULL,
  source_id UUID,
  source_table TEXT,
  created_by TEXT DEFAULT 'system',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_outreach_lead ON outreach(lead_id);
CREATE INDEX idx_logs_type ON logs(type);
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);

-- Row Level Security (enable but allow all for now)
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Policies (allow all operations for now)
CREATE POLICY "Allow all for people" ON people FOR ALL USING (true);
CREATE POLICY "Allow all for clients" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all for leads" ON leads FOR ALL USING (true);
CREATE POLICY "Allow all for outreach" ON outreach FOR ALL USING (true);
CREATE POLICY "Allow all for logs" ON logs FOR ALL USING (true);

-- Sample data
INSERT INTO people (name, role, company, email) VALUES
('John Smith', 'CTO', 'TechCorp', 'john@techcorp.com'),
('Sarah Johnson', 'Marketing Director', 'BrandCo', 'sarah@brandco.com'),
('Mike Chen', 'CEO', 'StartupInc', 'mike@startup.com');

INSERT INTO clients (name, industry, contact_id, notes) VALUES
('TechCorp', 'Technology', (SELECT id FROM people WHERE name = 'John Smith'), 'Enterprise client, high value'),
('BrandCo', 'Marketing', (SELECT id FROM people WHERE name = 'Sarah Johnson'), 'Growing fast, good relationship');

INSERT INTO leads (name, source, stage, confidence, notes) VALUES
('StartupInc Partnership', 'referral', 'demo', 75, 'Strong interest in our AI tools'),
('Enterprise Deal', 'linkedin', 'proposal', 60, 'Waiting on budget approval'),
('Marketing Agency Lead', 'email', 'contacted', 30, 'Initial outreach sent');
