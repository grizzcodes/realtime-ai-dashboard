-- DGenz World Supabase Schema Update
-- This script updates the existing tables to match your brand requirements

-- ============================================
-- 1. UPDATE CLIENTS TABLE (formerly could be repurposed from existing table)
-- ============================================

-- Drop existing clients table if it exists and recreate with new structure
DROP TABLE IF EXISTS clients CASCADE;

CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_article TEXT, -- Brand/Article column
  domain TEXT,
  type TEXT CHECK (type IN ('Brand', 'Agency', 'IP')),
  contact_name TEXT,
  email TEXT,
  notes TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id) -- For tracking who owns this client
);

-- Create indexes for better performance
CREATE INDEX idx_clients_type ON clients(type);
CREATE INDEX idx_clients_assigned_to ON clients(assigned_to);
CREATE INDEX idx_clients_created_by ON clients(created_by);

-- ============================================
-- 2. KEEP LEADS TABLE (with modifications for team access)
-- ============================================

-- Modify leads table to include ownership
DROP TABLE IF EXISTS leads CASCADE;

CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT,
  stage TEXT CHECK (stage IN ('new', 'contacted', 'demo', 'proposal', 'negotiation', 'closed-won', 'closed-lost')),
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id), -- Individual lead ownership
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_created_by ON leads(created_by);

-- ============================================
-- 3. CREATE PEOPLE TABLE (Team Directory)
-- ============================================

DROP TABLE IF EXISTS people CASCADE;

CREATE TABLE people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT,
  department TEXT,
  phone TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 4. KEEP OUTREACH TABLE
-- ============================================

DROP TABLE IF EXISTS outreach CASCADE;

CREATE TABLE outreach (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('email', 'call', 'meeting', 'linkedin', 'other')),
  subject TEXT,
  content TEXT,
  status TEXT CHECK (status IN ('planned', 'sent', 'responded', 'no-response')),
  scheduled_date TIMESTAMP,
  completed_date TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_outreach_client_id ON outreach(client_id);
CREATE INDEX idx_outreach_lead_id ON outreach(lead_id);
CREATE INDEX idx_outreach_created_by ON outreach(created_by);

-- ============================================
-- 5. KEEP ACTIVITY LOGS TABLE
-- ============================================

DROP TABLE IF EXISTS activity_logs CASCADE;

CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- ============================================
-- 6. INSERT SAMPLE DATA FROM YOUR SPREADSHEET
-- ============================================

