-- =====================================================================
-- BirEksik — kurallar (2. adım)
-- 01_schema.sql'den SONRA çalıştır: SQL Editor → New query → yapıştır → Run
-- Katılma, ayrılma, yedek, ceza ve takdir kuralları burada, sunucuda çalışır.
-- Tarayıcıdan kurcalayan biri bu kuralları atlatamaz.
-- =====================================================================

-- Aranan pozisyonlardan hâlâ boş olanların toplamı
create or replace function public._open_pos_total(p_match uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(greatest(0, w.value::int - (
           select count(*) from joins j where j.match_id = p_match and j.pos = w.key
         ))), 0)::int
  from matches m, jsonb_each_text(m.wanted) w
  where m.id = p_match
$$;

-- Maçta dolu yer sayısı (katılanlar + getirdikleri)
create or replace function public._filled(p_match uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(1 + plus), 0)::int from joins where match_id = p_match
$$;

-- Maça kalan saate göre iptal cezası (anlaştığımız tablo)
create or replace function public._penalty(p_hours numeric)
returns int language sql immutable as $$
  select case
    when p_hours > 48 then 0
    when p_hours > 24 then -2
    when p_hours > 12 then -5
    when p_hours > 5  then -7
    when p_hours > 2  then -10
    else -15
  end
$$;

