CREATE TABLE employees (
  guild_id TEXT NOT NULL,
  discord_id TEXT NOT NULL,
  quota_minutes INT DEFAULT 60,
  default_start_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (guild_id, discord_id)
);

CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  discord_id TEXT NOT NULL,
  break_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending', -- pending, on_break, completed
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ
);