-- Insert sample clients data (from your spreadsheet)
INSERT INTO clients (brand_article, domain, type, contact_name, email, notes) VALUES
('TOMMY HILFIGER', 'tommy.com', 'Brand', 'Pauline', 'paulineventura@tommy.com', 'Finishing Mykonos, next NYFW'),
('Eberjey', 'eberjey.com', 'Brand', 'Hannah', 'hannah.deboer@eberjey.com', 'Awaiting V5 confirmation'),
('HOLT RENFREW', 'holtrenfrew.com', 'Brand', 'Oriana', 'Oriana.Doan@holtrenfrew.com', 'Awaiting idea validation'),
('PUBLICIS', 'publicisna.com', 'Agency', 'Jennifer', 'jennifer.appel@publicisna.com', 'Brainstorm new ideas'),
('LOTO QUEBEC', 'loto-quebec.com', 'Brand', 'Corrine', 'Corrine.Millette@loto-quebec.com', 'Brainstorm new ideas'),
('CLARINS', 'clarins.com', 'Brand', 'Maude', 'maude.hamel@clarins.com', 'Summer Campaign'),
('CLARK Influence', 'https://www.clarkinfluence.com', 'Agency', 'Aisling', 'maude.hamel@clarins.com', 'Active'),
('GARAGE', 'https://www.garageclothing.com/us/', 'Brand', 'Marissa', 'mmezzaluna@dynamite.ca', 'Active'),
('WowWee', 'https://wowwee.com', 'IP', 'Richard', 'richard@wowwee.com', NULL),
('Sundae Creative', 'https://sundaecreative.com', 'Agency', 'Anna', 'anna@sundaecreative.com', NULL),
('Costco Wholesale UK', 'https://www.costco.com/', 'Brand', 'Jan', 'jsemple@costco.co.uk', 'Campaign 1 Finished, waiting for new one'),
('Dynamite', 'dynamite.ca', 'Brand', 'Manuela', 'mdposta@dynamite.ca', NULL),
('HAVAS FR', 'https://www.havas.fr/', 'Agency', 'Jenny', 'j.amelkar@intlmarreandco.com', NULL),
('GOODLES', 'www.goodles.com/', 'Brand', 'Virginia', 'virginia@gooderfoods.co', NULL),
('Get Engaged Media', 'https://getengagedmedia.com/', 'Agency', 'Ben', 'ben@getengagedmedia.com', NULL),
('Bell Media', 'https://www.bellmedia.ca/', 'Brand', 'Maude', 'maude.stmaurice@bell.ca', NULL),
('Royalmount', 'https://www.royalmount.com/', 'Brand', 'Christina', 'ckrcevinac@carbonleo.com', 'Campaign 1 Finished, waiting for next one'),
('FYI Doctors', 'https://fyidoctors.com', 'Brand', 'Kelly', 'Kelly.Issa@fyidoctors.com', 'waiting for back from vacation'),
('GUT Agency', 'https://www.gut.agency/', 'Agency', 'Victoria', 'victoriavecchio@gut.agency', 'texted Vic'),
('GT Living Foods', 'https://gtslivingfoods.com/', 'Brand', 'Nick', 'nelliott@drinkgts.com', 'GT revamp'),
('Skinny Confidential', 'https://www.theskinnyconfidential.com/', 'Brand', 'Paige', 'paige@theskinnyconfidential.com', 'Campaign starting'),
('Fruit Riot', NULL, NULL, NULL, NULL, 'Working on Test');

-- ============================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM people 
    WHERE email = (SELECT email FROM auth.users WHERE id = user_id)
    AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has @dgenz.world email
CREATE OR REPLACE FUNCTION has_dgenz_email(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND email LIKE '%@dgenz.world'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CLIENTS: All @dgenz.world users can view, admins can edit
CREATE POLICY "Clients visible to all dgenz users" ON clients
  FOR SELECT USING (has_dgenz_email(auth.uid()));

CREATE POLICY "Clients editable by admins" ON clients
  FOR ALL USING (is_admin(auth.uid()));

-- LEADS: Users see their own leads, admins see all
CREATE POLICY "Users see own leads" ON leads
  FOR SELECT USING (
    assigned_to = auth.uid() OR 
    is_admin(auth.uid())
  );

CREATE POLICY "Users can edit own leads" ON leads
  FOR UPDATE USING (
    assigned_to = auth.uid() OR 
    is_admin(auth.uid())
  );

CREATE POLICY "Users can create leads" ON leads
  FOR INSERT WITH CHECK (has_dgenz_email(auth.uid()));

CREATE POLICY "Admins can delete leads" ON leads
  FOR DELETE USING (is_admin(auth.uid()));

-- PEOPLE: All dgenz users can view
CREATE POLICY "People visible to dgenz users" ON people
  FOR SELECT USING (has_dgenz_email(auth.uid()));

CREATE POLICY "People editable by admins" ON people
  FOR ALL USING (is_admin(auth.uid()));

-- OUTREACH: Users see their own + related to their leads/clients
CREATE POLICY "Outreach visible to creators and admins" ON outreach
  FOR SELECT USING (
    created_by = auth.uid() OR
    is_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM leads WHERE leads.id = outreach.lead_id AND leads.assigned_to = auth.uid())
  );

CREATE POLICY "Outreach editable by creators and admins" ON outreach
  FOR ALL USING (
    created_by = auth.uid() OR 
    is_admin(auth.uid())
  );

-- ACTIVITY LOGS: Users see their own, admins see all
CREATE POLICY "Activity logs visible to users and admins" ON activity_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    is_admin(auth.uid())
  );

CREATE POLICY "Activity logs created by system" ON activity_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 8. CREATE TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. GRANT PERMISSIONS (for service role)
-- ============================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;