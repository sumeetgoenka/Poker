# Setup Instructions

## The Issue
You're getting "Edge Function returned a non-2xx status code" because the required environment variables are missing.

## Solution
You need to create a `.env.local` file with your Supabase credentials.

### Step 1: Get Supabase Credentials
1. Go to your Supabase Dashboard
2. Navigate to Settings → API
3. Copy your Project URL and anon/public key

### Step 2: Create .env.local file
Create a file named `.env.local` in the project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_PARENT_ORIGINS=https://yourmain.site,https://*.yourmain.site
NEXT_PUBLIC_EMBED_TITLE="Poker Table (For Fun)"
```

### Step 3: Replace the placeholder values
- Replace `https://your-project-ref.supabase.co` with your actual Supabase URL
- Replace `your-anon-key-here` with your actual anon key
- Update the parent origins if you plan to embed this

### Step 4: Restart the development server
```bash
npm run dev
```

## Database Setup
You also need to set up the database schema in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/sql/poker_schema.sql`
3. Paste and run the SQL

## Enable Anonymous Auth
1. Go to Authentication → Providers in Supabase Dashboard
2. Enable "Anonymous sign-ins"

## Deploy Edge Functions
If you have Supabase CLI installed:
```bash
supabase functions deploy create_table join_table start_hand player_action
```

Or deploy them manually through the Supabase Dashboard.

