-- 22_new_sports.sql
-- Siteyi büyütüyoruz: tenis, voleybol, basket eklendi.
-- Padel ve halı saha aynen kalır; yeni sporlar esnek kadroludur (kişi sayısını ilan sahibi belirler).
-- Güvenle tekrar tekrar çalıştırılabilir.

-- 1) Profilde oynanan spor listesi: 5 spora izin ver
alter table public.profiles drop constraint if exists profiles_sports_check;
alter table public.profiles add constraint profiles_sports_check
  check (sports <@ array['padel','halisaha','tenis','voleybol','basket']
         and cardinality(sports) >= 1);

-- 2) Yeni sporlar için seviye sütunları (padel/halı saha ile aynı 5 kademe)
alter table public.profiles add column if not exists level_tenis    text not null default 'Orta';
alter table public.profiles add column if not exists level_voleybol text not null default 'Orta';
alter table public.profiles add column if not exists level_basket   text not null default 'Orta';

alter table public.profiles drop constraint if exists profiles_level_tenis_check;
alter table public.profiles drop constraint if exists profiles_level_voleybol_check;
alter table public.profiles drop constraint if exists profiles_level_basket_check;
alter table public.profiles add constraint profiles_level_tenis_check
  check (level_tenis    in ('Yeni başladım','Başlangıç','Orta','İyi','İleri'));
alter table public.profiles add constraint profiles_level_voleybol_check
  check (level_voleybol in ('Yeni başladım','Başlangıç','Orta','İyi','İleri'));
alter table public.profiles add constraint profiles_level_basket_check
  check (level_basket   in ('Yeni başladım','Başlangıç','Orta','İyi','İleri'));

grant update (level_tenis, level_voleybol, level_basket) on public.profiles to authenticated;

-- 3) Yeni sporlar için ilan bildirim tercihleri (varsayılan kapalı)
alter table public.profiles add column if not exists alert_tenis    boolean not null default false;
alter table public.profiles add column if not exists alert_voleybol boolean not null default false;
alter table public.profiles add column if not exists alert_basket   boolean not null default false;
grant update (alert_tenis, alert_voleybol, alert_basket) on public.profiles to authenticated;

-- 4) Maç tablosunda spor türü: 5 spora izin ver
--    (padel = 4 kişi kuralı olduğu gibi kalır; o kısıta dokunmuyoruz)
alter table public.matches drop constraint if exists matches_sport_check;
alter table public.matches add constraint matches_sport_check
  check (sport in ('padel','halisaha','tenis','voleybol','basket'));

-- 5) Yeni ilan bildirimini tüm sporlara genişlet
create or replace function public._alert_new_match()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record; whentxt text; sportlbl text;
begin
  if new.status <> 'open' then return new; end if;
  sportlbl := case new.sport
    when 'padel' then 'padel'
    when 'halisaha' then 'halı saha'
    when 'tenis' then 'tenis'
    when 'voleybol' then 'voleybol'
    when 'basket' then 'basket'
    else new.sport end;
  whentxt := _tr_datetime(new.starts_at) || ' · ' || new.place;
  for p in
    select id from profiles
    where onboarded = true and id <> new.host
      and ((new.sport = 'padel'    and alert_padel)
        or (new.sport = 'halisaha' and alert_halisaha)
        or (new.sport = 'tenis'    and alert_tenis)
        or (new.sport = 'voleybol' and alert_voleybol)
        or (new.sport = 'basket'   and alert_basket))
  loop
    perform _notify(p.id, 'new_match',
      'Yeni ' || sportlbl || ' maçı açıldı: ' || whentxt || '. Kadroda yerini kapabilirsin!', new.id);
  end loop;
  return new;
end $$;
