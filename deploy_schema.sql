-- Deploy poker schema to Supabase
-- This file contains the complete schema that needs to be executed in the Supabase SQL editor

-- Create tables table
CREATE TABLE IF NOT EXISTS tables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    host_uid text NOT NULL,
    small_blind int NOT NULL,
    big_blind int NOT NULL,
    max_players int NOT NULL DEFAULT 6,
    is_private boolean NOT NULL DEFAULT true,
    invite_token text,
    status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','in_hand','ended')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create table_players table
CREATE TABLE IF NOT EXISTS table_players (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    uid text NOT NULL,
    nickname text,
    seat int NOT NULL CHECK (seat BETWEEN 1 AND 6),
    stack int NOT NULL DEFAULT 2000,
    is_connected boolean NOT NULL DEFAULT true,
    last_seen timestamptz NOT NULL DEFAULT now(),
    UNIQUE(table_id, seat)
);

-- Create hand table
CREATE TABLE IF NOT EXISTS hand (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id uuid NOT NULL UNIQUE REFERENCES tables(id) ON DELETE CASCADE,
    hand_no int NOT NULL DEFAULT 1,
    dealer_seat int,
    sb_seat int,
    bb_seat int,
    board jsonb NOT NULL DEFAULT '[]',
    pot int NOT NULL DEFAULT 0,
    street text NOT NULL DEFAULT 'preflop' CHECK (street IN ('preflop','flop','turn','river','showdown')),
    to_act_seat int,
    min_raise int NOT NULL DEFAULT 0,
    act_deadline timestamptz,
    deck jsonb
);

-- Create private_holes table
CREATE TABLE IF NOT EXISTS private_holes (
    table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    seat int NOT NULL CHECK (seat BETWEEN 1 AND 6),
    cards jsonb NOT NULL,
    PRIMARY KEY (table_id, seat)
);

-- Create actions table
CREATE TABLE IF NOT EXISTS actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    hand_no int NOT NULL,
    seat int NOT NULL,
    action text NOT NULL CHECK (action IN ('post','fold','check','call','bet','raise')),
    amount int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create chat table
CREATE TABLE IF NOT EXISTS chat (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    uid text NOT NULL,
    nickname text,
    text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create helper function for table membership check
CREATE OR REPLACE FUNCTION is_table_member(t_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM table_players tp
        WHERE tp.table_id = t_id AND tp.uid = auth.uid()::text
    );
$$;

-- Enable Row Level Security on all tables
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_holes ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tables table
-- Members can read tables they're part of
CREATE POLICY "Members can read tables" ON tables
    FOR SELECT USING (is_table_member(id));

-- Only service role can write to tables (Edge Functions)
CREATE POLICY "Service role can write tables" ON tables
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for table_players table
-- Members can read players at their tables
CREATE POLICY "Members can read table players" ON table_players
    FOR SELECT USING (is_table_member(table_id));

-- Players can update their own presence/connection status
CREATE POLICY "Players can update own presence" ON table_players
    FOR UPDATE USING (uid = auth.uid()::text)
    WITH CHECK (uid = auth.uid()::text);

-- Service role can insert/update players
CREATE POLICY "Service role can manage players" ON table_players
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for hand table
-- Members can read hand data
CREATE POLICY "Members can read hand" ON hand
    FOR SELECT USING (is_table_member(table_id));

-- Only service role can write hand data
CREATE POLICY "Service role can write hand" ON hand
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for private_holes table
-- Only seat owner can read their hole cards
CREATE POLICY "Seat owner can read hole cards" ON private_holes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM table_players tp
            WHERE tp.table_id = private_holes.table_id 
            AND tp.seat = private_holes.seat 
            AND tp.uid = auth.uid()::text
        )
    );

-- Only service role can write hole cards
CREATE POLICY "Service role can write hole cards" ON private_holes
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for actions table
-- Members can read actions at their tables
CREATE POLICY "Members can read actions" ON actions
    FOR SELECT USING (is_table_member(table_id));

-- Only service role can write actions
CREATE POLICY "Service role can write actions" ON actions
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for chat table
-- Members can read chat messages
CREATE POLICY "Members can read chat" ON chat
    FOR SELECT USING (is_table_member(table_id));

-- Members can insert chat messages
CREATE POLICY "Members can insert chat" ON chat
    FOR INSERT WITH CHECK (is_table_member(table_id));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_table_players_table_id ON table_players(table_id);
CREATE INDEX IF NOT EXISTS idx_table_players_uid ON table_players(uid);
CREATE INDEX IF NOT EXISTS idx_hand_table_id ON hand(table_id);
CREATE INDEX IF NOT EXISTS idx_private_holes_table_id ON private_holes(table_id);
CREATE INDEX IF NOT EXISTS idx_actions_table_id ON actions(table_id);
CREATE INDEX IF NOT EXISTS idx_actions_hand_no ON actions(hand_no);
CREATE INDEX IF NOT EXISTS idx_chat_table_id ON chat(table_id);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat(created_at);
