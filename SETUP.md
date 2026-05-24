# Catalog by Cyrus — Setup Guide

## Step 1: Install dependencies
Open your terminal in this folder and run:
```
npm install
```

## Step 2: Create Supabase project
1. Go to https://supabase.com and create a free account
2. Create a new project (name it "catalog")
3. Go to Settings → API and copy:
   - Project URL
   - anon/public key

## Step 3: Set up database
1. In Supabase, go to SQL Editor
2. Paste and run the contents of `supabase-schema.sql`

## Step 4: Create your admin account
1. In Supabase, go to Authentication → Users
2. Click "Add user" → enter your email + password
3. In SQL Editor, grant the admin role (replace the email):
```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'you@example.com';
```
4. In Authentication → Providers, **disable sign-ups** unless you want public registration
5. Keep your admin password private

## Step 4b: Security migration (existing projects only)
If you already ran an older `supabase-schema.sql`, also run `supabase-migration-security.sql`.

## Step 4c: Deploy scrape edge function
```bash
npx supabase functions deploy scrape-product
```
Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) linked to your project.

## Step 5: Configure environment
1. Copy `.env.example` to `.env`
2. Fill in your Supabase URL, anon key, and WhatsApp number:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_WHATSAPP_NUMBER=233244000000
```

## Step 6: Run the app
```
npm run dev
```

## Step 7: Access admin
Go to http://localhost:5173/admin
Log in with the email + password you created in Step 4

## Deploying to Vercel
1. Push this folder to GitHub
2. Go to https://vercel.com → Import project
3. Add your environment variables in Vercel settings
4. Deploy!

## WhatsApp Number format
Use your full number with country code but NO plus sign.
Ghana example: 233244123456 (not +233244123456)
