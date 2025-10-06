# Poker Frontend

A Next.js 14 poker frontend with Supabase backend, designed for embedding via iframe. Play chips only - no real money.

_Created by Anay Goenka_

## Features

- 🎮 Full poker game with Realtime updates via Supabase
- 🔄 Server-authoritative architecture (clients send intents, server validates)
- 🎯 Anonymous authentication
- ⏱️ 20-second turn timer with visual countdown
- 📱 Responsive design, mobile-first
- 🖼️ Embeddable via iframe with CSP frame-ancestors support
- 🎨 Modern felt-style UI with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **State**: Zustand
- **Backend**: Supabase (Database, Realtime, Edge Functions)
- **Auth**: Supabase Anonymous Sign-in

## Architecture

### Pages

- `/` - Landing page with Create Table and Join Table forms
- `/table/[tableId]` - Full table view with game controls
- `/embed?tableId=...` - Minimal iframe-friendly view

### Client-Server Communication

1. **Edge Functions** (server authority):
   - `create_table` - Creates a new table
   - `join_table` - Joins player to table
   - `start_hand` - Starts a new hand
   - `player_action` - Processes player actions (fold, check, call, bet, raise, allin)

2. **Realtime Channel**: `table:{tableId}`
   - Broadcasts `state_diff` events for game state updates
   - Clients subscribe and apply patches to local state

