-- =====================================================================
-- BirEksik — veritabanı kurulumu (1. adım)
-- Supabase → SQL Editor → New query → bu dosyanın TAMAMINI yapıştır → Run
-- Bir kez çalıştırman yeterli.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) PROFİLLER
-- Her kullanıcı kayıt olunca otomatik bir profil satırı açılır.
-- Güven Puanı ve maç sayısı kullanıcı tarafından değiştirilemez.
-- ---------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  name           text not null default '' check (char_length(name) <= 40),
  dept           text not null default '' check (char_length(dept) <= 60),
  photo_url      text,
  sports         text[] not null default array['padel', 'halisaha']
                   check (sports <@ array['padel', 'halisaha'] and cardinality(sports) >= 1),
  level_padel    text not null default 'Orta' check (level_padel in ('Yeni başladım', 'Orta', 'İleri')),
  level_halisaha text not null default 'Orta' check (level_halisaha in ('Yeni başladım', 'Orta', 'İleri')),
  positions      text[] not null default '{}'
                   check (positions <@ array['Kaleci', 'Defans', 'Orta saha', 'Forvet']),
  trust          int not null default 100 check (trust between 0 and 100),
  played         int not null default 0,
  created_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Giriş yapmış herkes profilleri görebilir (kadro listesi, rozetler için)
create policy "profiller: herkes okur" on public.profiles
  for select to authenticated using (true);

-- Herkes sadece kendi profilini düzenler…
create policy "profiller: kendini düzenler" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- …ve sadece bu sütunları. trust ve played sadece sunucu fonksiyonlarıyla değişir.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, dept, photo_url, sports, level_padel, level_halisaha, positions)
  on public.profiles to authenticated;


-- ---------------------------------------------------------------------
-- 2) SADECE OKUL MAİLİ + OTOMATİK PROFİL
-- @std.izmirekonomi.edu.tr dışındaki adreslerle kayıt olunamaz.
-- ---------------------------------------------------------------------
create or replace function public.only_school_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or lower(new.email) not like '%@std.izmirekonomi.edu.tr' then
    raise exception 'BirEksik sadece @std.izmirekonomi.edu.tr adresleriyle kullanılabilir.';
  end if;
  return new;
end $$;

create trigger only_school_email
  before insert on auth.users
  for each row execute function public.only_school_email();

create or replace function public.create_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- İsim başlangıçta mail adresinin @ öncesi olur (örn. efe.k); profilden değiştirilebilir
  insert into public.profiles (id, name) values (new.id, left(split_part(new.email, '@', 1), 40))
  on conflict do nothing;
  return new;
end $$;

create trigger create_profile
  after insert on auth.users
  for each row execute function public.create_profile();


-- ---------------------------------------------------------------------
-- 3) MAÇLAR (İLANLAR)
-- size  : maçta toplam oyuncu
-- ready : maçı açanın tarafında hazır olanlar (kendisi dahil)
-- wanted: aranan pozisyonlar, örn. {"Kaleci": 1, "Defans": 2}
-- ---------------------------------------------------------------------
create table public.matches (
  id         uuid primary key default gen_random_uuid(),
  host       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  sport      text not null check (sport in ('padel', 'halisaha')),
  mode       text not null default 'players' check (mode in ('players', 'team')),
  starts_at  timestamptz not null,
  place      text not null check (char_length(place) between 1 and 80),
  level      text not null default 'Fark etmez',
  size       int not null check (size between 2 and 22),
  ready      int not null check (ready >= 1),
  wanted     jsonb not null default '{}'::jsonb,
  min_trust  int not null default 0 check (min_trust between 0 and 100),
  note       text not null default '' check (char_length(note) <= 160),
  status     text not null default 'open' check (status in ('open', 'cancelled')),
  created_at timestamptz not null default now(),
  check (ready < size),
  check (sport <> 'padel' or size = 4),
  check (mode <> 'team' or ready * 2 = size)
);

create index matches_starts_at on public.matches (starts_at);

alter table public.matches enable row level security;

create policy "maçlar: herkes okur" on public.matches
  for select to authenticated using (true);

create policy "maçlar: kendi adına açar" on public.matches
  for insert to authenticated
  with check (host = auth.uid() and starts_at > now());

create policy "maçlar: açan düzenler" on public.matches
  for update to authenticated using (host = auth.uid()) with check (host = auth.uid());

revoke update on public.matches from anon, authenticated;
grant update (place, level, note, min_trust, status) on public.matches to authenticated;


