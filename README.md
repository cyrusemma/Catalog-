# Catalog

A progressive web app storefront with a self-service admin dashboard. Products
are managed from the admin panel and published to a mobile-first storefront;
customers browse, build a cart, and check out over WhatsApp.

## Stack

- **React 18 + TypeScript**, built with **Vite**
- **Supabase** — Postgres, Auth, Storage, and Realtime
- **TanStack Query** for server state, **Zustand** for client state
- **Tailwind CSS** with a small set of switchable themes
- **vite-plugin-pwa** (Workbox) for offline support and installability

## Features

- Storefront with category browsing, search, filtering, and product detail pages
- Cart and wishlist with persisted client state
- WhatsApp checkout with a configurable order-message template
- Customer accounts (email magic-link auth)
- Admin dashboard: products, orders, reviews, and store settings
- Role-based access enforced by Postgres row-level security
- Realtime settings/category updates pushed to the storefront
- Installable PWA with offline-aware caching

## Getting started

```bash
npm install
npm run dev
```

Create a `.env` from `.env.example` and set:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_WHATSAPP_NUMBER=233244000000
```

Apply the database schema by running `supabase-schema.sql` in the Supabase SQL
editor. Existing projects can run the incremental migrations
(`supabase-migration-*.sql`). See [SETUP.md](SETUP.md) for the full walkthrough,
including granting your account the admin role.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |

## Project structure

```
src/
  components/   Shared UI and layout (storefront + admin)
  pages/        Route-level screens
  hooks/        Data fetching and shared behavior
  lib/          Supabase client and helpers
  store/        Zustand stores (cart, wishlist, etc.)
supabase/       Edge functions
api/            Serverless endpoints (Open Graph images)
```

## Security

Access control is enforced in the database, not the client. The `is_admin()`
helper checks `app_metadata.role` only — `user_metadata` is user-editable and is
never trusted for authorization. Public reads are limited to published products
and a few public tables; all writes to managed tables require the admin role.
