-- =====================================================================
-- BirEksik — Maç teklifleri ve davetler (8. adım)
-- 01–07 çalıştıktan SONRA: SQL Editor → New query → yapıştır → Run
-- İki tür:
--   direct : bir kişiye sıfırdan maç teklifi. Kabul edilince maç oluşur.
--   invite : kendi açtığın bir ilana kişiyi davet. Kabul edilince kadroya katılır.
-- Kurallar sunucuda; tarayıcıdan atlatılamaz.
-- =====================================================================

create table if not exists public.offers (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('direct', 'invite')),
  from_user  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_user    uuid not null references public.profiles (id) on delete cascade,
  -- doğrudan teklif alanları
  sport      text check (sport in ('padel', 'halisaha')),
  starts_at  timestamptz,
  place      text,
  level      text,
  size       int,
  -- ilana davet alanı
  match_id   uuid references public.matches (id) on delete cascade,
  -- ortak
  note       text not null default '' check (char_length(note) <= 200),
  status     text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  check (from_user <> to_user),
  -- direct: spor/saat/yer/boyut dolu olmalı (match_id kabul edilince bağlanır)
  -- invite: bir ilana bağlı olmalı
  check (
    (kind = 'direct' and sport is not null and starts_at is not null and place is not null and size is not null)
    or (kind = 'invite' and match_id is not null)
  )
);

create index if not exists offers_to on public.offers (to_user, status);
create index if not exists offers_from on public.offers (from_user, status);

alter table public.offers enable row level security;

drop policy if exists "teklifler: ilgili kişiler görür" on public.offers;
create policy "teklifler: ilgili kişiler görür" on public.offers
  for select to authenticated using (from_user = auth.uid() or to_user = auth.uid());

revoke insert, update, delete on public.offers from anon, authenticated;
grant select on public.offers to authenticated;


-- ---------------------------------------------------------------------
-- DOĞRUDAN MAÇ TEKLİFİ gönder
-- ---------------------------------------------------------------------
create or replace function public.make_offer(p_to uuid, p_sport text, p_starts_at timestamptz, p_place text, p_level text, p_size int, p_note text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); v_id uuid; v_size int; myname text;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_to = me then raise exception 'Kendine teklif gönderemezsin.'; end if;
  if not exists (select 1 from profiles where id = p_to) then raise exception 'Kişi bulunamadı.'; end if;
  if p_sport not in ('padel', 'halisaha') then raise exception 'Geçersiz spor.'; end if;
  if p_starts_at is null or p_starts_at <= now() then raise exception 'İleri bir saat seç.'; end if;
  if coalesce(trim(p_place), '') = '' then raise exception 'Yer boş olamaz.'; end if;
  v_size := case when p_sport = 'padel' then 4 else greatest(4, least(22, coalesce(p_size, 14))) end;
  insert into offers (kind, from_user, to_user, sport, starts_at, place, level, size, note)
  values ('direct', me, p_to, p_sport, p_starts_at, left(trim(p_place), 80),
          coalesce(nullif(trim(p_level), ''), 'Fark etmez'), v_size, left(coalesce(trim(p_note), ''), 200))
  returning id into v_id;
  select name into myname from profiles where id = me;
  perform _notify(p_to, 'offer', coalesce(myname, 'Biri') || ' sana maç teklif etti.', null);
  return v_id;
end $$;
revoke execute on function public.make_offer(uuid, text, timestamptz, text, text, int, text) from public, anon;
grant execute on function public.make_offer(uuid, text, timestamptz, text, text, int, text) to authenticated;


