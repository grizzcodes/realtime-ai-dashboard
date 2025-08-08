-- DGenz People/Team Data Insert
-- Run this to add all team members to your people table

-- First, make sure RLS is disabled for easy insertion
ALTER TABLE people DISABLE ROW LEVEL SECURITY;

-- Insert all team members from your spreadsheet
INSERT INTO people (name, email, role, department, is_admin, is_active) VALUES
('Alec Chapados', 'alec@dgenz.world', 'CEO', 'Executive', true, true),
('Leo Ramlall', 'leo@dgenz.world', 'CCO', 'Executive', true, true),
('Anthony Shannon', 'anthony@good-companies.co', 'Expansion Partner', 'Business Development', false, true),
('Pablo Saltiveri', 'pablo@dgenz.world', 'Head of Production', 'Production', false, true),
('Steph Shannon', 'steph@dgenz.world', 'Head of Partnerships', 'Partnerships', false, true),
('Alexa Echeverria', 'alexa@dgenz.world', 'Executive Assistant', 'Operations', false, true),
('Pierre Rosello', 'pierre@dgenz.world', 'Prompt Engineer', 'Technology', false, true);

-- Add a notes/goals field to people table if it doesn't exist
ALTER TABLE people ADD COLUMN IF NOT EXISTS goals TEXT;

-- Update goals for each person
UPDATE people SET goals = 'Oversee Business vision, Sales, Growth and Client Acquisition' WHERE email = 'alec@dgenz.world';
UPDATE people SET goals = 'Oversee Business vision, Production team, coordination with Pablo, innovating in finding new teams and AI' WHERE email = 'leo@dgenz.world';
UPDATE people SET goals = 'Expanding the Dgenz business across the world, handling initial client conversation' WHERE email = 'anthony@good-companies.co';
UPDATE people SET goals = 'Oversee all production, managing production team' WHERE email = 'pablo@dgenz.world';
UPDATE people SET goals = 'Manage client relationships, oversee with Pablo the production' WHERE email = 'steph@dgenz.world';
UPDATE people SET goals = 'To research leads, make invoices, coordinate with team' WHERE email = 'alexa@dgenz.world';
UPDATE people SET goals = 'To fasten, ameliorate and progess in AI prompting for video generation' WHERE email = 'pierre@dgenz.world';

-- Verify the insertion worked
SELECT COUNT(*) as total_people FROM people;

-- Show all team members
SELECT name, email, role, department, goals, is_admin FROM people ORDER BY is_admin DESC, name;