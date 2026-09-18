-- Preserve provider score breakdown without changing existing BSD rows.
begin;
alter table public.fixtures
  add column source_round_label text,
  add column home_fulltime_score integer check (home_fulltime_score >= 0),
  add column away_fulltime_score integer check (away_fulltime_score >= 0),
  add column home_extra_score integer check (home_extra_score >= 0),
  add column away_extra_score integer check (away_extra_score >= 0),
  add column home_penalty_score integer check (home_penalty_score >= 0),
  add column away_penalty_score integer check (away_penalty_score >= 0);
-- Existing RLS and table privileges continue to apply; no public access added.
commit;
