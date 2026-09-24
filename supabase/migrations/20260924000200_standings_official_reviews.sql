begin;
alter table public.standings_batches add constraint standings_batches_id_hash_unique unique (id, payload_hash);

-- Append-only evidence ledger. Activation is scoped to this exact immutable batch.
create table public.standings_official_reviews (
  id uuid primary key,
  batch_id uuid not null,
  batch_payload_hash text not null,
  reviewed_at timestamptz not null,
  observed_at timestamptz not null,
  status text not null check (status in ('match', 'differences', 'unavailable')),
  activated boolean not null default false,
  payload jsonb not null,
  review_hash text not null check (review_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  foreign key (batch_id, batch_payload_hash) references public.standings_batches (id, payload_hash),
  check (observed_at <= reviewed_at),
  check (not activated or status = 'match'),
  check ((jsonb_typeof(payload) = 'object'
    and jsonb_typeof(payload->'evidence'->'tables') = 'array'
    and jsonb_array_length(payload->'evidence'->'tables') > 0
    and payload->'evidence'->>'batch_id' = batch_id::text
    and payload->'evidence'->>'payload_hash' = batch_payload_hash
    and jsonb_typeof(payload->'differences') = 'array'
    and jsonb_typeof(payload->'reasons') = 'array') is true),
  check ((not activated or (payload->>'activation_requested' = 'true'
    and jsonb_array_length(payload->'differences') = 0
    and jsonb_array_length(payload->'reasons') = 0)) is true)
);

create index standings_official_reviews_batch_idx on public.standings_official_reviews (batch_id, reviewed_at desc);

create function public.check_standings_activation() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.activated and not exists (
    select 1 from public.standings_batches
    where id = new.batch_id and payload_hash = new.batch_payload_hash and status = 'complete'
  ) then
    raise exception 'STANDINGS_BATCH_NOT_COMPLETE';
  end if;
  return new;
end;
$$;
revoke all on function public.check_standings_activation() from public, anon, authenticated;
create trigger standings_activation_complete before insert on public.standings_official_reviews
for each row execute function public.check_standings_activation();

alter table public.standings_official_reviews enable row level security;
revoke all on public.standings_official_reviews from public, anon, authenticated, service_role;
grant select, insert on public.standings_official_reviews to service_role;
commit;
