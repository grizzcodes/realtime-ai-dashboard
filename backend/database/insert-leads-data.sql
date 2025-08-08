-- DGenz Leads Data Insert
-- Run this to add all leads to your existing leads table

-- First, make sure RLS is disabled for easy insertion
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;

-- Insert all leads data from your spreadsheet
INSERT INTO leads (name, source, stage, confidence, notes) VALUES
('Paramount+', 'https://www.paramountplus.com/', 'contacted', 75, 'Brands - Puja (puja.vohra@paramount.com) - finishing up animation'),
('MediaBodies', 'mediabodies.com', 'contacted', 60, 'Agency - Edward (edward@mediabodies.com)'),
('Movers+Shakers', 'https://moversshakers.co/', 'contacted', 65, 'Agency - Evan (evan@moversshakers.co) - follow up JAN'),
('Ogilvy', 'ogilvy.com', 'contacted', 65, 'Agency - Christine (christine.cotter@ogilvy.com) - follow up JAN'),
('Doordash', 'https://www.doordash.com/', 'contacted', 70, 'Brand - James (James.delgado@doordash.com) - follow up JAN'),
('Celsius', 'https://www.celsius.com/', 'contacted', 65, 'Brand - Sai (sai@celsius.com) - follow up JAN'),
('BHVR', 'https://www.bhvr.com/', 'proposal', 80, 'Brand - Pascal (Pascal.LeRoux@bhvr.com) - finalizing ideas'),
('RenderPros', 'https://therenderpros.com/', 'new', 50, 'Agency - Cole (cole@therenderpros.com)'),
('Doordash', 'www.doordash.com', 'contacted', 70, 'Brands - James (James.delgado@doordash.com)'),
('Verizon', 'https://www.verizon.com/', 'new', 55, 'Brand - Ricardo (Ricardo.aspaizu@verizon.com)'),
('Genius Sports', 'https://www.geniussports.com/', 'contacted', 60, 'Nikky (nikky.hudson@geniussports.com) - initial email sent'),
('Genius Sports', 'https://www.geniussports.com/', 'contacted', 65, 'Micheal Cox (michael.cox@geniussports.com) - convo on LinkedIn'),
('Carwow', 'carwow.co.uk', 'contacted', 55, 'Sepi Arani (sepi.arani@carwow.co.uk) - Email sent'),
('Chai Guys', 'https://www.unilever.com', 'contacted', 50, 'Kriti Agrawal - Gstaad - Chat initiated on LinkedIn'),
('Paradise', 'paradise.london', 'demo', 85, 'Nick Jekyll (nick.jekyll@paradise.london) - Meeting on Tuesday'),
('Kepler', 'https://www.keplergrp.com/', 'contacted', 60, 'Mallory Simmonds - chat next week'),
('Wasserman (Uggs)', 'teamwass.com', 'contacted', 55, 'Tara (tara.tavallaeian@teamwass.com) - chatted, awaiting for their interest'),
('1 Milk 2 Sugars', 'https://www.1milk2sugars.com/', 'new', 50, 'Sheliza (sheliza@1milk2sugars.com)'),
('Olipop', 'http://olipop.com/', 'contacted', 60, 'Isabelle (iyellin@drinkolipop.com) - keep reaching out'),
('Lonely Girl Productions', 'https://www.lonelygirlproductions.com/', 'new', 45, 'Mount Stephen'),
('Fabletics', 'fabletics.com', 'contacted', 70, 'LRohlf@fabletics.com - Talk about both VR/AR and content'),
('Bevi', 'bevi.co', 'new', 50, 'haley.keeffe@bevi.co - reach out');

-- Verify the insertion worked
SELECT COUNT(*) as total_leads FROM leads;

-- Show all leads to confirm
SELECT * FROM leads ORDER BY created_at DESC;