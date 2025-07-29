# Supabase Database Setup

## 1. Create Supabase Project

1. Go to https://supabase.com
2. Click "Start your project"
3. Create new project:
   - Name: `realtime-ai-dashboard`
   - Database password: (save this!)
   - Region: Choose closest to you

## 2. Database Schema

Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tasks table
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  source TEXT NOT NULL,
  urgency INTEGER DEFAULT 1 CHECK (urgency >= 1 AND urgency <= 5),
  category TEXT DEFAULT 'task',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  deadline TIMESTAMPTZ,
  key_people JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  confidence DECIMAL DEFAULT 0.8,
  ai_generated BOOLEAN DEFAULT true,
  related_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Events table
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  source TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  priority INTEGER DEFAULT 1,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tasks_urgency ON tasks(urgency DESC);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created ON tasks(created_at DESC);
CREATE INDEX idx_events_source ON events(source);
CREATE INDEX idx_events_created ON events(created_at DESC);

-- Enable Row Level Security (for future multi-user support)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (we'll add auth later)
CREATE POLICY "Allow all for tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all for events" ON events FOR ALL USING (true);
```

## 3. Get Connection Details

After creating the project, go to:
- Settings > Database > Connection string
- Copy the connection details for the .env file

## 4. Test Connection

```bash
# Test in Supabase SQL Editor
SELECT 'Database setup complete!' as message;
```