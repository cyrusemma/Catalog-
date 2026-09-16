-- ==============================================================================
-- CMS Expansion Migration: Custom Pages, Categories Enhancement, and Blog Posts
-- Safe to run multiple times in Supabase SQL Editor
-- ==============================================================================

-- 1. ENHANCE CATEGORIES TABLE
alter table categories add column if not exists image_url text;
alter table categories add column if not exists description text;
alter table categories add column if not exists icon text;

-- 2. CREATE CUSTOM PAGES TABLE
create table if not exists custom_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content_html text not null default '',
  meta_title text,
  meta_description text,
  is_published boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_custom_pages_slug on custom_pages(slug);
create index if not exists idx_custom_pages_published on custom_pages(is_published);

-- RLS for custom_pages
alter table custom_pages enable row level security;

drop policy if exists "Public read published pages" on custom_pages;
drop policy if exists "Admin manage pages" on custom_pages;

create policy "Public read published pages" on custom_pages
  for select using (is_published = true or public.is_admin());

create policy "Admin manage pages" on custom_pages
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- 3. CREATE BLOG POSTS TABLE
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text default '',
  content_html text not null default '',
  cover_image_url text,
  author_name text default 'Store Team',
  tags text[] default '{}',
  is_published boolean not null default true,
  views_count integer not null default 0,
  published_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_blog_posts_slug on blog_posts(slug);
create index if not exists idx_blog_posts_published on blog_posts(is_published, published_at desc);

-- RLS for blog_posts
alter table blog_posts enable row level security;

drop policy if exists "Public read published posts" on blog_posts;
drop policy if exists "Admin manage blog posts" on blog_posts;

create policy "Public read published posts" on blog_posts
  for select using (is_published = true or public.is_admin());

create policy "Admin manage blog posts" on blog_posts
  for all
  using (public.is_admin())
  with check (public.is_admin());