-- ---------------------------------------------------------------------
-- İLANA DAVET et (sadece kendi açtığın ilana)
-- ---------------------------------------------------------------------
create or replace function public.invite_to_match(p_to uuid, p_match uuid, p_note text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); m matches%rowtype; v_id uuid; myname text; whentxt text;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_to = me then raise exception 'Kendini davet edemezsin.'; end if;
  select * into m from matches where id = p_match;
  if not found then raise exception 'İlan bulunamadı.'; end if;
  if m.host <> me then raise exception 'Sadece kendi açtığın ilana davet edebilirsin.'; end if;
  if m.status <> 'open' then raise exception 'Bu ilan artık açık değil.'; end if;
  if m.starts_at <= now() then raise exception 'Bu maçın saati geçmiş.'; end if;
  if m.host = p_to or exists (select 1 from joins where match_id = p_match and user_id = p_to) then
    raise exception 'Bu kişi zaten maçta.';
  end if;
  if (m.size - m.ready) - _filled(p_match) <= 0 then raise exception 'İlanda boş yer kalmadı.'; end if;
  if exists (select 1 from offers where kind = 'invite' and match_id = p_match and to_user = p_to and status = 'pending') then
    raise exception 'Bu kişiye bu ilan için zaten davet gönderdin.';
  end if;
  insert into offers (kind, from_user, to_user, match_id, note)
  values ('invite', me, p_to, p_match, left(coalesce(trim(p_note), ''), 200))
  returning id into v_id;
  select name into myname from profiles where id = me;
  whentxt := to_char(m.starts_at at time zone 'Europe/Istanbul', 'DD.MM HH24:MI');
  perform _notify(p_to, 'invite', coalesce(myname, 'Biri') || ' seni maçına davet etti (' || whentxt || ' · ' || m.place || ').', p_match);
  return v_id;
end $$;
revoke execute on function public.invite_to_match(uuid, uuid, text) from public, anon;
grant execute on function public.invite_to_match(uuid, uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- TEKLİFE / DAVETE YANIT (kabul = true / ret = false)
-- ---------------------------------------------------------------------
create or replace function public.respond_offer(p_offer uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); o offers%rowtype; v_match uuid; myname text; whentxt text;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  select * into o from offers where id = p_offer for update;
  if not found then raise exception 'Teklif bulunamadı.'; end if;
  if o.to_user <> me then raise exception 'Bu teklif sana ait değil.'; end if;
  if o.status <> 'pending' then raise exception 'Bu teklif zaten yanıtlanmış.'; end if;
  select name into myname from profiles where id = me;

  if not p_accept then
    update offers set status = 'declined' where id = p_offer;
    perform _notify(o.from_user, 'offer_declined', coalesce(myname, 'Biri') || ' teklifini geri çevirdi.', o.match_id);
    return null;
  end if;

  if o.kind = 'invite' then
    -- Daveti kabul eden maça katılır; join_match bütün kuralları (dolu/puan/zaten var) uygular
    perform join_match(o.match_id, 0, null, null);
    update offers set status = 'accepted' where id = p_offer;
    perform _notify(o.from_user, 'offer_accepted', coalesce(myname, 'Biri') || ' davetini kabul etti ve kadroya katıldı.', o.match_id);
    return o.match_id;
  else
    -- Doğrudan teklif: kabul edilince maç oluşur (teklifi gönderen ev sahibi, kabul eden kadroda)
    if o.starts_at <= now() then raise exception 'Teklif edilen saat geçmiş. Karşı taraftan yeni teklif iste.'; end if;
    insert into matches (host, sport, mode, starts_at, place, level, size, ready, min_trust, note)
    values (o.from_user, o.sport, 'players', o.starts_at, o.place, coalesce(o.level, 'Fark etmez'), o.size, 1, 0, coalesce(o.note, ''))
    returning id into v_match;
    insert into joins (match_id, user_id) values (v_match, me);
    update offers set status = 'accepted', match_id = v_match where id = p_offer;
    whentxt := to_char(o.starts_at at time zone 'Europe/Istanbul', 'DD.MM HH24:MI');
    perform _notify(o.from_user, 'offer_accepted', coalesce(myname, 'Biri') || ' teklifini kabul etti! Maç oluşturuldu (' || whentxt || ').', v_match);
    return v_match;
  end if;
end $$;
revoke execute on function public.respond_offer(uuid, boolean) from public, anon;
grant execute on function public.respond_offer(uuid, boolean) to authenticated;


-- ---------------------------------------------------------------------
-- TEKLİFİ GERİ ÇEK (gönderen, henüz yanıtlanmamışsa)
-- ---------------------------------------------------------------------
create or replace function public.cancel_offer(p_offer uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); o offers%rowtype;
begin
  select * into o from offers where id = p_offer;
  if not found then raise exception 'Teklif bulunamadı.'; end if;
  if o.from_user <> me then raise exception 'Sadece gönderen geri çekebilir.'; end if;
  if o.status <> 'pending' then raise exception 'Bu teklif zaten yanıtlanmış.'; end if;
  update offers set status = 'cancelled' where id = p_offer;
end $$;
revoke execute on function public.cancel_offer(uuid) from public, anon;
grant execute on function public.cancel_offer(uuid) to authenticated;
