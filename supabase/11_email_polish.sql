-- =====================================================================
-- BirEksik — E-posta görünümü + dil iyileştirmeleri (11. adım)
-- Logo banner, Türkçe tarih ("21 Kasım Saat 19.00"), daha samimi/heyecanlı dil.
-- 10_email_notifications.sql çalıştıktan sonra Run et. Güvenle tekrar çalışır.
-- =====================================================================

-- Türkçe tarih-saat: "21 Kasım Saat 19.00"
create or replace function public._tr_datetime(ts timestamptz)
returns text language sql stable as $$
  select to_char(l, 'FMDD') || ' '
      || (array['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'])[extract(month from l)::int]
      || ' Saat ' || to_char(l, 'HH24') || '.' || to_char(l, 'MI')
  from (select ts at time zone 'Europe/Istanbul' as l) s
$$;

-- Bildirim e-postası konuları — daha coşkulu
create or replace function public._email_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare mail text; subj text;
begin
  if new.kind not in ('join', 'left', 'promoted', 'reminder', 'cancelled') then
    return new;
  end if;
  select email into mail from auth.users where id = new.user_id;
  if mail is null then return new; end if;
  subj := case new.kind
    when 'reminder'  then 'BirEksik · Maça az kaldı — geliyor musun? 🔥'
    when 'cancelled' then 'BirEksik · Maç iptal edildi'
    when 'promoted'  then 'BirEksik · Sıra sende, kadrodasın! 🎉'
    when 'join'      then 'BirEksik · Kadron büyüyor! 🎉'
    when 'left'      then 'BirEksik · Bir oyuncu ayrıldı'
    else 'BirEksik' end;
  perform _send_email(mail, subj, _email_html(new.text, new.match_id));
  return new;
end $$;

-- Logolu, samimi e-posta gövdesi
create or replace function public._email_html(p_text text, p_match uuid)
returns text language sql immutable as $$
  select '<div style="background:#f2f5f1;padding:28px 16px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">'
    || '<div style="max-width:460px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #e3e8e3;overflow:hidden;">'
    || '<img src="https://bireksik.com/logo.png" alt="BirEksik" width="460" style="display:block;width:100%;max-width:460px;height:auto;border:0;" />'
    || '<div style="padding:24px 22px;color:#13201a;font-size:16px;line-height:1.55;">'
    || '<p style="margin:0 0 18px;">' || p_text || '</p>'
    || case when p_match is not null then
         '<a href="https://bireksik.com/#mac-' || p_match::text || '" style="display:inline-block;background:#0e6b43;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">Maça git</a>'
       else '' end
    || '<p style="margin:22px 0 0;color:#5d6b63;font-size:14px;">Sahada görüşürüz, iyi oyunlar! 🎾⚽</p>'
    || '</div></div>'
    || '<p style="text-align:center;margin:16px 0 0;font-size:12px;color:#9baba1;">BirEksik · Bir kişi mi eksik? BirEksik''te bulursun.</p></div>'
$$;

-- ---------------------------------------------------------------------
-- join_match — katılım mesajı daha heyecanlı + yeni tarih formatı
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
  myname text;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;

  select * into m from matches where id = p_match for update;
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
        if (free_left - open_total) < p_plus then raise exception 'Arkadaşların için yeterli serbest yer yok.'; end if;
      else
        if (free_left - open_total) < 1 + p_plus then raise exception 'Kalan yerler sadece aranan pozisyonlar için.'; end if;
      end if;
    else
      if (free_left - open_total) < 1 + p_plus then raise exception 'Kalan yerler sadece aranan pozisyonlar için.'; end if;
    end if;
    insert into joins (match_id, user_id, plus, pos) values (p_match, me, p_plus, p_pos);
  end if;

  delete from waitlist where match_id = p_match and user_id = me;

  select name into myname from profiles where id = me;
  perform _notify(m.host, 'join',
    '⚡ Kadron büyüyor! ' || coalesce(myname, 'Bir oyuncu') || ' maçına katıldı 🎉  ' || _tr_datetime(m.starts_at) || ' · ' || m.place || '. Hadi sahaya!', p_match);
