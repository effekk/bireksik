-- =====================================================================
-- BirEksik — TOPLU DÜZELTME (catch-up)
-- 01, 02, 03 çalıştıysa, bu tek dosya 04+05+06'nın hepsini garanti eder
-- ve eksik profilleri onarır. Güvenle tekrar tekrar çalıştırılabilir.
-- SQL Editor → New query → bu dosyanın TAMAMINI yapıştır → Run
-- =====================================================================

-- ---- Okul maili şartı kalksın ----
drop trigger if exists only_school_email on auth.users;
drop function if exists public.only_school_email();

-- ---- Yeni sütunlar: onboarded, phone, instagram ----
alter table public.profiles add column if not exists onboarded boolean not null default false;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists instagram text;
grant update (onboarded, phone, instagram) on public.profiles to authenticated;

-- ---- Seviyeler 5'e ----
alter table public.profiles drop constraint if exists profiles_level_padel_check;
alter table public.profiles drop constraint if exists profiles_level_halisaha_check;
alter table public.profiles add constraint profiles_level_padel_check
  check (level_padel in ('Yeni başladım','Başlangıç','Orta','İyi','İleri'));
alter table public.profiles add constraint profiles_level_halisaha_check
  check (level_halisaha in ('Yeni başladım','Başlangıç','Orta','İyi','İleri'));

-- ---- Bildirimler ----
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  text text not null,
  match_id uuid references public.matches (id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "bildirim: kendini görür" on public.notifications;
drop policy if exists "bildirim: okundu işaretler" on public.notifications;
create policy "bildirim: kendini görür" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "bildirim: okundu işaretler" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, delete on public.notifications from anon, authenticated;
grant update (read) on public.notifications to authenticated;

create or replace function public._notify(p_user uuid, p_kind text, p_text text, p_match uuid)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, kind, text, match_id) values (p_user, p_kind, p_text, p_match)
$$;
revoke execute on function public._notify(uuid, text, text, uuid) from public, anon, authenticated;

-- ---- Maçı iptal et ----
create or replace function public.cancel_match(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m matches%rowtype; j record; whentxt text;
begin
  select * into m from matches where id = p_match;
  if not found then raise exception 'Maç bulunamadı.'; end if;
  if m.host <> auth.uid() then raise exception 'Sadece maçı açan iptal edebilir.'; end if;
  if m.status <> 'open' then return; end if;
  update matches set status = 'cancelled' where id = p_match;
  whentxt := to_char(m.starts_at at time zone 'Europe/Istanbul', 'DD.MM HH24:MI') || ' · ' || m.place;
  for j in select user_id from joins where match_id = p_match and user_id <> m.host loop
    perform _notify(j.user_id, 'cancelled', 'Katıldığın maç iptal edildi: ' || whentxt, p_match);
  end loop;
  for j in select user_id from waitlist where match_id = p_match loop
    perform _notify(j.user_id, 'cancelled', 'Yedekte olduğun maç iptal edildi: ' || whentxt, p_match);
  end loop;
end $$;
grant execute on function public.cancel_match(uuid) to authenticated;

-- ---- Maçtan ayrıl (bildirimli sürüm) ----
create or replace function public.leave_match(p_match uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); m matches%rowtype; j joins%rowtype;
  hours numeric; pen int; freed int; promoted int := 0; w record; myname text; pname text; whentxt text;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  select * into m from matches where id = p_match for update;
  if not found then raise exception 'Maç bulunamadı.'; end if;
  select * into j from joins where match_id = p_match and user_id = me;
  if not found then raise exception 'Bu maçta değilsin.'; end if;
  hours := extract(epoch from (m.starts_at - now())) / 3600;
  pen := _penalty(hours);
  if j.created_at > now() - interval '15 minutes' and hours > 2 then pen := 0; end if;
  if m.starts_at <= now() then raise exception 'Maç başladıktan sonra ayrılamazsın.'; end if;
  freed := 1 + j.plus;
  delete from joins where match_id = p_match and user_id = me;
  select name into myname from profiles where id = me;
  whentxt := to_char(m.starts_at at time zone 'Europe/Istanbul', 'DD.MM HH24:MI') || ' · ' || m.place;
  if m.mode = 'players' then
    for w in select * from waitlist where match_id = p_match order by created_at limit freed loop
      insert into joins (match_id, user_id) values (p_match, w.user_id);
      delete from waitlist where match_id = p_match and user_id = w.user_id;
      promoted := promoted + 1;
      perform _notify(w.user_id, 'promoted', 'Yedekten kadroya alındın! ' || whentxt, p_match);
      select name into pname from profiles where id = w.user_id;
      if m.host <> me then perform _notify(m.host, 'promoted', coalesce(pname, 'Biri') || ' yedekten kadroya alındı.', p_match); end if;
    end loop;
  end if;
  if m.host <> me then perform _notify(m.host, 'left', coalesce(myname, 'Bir oyuncu') || ' maçtan ayrıldı: ' || whentxt, p_match); end if;
  if promoted > 0 then pen := round(pen / 2.0); end if;
  perform _add_trust(me, pen, 'Maça ' || round(greatest(hours, 0)) || ' saat kala iptal', p_match);
  return pen;
end $$;
grant execute on function public.leave_match(uuid) to authenticated;

-- ---- Profil otomatik oluşturma (yeni kayıtta trigger + eksikse onarım) ----
create or replace function public.create_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(split_part(new.email, '@', 1), 40))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists create_profile on auth.users;
create trigger create_profile after insert on auth.users
  for each row execute function public.create_profile();

create or replace function public.ensure_profile()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (auth.uid(), left(split_part((select email from auth.users where id = auth.uid()), '@', 1), 40))
  on conflict (id) do nothing;
end $$;
revoke execute on function public.ensure_profile() from public, anon;
grant execute on function public.ensure_profile() to authenticated;

-- ---- Profili olmayan mevcut hesaplara profil aç (geriye dönük onarım) ----
insert into public.profiles (id, name)
select u.id, left(split_part(u.email, '@', 1), 40)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