-- ---------------------------------------------------------------------
-- 4) KATILIMLAR, YEDEKLER
-- Bu tablolara doğrudan yazılamaz; sadece aşağıdaki fonksiyonlarla
-- (join_match, leave_match …) yazılır. Böylece kurallar atlatılamaz.
-- ---------------------------------------------------------------------
create table public.joins (
  match_id   uuid not null references public.matches (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  plus       int not null default 0 check (plus >= 0),
  team       text check (team is null or char_length(team) between 1 and 30),
  pos        text check (pos is null or pos in ('Kaleci', 'Defans', 'Orta saha', 'Forvet')),
  confirmed  boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create table public.waitlist (
  match_id   uuid not null references public.matches (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.joins enable row level security;
alter table public.waitlist enable row level security;

create policy "katılımlar: herkes okur" on public.joins for select to authenticated using (true);
create policy "yedekler: herkes okur" on public.waitlist for select to authenticated using (true);

revoke insert, update, delete on public.joins, public.waitlist from anon, authenticated;


-- ---------------------------------------------------------------------
-- 5) WHATSAPP LİNKİ (gizli)
-- Sadece maçı açan ve maça katılanlar görür.
-- ---------------------------------------------------------------------
create table public.match_private (
  match_id uuid primary key references public.matches (id) on delete cascade,
  wa_link  text check (wa_link is null or wa_link ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$')
);

alter table public.match_private enable row level security;

create policy "wa linki: açan ve katılanlar görür" on public.match_private
  for select to authenticated using (
    exists (select 1 from public.matches m where m.id = match_id and m.host = auth.uid())
    or exists (select 1 from public.joins j where j.match_id = match_private.match_id and j.user_id = auth.uid())
  );

create policy "wa linki: açan ekler" on public.match_private
  for insert to authenticated
  with check (exists (select 1 from public.matches m where m.id = match_id and m.host = auth.uid()));

create policy "wa linki: açan değiştirir" on public.match_private
  for update to authenticated
  using (exists (select 1 from public.matches m where m.id = match_id and m.host = auth.uid()));


-- ---------------------------------------------------------------------
-- 6) GÜVEN PUANI GEÇMİŞİ
-- ---------------------------------------------------------------------
create table public.trust_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  match_id   uuid references public.matches (id) on delete set null,
  delta      int not null,
  reason     text not null,
  created_at timestamptz not null default now()
);

alter table public.trust_events enable row level security;

create policy "puan geçmişi: kendini görür" on public.trust_events
  for select to authenticated using (user_id = auth.uid());

revoke insert, update, delete on public.trust_events from anon, authenticated;


-- ---------------------------------------------------------------------
-- 7) TAKDİRLER VE BİLDİRİMLER
-- ---------------------------------------------------------------------
create table public.kudos (
  match_id    uuid not null references public.matches (id) on delete cascade,
  from_user   uuid not null references public.profiles (id) on delete cascade,
  to_user     uuid not null references public.profiles (id) on delete cascade,
  tags        text[] not null check (cardinality(tags) >= 1
                and tags <@ array['fairplay', 'skill', 'ontime', 'fun', 'team']),
  note        text not null default '' check (char_length(note) <= 100),
  note_public boolean not null default false,
  created_at  timestamptz not null default now(),
  primary key (match_id, from_user, to_user),
  check (from_user <> to_user)
);

alter table public.kudos enable row level security;

-- Notları sadece alan ve veren görür; alan kişi herkese açtıysa herkes görür
create policy "takdirler: ilgili kişiler görür" on public.kudos
  for select to authenticated
  using (to_user = auth.uid() or from_user = auth.uid() or note_public);

-- Alan kişi sadece notun herkese açık olup olmadığını değiştirebilir
create policy "takdirler: alan kişi görünürlüğü değiştirir" on public.kudos
  for update to authenticated using (to_user = auth.uid()) with check (to_user = auth.uid());

revoke insert, update, delete on public.kudos from anon, authenticated;
grant update (note_public) on public.kudos to authenticated;

-- Profilde herkese görünen rozet sayıları (notlar olmadan)
create view public.kudos_counts as
  select to_user as user_id, tag, count(*)::int as count
  from public.kudos, unnest(tags) as tag
  group by to_user, tag;

revoke all on public.kudos_counts from anon;
grant select on public.kudos_counts to authenticated;

create table public.reports (
  id         bigint generated always as identity primary key,
  match_id   uuid references public.matches (id) on delete set null,
  reporter   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reported   uuid not null references public.profiles (id) on delete cascade,
  reason     text not null check (reason in ('Kaba davranış', 'Kavga çıkardı', 'Taciz / rahatsız etme', 'Sahte profil', 'Diğer')),
  detail     text not null default '' check (char_length(detail) <= 300),
  created_at timestamptz not null default now(),
  check (reporter <> reported)
);

alter table public.reports enable row level security;

-- Bildirim gönderilebilir ama okunamaz (sadece yönetici Supabase panelinden görür)
create policy "bildirim: gönderilebilir" on public.reports
  for insert to authenticated with check (reporter = auth.uid());

revoke select, update, delete on public.reports from anon, authenticated;
