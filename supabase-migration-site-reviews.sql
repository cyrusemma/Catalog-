-- Site reviews table. Anyone can submit a review; only the admin can read
-- them. Matches the SiteReview type in src/types and what AdminReviews reads.
-- Safe to run multiple times in the Supabase SQL Editor.

create table if not exists site_reviews (
  id uuid primary key default gen_random_uuid(),
  name text,
  rating integer not null check (rating >= 1 and rating <= 5),
  message text not null,
  page_url text,
  created_at timestamptz not null default now()
);

create index if not exists site_reviews_created_idx on site_reviews (created_at desc);

alter table site_reviews enable row level security;

drop policy if exists "Anyone can submit a review" on site_reviews;
drop policy if exists "Admin reads reviews" on site_reviews;

create policy "Anyone can submit a review" on site_reviews
  for insert with check (true);

create policy "Admin reads reviews" on site_reviews
  for select
  using ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text));