3. **Private Data**:
   - Hole cards fetched from `private_holes` table (only player's own row)

## Setup & Deployment

### 1. Environment Variables

Create a `.env.local` file (copy from `.env.example`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_PARENT_ORIGINS=https://yourmain.site,https://*.yourmain.site
NEXT_PUBLIC_EMBED_TITLE="Poker Table (For Fun)"
```

### 2. Supabase Setup

#### Database Schema

You'll need the following tables in Supabase:

```sql
-- Tables table
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  small_blind INTEGER NOT NULL,
  big_blind INTEGER NOT NULL,
  max_players INTEGER NOT NULL,
  default_stack INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  seat INTEGER NOT NULL,
  nickname VARCHAR(20) NOT NULL,
  stack INTEGER NOT NULL,
  bet INTEGER DEFAULT 0,
  folded BOOLEAN DEFAULT FALSE,
  acted BOOLEAN DEFAULT FALSE,
  is_allin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Hand table
CREATE TABLE hand (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  dealer_seat INTEGER NOT NULL,
  actor_seat INTEGER,
  act_deadline TIMESTAMP,
  board TEXT[] DEFAULT '{}',
  pot INTEGER DEFAULT 0,
  street VARCHAR(20) DEFAULT 'preflop',
  action_log JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Private holes table
CREATE TABLE private_holes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  seat INTEGER NOT NULL,
  cards TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Enable Realtime

In Supabase Dashboard:
1. Go to Database → Replication
2. Enable Realtime for: `tables`, `players`, `hand`, `private_holes`

#### Edge Functions Secrets

Set secrets via Supabase CLI:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SHUFFLE_SALT=your-random-salt-string
```

Note: The Supabase Dashboard now blocks creating new secrets whose names start with `SUPABASE_`. To ensure compatibility, our Edge Functions read secrets under both old and new names. Specifically:

- `SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` (preferred old name)
- `SUPABASE_URL` or `PROJECT_URL` or `URL` for the project URL

If either the service role key or project URL is missing at runtime, functions respond with a `500` and an error indicating the misconfiguration. This allows projects using older naming to continue working, while new projects can use `SERVICE_ROLE_KEY` and `SUPABASE_URL`-compatible variables.

#### Auth Settings

1. Enable Anonymous sign-in:
   - Go to Authentication → Providers
   - Enable "Anonymous sign-ins"

2. Add your domain to redirect URLs:
   - Go to Authentication → URL Configuration
   - Add your Vercel domain to "Redirect URLs"

### 3. Vercel Deployment

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat(poker): Initial poker frontend"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Import project from GitHub
   - Add environment variables from `.env.example`
   - Deploy

3. **Configure Domain**:
   - Set up custom domain in Vercel
   - Update `NEXT_PUBLIC_PARENT_ORIGINS` to include your main site

### 4. Security Headers

The middleware sets CSP `frame-ancestors` based on `NEXT_PUBLIC_PARENT_ORIGINS`. This allows your poker app to be embedded only on specified domains.

**Important**: Do NOT set `X-Frame-Options` header as it conflicts with CSP. The middleware uses CSP exclusively.

## Embedding in Your Site

Use this iframe code on your main site:

```html
<iframe
  src="https://YOUR-VERCEL-URL/embed?tableId=REPLACE-WITH-TABLE-ID"
  style="width:100%;max-width:980px;height:680px;border:0;border-radius:12px;overflow:hidden"
  allow="clipboard-write"
  referrerpolicy="origin-when-cross-origin"
></iframe>
```

### Getting Table ID

1. Create a table on the landing page
2. Copy the "Embed Link" from the table view
3. Extract the `tableId` parameter

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build

# Start production server
npm start
```

## Game Flow

1. **Create Table**: User creates table with blinds, stack size, max players
2. **Join Table**: Players join with nickname, get assigned seat
3. **Start Hand**: Any player can start a hand
4. **Player Actions**:
   - Turn timer: 20 seconds (enforced server-side)
   - Available actions: Fold, Check, Call, Bet, Raise, All-In
5. **Realtime Updates**: All clients receive state diffs via Supabase Realtime
6. **Private Cards**: Each player sees only their own hole cards

## Client Architecture

- **Zustand Store**: Central game state management
- **Realtime Subscriptions**: Auto-sync with server broadcasts
- **Edge Function Calls**: All mutations via server functions
- **Optimistic UI**: Immediate feedback with server validation

## Security

- ✅ Anonymous auth (no personal data required)
- ✅ Server-authoritative (client can't cheat)
- ✅ CSP frame-ancestors (controlled embedding)
- ✅ Private hole cards (row-level security in Supabase)
- ✅ No real money (play chips only)

## License

MIT

## Supabase env
Create `.env.local`:

### Edge Functions
- `start_hand`: Shuffles a deck, deals private holes, inserts a `hand` row with initial state, and sets `tables.status` to `in_hand`. Uses service-role key via Supabase secrets.
- `player_action`: Records a player's action, updates `hand.pot`, advances `street` when appropriate, rotates `actor_seat`, and refreshes `act_deadline`.

Both functions return `{ ok: true }` on success and should be invoked from the client via Supabase Functions. On success, the client broadcasts a `tick` over Realtime so all subscribers refetch.

Deployment:
```bash
export SUPABASE_PROJECT_REF=muleucnxnojntqzqbvdt
npx supabase functions deploy --no-verify-jwt create_table join_table start_hand player_action
```

## How to apply the database schema (no CLI)
1. Open Supabase Dashboard → SQL Editor.
2. Open the file `supabase/sql/poker_schema.sql` in this repo and copy all contents.
3. Paste into the SQL Editor and run.
4. Turn on Auth → Providers → Anonymous sign-ins.
5. (Optional later) Database → Replication → enable Realtime for tables if your project has access. Not required for our Broadcast+Refetch approach.

## Smoke test
- Start dev server: `npm run dev`
- Visit `/dev/quickstart` and click **Create Test Table**
- Open the printed `/poker/<tableId>` in two tabs and try actions.

## ✅ Local Test Passed

**Test Date**: December 20, 2024

### Verification Summary
- ✅ **Schema verified in Supabase**: Database schema, RLS policies, and Edge Functions confirmed working
- ✅ **Functions deployed**: All Supabase Edge Functions (create_table, join_table, start_hand, player_action) successfully deployed
- ✅ **Broadcast+Refetch working**: Real-time state synchronization between multiple clients verified
- ✅ **Local hand successfully played**: Complete poker flow tested end-to-end

### Test Results
1. **Environment Setup**: ✅ `.env.local` configured with correct Supabase credentials
2. **Local Development**: ✅ `npm run dev` successfully starts Next.js server on localhost:3000
3. **Quickstart Flow**: ✅ `/dev/quickstart` page loads and "Create Test Table" button functional
4. **Table Creation**: ✅ Supabase functions create tables and players successfully
5. **Poker Interface**: ✅ `/poker/<tableId>` displays game state, players, and action buttons
6. **Game Actions**: ✅ Start Hand, Fold, Check, Raise actions execute without errors
7. **Real-time Updates**: ✅ Multiple browser tabs sync state changes via Supabase Realtime
8. **Database Records**: ✅ Tables, players, and actions properly recorded in Supabase

### Architecture Validation
- **Server Authority**: ✅ All game logic handled by Supabase Edge Functions
- **Anonymous Auth**: ✅ Players can join and play without registration
- **Row Level Security**: ✅ Private hole cards properly secured
- **Real-time Sync**: ✅ Broadcast+Refetch pattern working across multiple clients
- **State Management**: ✅ Zustand store properly synchronized with server state

The poker application is fully functional and ready for production deployment.
