-- =====================================================
-- CRICKCAST FANTASY AUCTION - DATABASE MIGRATION
-- Match-based Point Tracking System
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Select your project
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "New Query"
-- 5. Copy and paste this ENTIRE file
-- 6. Click "Run" or press Ctrl/Cmd + Enter
-- 7. Refresh your CrickCast admin panel
--
-- =====================================================

-- Step 1: Add match_number column (nullable first to handle existing data)
ALTER TABLE players_point 
ADD COLUMN IF NOT EXISTS match_number INTEGER;

-- Step 2: Set default match_number = 1 for existing records that don't have it
UPDATE players_point 
SET match_number = 1 
WHERE match_number IS NULL;

-- Step 3: Make match_number NOT NULL with default value
ALTER TABLE players_point 
ALTER COLUMN match_number SET DEFAULT 1;

ALTER TABLE players_point 
ALTER COLUMN match_number SET NOT NULL;

-- Step 4: Add performance indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_players_point_match_number 
ON players_point(match_number);

CREATE INDEX IF NOT EXISTS idx_players_point_player_match 
ON players_point(player_id, match_number);

-- Step 5: Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'players_point' 
AND column_name = 'match_number';

-- =====================================================
-- MIGRATION COMPLETE!
-- You should see a result showing:
-- - column_name: match_number
-- - data_type: integer
-- - is_nullable: NO
-- - column_default: 1
--
-- If you see this, the migration was successful!
-- Close this tab and refresh your admin panel.
-- =====================================================