end $$;
grant execute on function public.join_match(uuid, int, text, text) to authenticated;
revoke execute on function public.join_match(uuid, int, text, text) from public, anon;

-- ---------------------------------------------------------------------
-- cancel_match — yeni tarih formatı + daha sıcak dil
-- ---------------------------------------------------------------------
create or replace function public.cancel_match(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m matches%rowtype; j record; whentxt text;
begin
  select * into m from matches where id = p_match;
  if not found then raise exception 'Maç bulunamadı.'; end if;
  if m.host <> auth.uid() then raise exception 'Sadece maçı açan iptal edebilir.'; end if;
  if m.status <> 'open' then return; end if;
  update matches set status = 'cancelled' where id = p_match;
  whentxt := _tr_datetime(m.starts_at) || ' · ' || m.place;
  for j in select user_id from joins where match_id = p_match and user_id <> m.host loop
    perform _notify(j.user_id, 'cancelled', 'Maalesef katıldığın maç iptal edildi: ' || whentxt || '. Üzülme, yeni maçlar seni bekliyor!', p_match);
  end loop;
  for j in select user_id from waitlist where match_id = p_match loop
    perform _notify(j.user_id, 'cancelled', 'Yedekte olduğun maç iptal edildi: ' || whentxt || '.', p_match);
  end loop;
end $$;
grant execute on function public.cancel_match(uuid) to authenticated;
revoke execute on function public.cancel_match(uuid) from public, anon;

-- ---------------------------------------------------------------------
-- leave_match — yeni tarih formatı + daha sıcak dil
-- ---------------------------------------------------------------------
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
  whentxt := _tr_datetime(m.starts_at) || ' · ' || m.place;
  if m.mode = 'players' then
    for w in select * from waitlist where match_id = p_match order by created_at limit freed loop
      insert into joins (match_id, user_id) values (p_match, w.user_id);
      delete from waitlist where match_id = p_match and user_id = w.user_id;
      promoted := promoted + 1;
      perform _notify(w.user_id, 'promoted', '🎉 Sıra sende! Yedekten kadroya alındın — ' || whentxt || '. Kramponları kap, görüşmek üzere!', p_match);
      select name into pname from profiles where id = w.user_id;
      if m.host <> me then perform _notify(m.host, 'promoted', coalesce(pname, 'Biri') || ' yedekten kadroya alındı.', p_match); end if;
    end loop;
  end if;
  if m.host <> me then perform _notify(m.host, 'left', coalesce(myname, 'Bir oyuncu') || ' maçtan ayrıldı: ' || whentxt || '.', p_match); end if;
  if promoted > 0 then pen := round(pen / 2.0); end if;
  perform _add_trust(me, pen, 'Maça ' || round(greatest(hours, 0)) || ' saat kala iptal', p_match);
  return pen;
end $$;
grant execute on function public.leave_match(uuid) to authenticated;
revoke execute on function public.leave_match(uuid) from public, anon;

-- ---------------------------------------------------------------------
-- 6 saat kala hatırlatma — yeni tarih formatı + daha samimi
-- ---------------------------------------------------------------------
create or replace function public._send_reminders()
returns void language plpgsql security definer set search_path = public as $$
declare m record; p record; msg text;
begin
  for m in
    select * from matches
    where status = 'open' and not reminded
      and starts_at > now() and starts_at <= now() + interval '6 hours'
  loop
    msg := '🔥 Maça az kaldı! ' || _tr_datetime(m.starts_at) || ' · ' || m.place
        || '. Hâlâ var mısın? Gelemeyeceksen yerini başkası kapsın diye hemen ayrıl — kadro seni bekliyor!';
    perform _notify(m.host, 'reminder', msg, m.id);
    for p in select user_id from joins where match_id = m.id loop
      perform _notify(p.user_id, 'reminder', msg, m.id);
    end loop;
    update matches set reminded = true where id = m.id;
  end loop;
end $$;
revoke execute on function public._send_reminders() from public, anon, authenticated;