-- Puan değiştir + geçmişe yaz
create or replace function public._add_trust(p_user uuid, p_delta int, p_reason text, p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_delta = 0 then return; end if;
  update profiles set trust = least(100, greatest(0, trust + p_delta)) where id = p_user;
  insert into trust_events (user_id, match_id, delta, reason) values (p_user, p_match, p_delta, p_reason);
end $$;


-- ---------------------------------------------------------------------
-- MAÇA KATIL
-- p_plus: yanında getirdiğin kişi sayısı · p_team: takım adı (takım modu) · p_pos: pozisyon
-- ---------------------------------------------------------------------
create or replace function public.join_match(p_match uuid, p_plus int default 0, p_team text default null, p_pos text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  m matches%rowtype;
  my_trust int;
  free_left int;
  open_total int;
  pos_open int;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;

  select * into m from matches where id = p_match for update;   -- aynı anda iki kişi son yeri kapmasın
  if not found or m.status <> 'open' then raise exception 'Bu maç artık açık değil.'; end if;
  if m.starts_at <= now() then raise exception 'Bu maç başladı ya da bitti.'; end if;
  if m.host = me then raise exception 'Kendi açtığın maça katılamazsın.'; end if;
  if exists (select 1 from joins where match_id = p_match and user_id = me) then
    raise exception 'Bu maça zaten katıldın.';
  end if;

  select trust into my_trust from profiles where id = me;
  if my_trust < m.min_trust then
    raise exception 'Bu maç için en az % Güven Puanı gerekiyor.', m.min_trust;
  end if;
  if my_trust < 50 then
    raise exception 'Güven Puanın 50''nin altında olduğu için şu an maçlara katılamıyorsun.';
  end if;

  free_left := (m.size - m.ready) - _filled(p_match);
  if free_left <= 0 then raise exception 'Kadro dolu. Yedek listesine yazılabilirsin.'; end if;

  if m.mode = 'team' then
    if p_team is null or char_length(trim(p_team)) = 0 then raise exception 'Takım adı yazmalısın.'; end if;
    insert into joins (match_id, user_id, plus, team) values (p_match, me, free_left - 1, trim(p_team));
  else
    if p_plus < 0 or p_plus > free_left - 1 then raise exception 'Bu kadar kişilik yer yok.'; end if;
    open_total := _open_pos_total(p_match);
    if p_pos is not null then
      select greatest(0, coalesce((m.wanted ->> p_pos)::int, 0)
               - (select count(*) from joins where match_id = p_match and pos = p_pos))
        into pos_open;
      if pos_open > 0 then
        -- aranan pozisyona giriyor; getirdiği arkadaşlar serbest yerlere sayılır
        if (free_left - open_total) < p_plus then raise exception 'Arkadaşların için yeterli serbest yer yok.'; end if;
      else
        -- aranmayan bir pozisyon seçtiyse serbest yer sayılır
        if (free_left - open_total) < 1 + p_plus then raise exception 'Kalan yerler sadece aranan pozisyonlar için.'; end if;
      end if;
    else
      if (free_left - open_total) < 1 + p_plus then raise exception 'Kalan yerler sadece aranan pozisyonlar için.'; end if;
    end if;
    insert into joins (match_id, user_id, plus, pos) values (p_match, me, p_plus, p_pos);
  end if;

  delete from waitlist where match_id = p_match and user_id = me;
end $$;


-- ---------------------------------------------------------------------
-- MAÇTAN AYRIL (ceza + yedekten otomatik alma)
-- ---------------------------------------------------------------------
create or replace function public.leave_match(p_match uuid)
returns int   -- düşen puan (0 veya eksi)
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  m matches%rowtype;
  j joins%rowtype;
  hours numeric;
  pen int;
  freed int;
  promoted int := 0;
  w record;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  select * into m from matches where id = p_match for update;
  if not found then raise exception 'Maç bulunamadı.'; end if;
  select * into j from joins where match_id = p_match and user_id = me;
  if not found then raise exception 'Bu maçta değilsin.'; end if;

  hours := extract(epoch from (m.starts_at - now())) / 3600;
  pen := _penalty(hours);
  -- 15 dakika cayma hakkı (maça 2 saatten fazla varsa)
  if j.created_at > now() - interval '15 minutes' and hours > 2 then pen := 0; end if;
  if m.starts_at <= now() then raise exception 'Maç başladıktan sonra ayrılamazsın.'; end if;

  freed := 1 + j.plus;
  delete from joins where match_id = p_match and user_id = me;

  -- Boşalan yer kadar yedeği sırayla kadroya al (takım modunda yedek yok)
  if m.mode = 'players' then
    for w in select * from waitlist where match_id = p_match order by created_at limit freed loop
      insert into joins (match_id, user_id) values (p_match, w.user_id);
      delete from waitlist where match_id = p_match and user_id = w.user_id;
      promoted := promoted + 1;
    end loop;
  end if;

  -- Yerine biri geldiyse ceza yarıya iner
  if promoted > 0 then pen := round(pen / 2.0); end if;
  perform _add_trust(me, pen, 'Maça ' || round(greatest(hours, 0)) || ' saat kala iptal', p_match);
  return pen;
end $$;


-- ---------------------------------------------------------------------
-- YEDEK LİSTESİ
-- ---------------------------------------------------------------------
create or replace function public.join_waitlist(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  m matches%rowtype;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  select * into m from matches where id = p_match;
  if not found or m.status <> 'open' or m.starts_at <= now() then raise exception 'Bu maç artık açık değil.'; end if;
  if m.mode <> 'players' then raise exception 'Takım maçlarında yedek listesi yok.'; end if;
  if m.host = me or exists (select 1 from joins where match_id = p_match and user_id = me) then
    raise exception 'Zaten bu maçtasın.';
  end if;
  if (m.size - m.ready) - _filled(p_match) > 0 then raise exception 'Maçta boş yer var, direkt katılabilirsin.'; end if;
  if (select trust from profiles where id = me) < m.min_trust then
    raise exception 'Bu maç için en az % Güven Puanı gerekiyor.', m.min_trust;
  end if;
  insert into waitlist (match_id, user_id) values (p_match, me) on conflict do nothing;
end $$;

create or replace function public.leave_waitlist(p_match uuid)
returns void language sql security definer set search_path = public as $$
  delete from waitlist where match_id = p_match and user_id = auth.uid()
$$;


-- ---------------------------------------------------------------------
-- "GELİYORUM" ONAYI
-- ---------------------------------------------------------------------
create or replace function public.confirm_attendance(p_match uuid)
returns void language sql security definer set search_path = public as $$
  update joins set confirmed = true where match_id = p_match and user_id = auth.uid()
$$;


-- ---------------------------------------------------------------------
-- TAKDİR ET
-- Sadece aynı maçta oynayanlar, maç başladıktan sonraki 50 saat içinde,
-- kişi başı maç başına bir kez. Güven Puanını ETKİLEMEZ.
-- ---------------------------------------------------------------------
create or replace function public.give_kudos(p_match uuid, p_to uuid, p_tags text[], p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  m matches%rowtype;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  select * into m from matches where id = p_match;
  if not found then raise exception 'Maç bulunamadı.'; end if;
  if now() < m.starts_at then raise exception 'Takdir maç başladıktan sonra verilebilir.'; end if;
  if now() > m.starts_at + interval '50 hours' then raise exception 'Bu maçın takdir süresi doldu.'; end if;
  if not (me = m.host or exists (select 1 from joins where match_id = p_match and user_id = me)) then
    raise exception 'Sadece oynadığın maçlarda takdir verebilirsin.';
  end if;
  if not (p_to = m.host or exists (select 1 from joins where match_id = p_match and user_id = p_to)) then
    raise exception 'Bu kişi bu maçta oynamadı.';
  end if;
  insert into kudos (match_id, from_user, to_user, tags, note)
  values (p_match, me, p_to, p_tags, left(coalesce(trim(p_note), ''), 100));
exception when unique_violation then
  raise exception 'Bu kişiyi bu maç için zaten takdir ettin.';
end $$;


-- ---------------------------------------------------------------------
-- İzinler: yardımcı fonksiyonlar dışarıya kapalı, ana fonksiyonlar açık
-- ---------------------------------------------------------------------
revoke execute on function public._open_pos_total(uuid), public._filled(uuid),
  public._penalty(numeric), public._add_trust(uuid, int, text, uuid) from public, anon, authenticated;

revoke execute on function public.join_match(uuid, int, text, text), public.leave_match(uuid),
  public.join_waitlist(uuid), public.leave_waitlist(uuid), public.confirm_attendance(uuid),
  public.give_kudos(uuid, uuid, text[], text) from public, anon;

grant execute on function public.join_match(uuid, int, text, text), public.leave_match(uuid),
  public.join_waitlist(uuid), public.leave_waitlist(uuid), public.confirm_attendance(uuid),
  public.give_kudos(uuid, uuid, text[], text) to authenticated;
