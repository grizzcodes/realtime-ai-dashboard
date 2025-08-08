-- DGenz Clients Data Insert
-- Run this AFTER creating the tables with dgenz-schema.sql

-- Clear existing data (optional - remove if you want to keep existing data)
-- DELETE FROM clients;

-- Insert all clients from your spreadsheet
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

-- Verify the insert
SELECT COUNT(*) as total_clients FROM clients;

-- Show first few rows to confirm
SELECT * FROM clients LIMIT 5;