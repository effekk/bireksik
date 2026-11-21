-- =====================================================================
-- BirEksik — E-posta bildirimleri (10. adım)
-- Bildirim satırı oluştuğunda (katılım / ayrılma / yedekten giriş / hatırlatma)
-- ilgili kişiye e-posta gönderir. Resend (HTTP API) + pg_net ile; Edge Function yok.
--
-- ÖN KOŞULLAR (Supabase panelinden):
--   1) Database → Extensions: "pg_net" ve "pg_cron" aç.
--   2) Resend API anahtarını ve gönderici adresini app_config'e ekle:
--        insert into app_config(key,value) values
--          ('resend_key','re_xxx'),
--          ('from_email','BirEksik <bildirim@bireksik.com>')
--        on conflict (key) do update set value = excluded.value;
-- 01–08 çalıştıktan sonra bu dosyayı Run et.
-- =====================================================================

create extension if not exists pg_net;

-- Gizli ayarlar (Resend anahtarı vb.) — sadece SECURITY DEFINER fonksiyonlar okur
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

-- ---------------------------------------------------------------------
-- Düşük seviyeli: Resend ile e-posta gönder
-- ---------------------------------------------------------------------
create or replace function public._send_email(p_to text, p_subject text, p_html text)
returns void language plpgsql security definer set search_path = public as $$
declare k text; frm text;
begin
  if p_to is null or p_to = '' then return; end if;
  select value into k from app_config where key = 'resend_key';
  select value into frm from app_config where key = 'from_email';
  if k is null then return; end if;  -- anahtar yoksa sessizce çık
  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || k, 'Content-Type', 'application/json'),
    body    := jsonb_build_object(
                 'from', coalesce(frm, 'BirEksik <onboarding@resend.dev>'),
                 'to', p_to, 'subject', p_subject, 'html', p_html)
  );
end $$;
revoke execute on function public._send_email(text, text, text) from public, anon, authenticated;

-- Basit, markalı e-posta gövdesi
create or replace function public._email_html(p_text text, p_match uuid)
returns text language sql immutable as $$
  select '<div style="background:#f2f5f1;padding:28px 16px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">'
    || '<div style="max-width:460px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #e3e8e3;overflow:hidden;">'
    || '<div style="background:#0e6b43;padding:16px 22px;color:#fff;font-weight:800;font-size:20px;">BirEksik</div>'
    || '<div style="padding:24px 22px;color:#13201a;font-size:16px;line-height:1.5;">'
    || '<p style="margin:0 0 18px;">' || p_text || '</p>'
    || case when p_match is not null then
         '<a href="https://bireksik.com/#mac-' || p_match::text || '" style="display:inline-block;background:#0e6b43;color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:700;">Maça git</a>'
       else '' end
    || '</div></div>'
    || '<p style="text-align:center;margin:16px 0 0;font-size:12px;color:#9baba1;">BirEksik · Bir kişi mi eksik? BirEksik''te bulursun.</p></div>'
$$;

-- ---------------------------------------------------------------------
-- Bildirim oluşunca ilgili kişiye e-posta gönder (sadece seçili türler)
-- ---------------------------------------------------------------------
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
    when 'reminder'  then 'BirEksik · Maçın yaklaşıyor — hâlâ geliyor musun?'
    when 'cancelled' then 'BirEksik · Maç iptal edildi'
    when 'promoted'  then 'BirEksik · Yedekten kadroya alındın!'
    when 'join'      then 'BirEksik · Maçına yeni katılan var'
    when 'left'      then 'BirEksik · Maçtan ayrılan oldu'
    else 'BirEksik' end;
  perform _send_email(mail, subj, _email_html(new.text, new.match_id));
  return new;
end $$;

drop trigger if exists notifications_email on public.notifications;
create trigger notifications_email after insert on public.notifications
  for each row execute function public._email_notification();

-- ---------------------------------------------------------------------
-- Katılım bildirimi: biri maça katılınca ev sahibine haber (join_match'e eklendi)
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
  whentxt text;
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

  -- Ev sahibine katılım bildirimi (e-posta tetikleyicisi bunu yakalar)
  select name into myname from profiles where id = me;
  whentxt := to_char(m.starts_at at time zone 'Europe/Istanbul', 'DD.MM HH24:MI') || ' · ' || m.place;
  perform _notify(m.host, 'join', coalesce(myname, 'Bir oyuncu') || ' maçına katıldı (' || whentxt || ').', p_match);
end $$;
grant execute on function public.join_match(uuid, int, text, text) to authenticated;
revoke execute on function public.join_match(uuid, int, text, text) from public, anon;

-- ---------------------------------------------------------------------
-- 6 SAAT KALA KONTROL MAİLİ (pg_cron ile)
-- ---------------------------------------------------------------------
alter table public.matches add column if not exists reminded boolean not null default false;

create or replace function public._send_reminders()
returns void language plpgsql security definer set search_path = public as $$
declare m record; p record; whentxt text; msg text;
begin
  for m in
    select * from matches
    where status = 'open' and not reminded
      and starts_at > now() and starts_at <= now() + interval '6 hours'
  loop
    whentxt := to_char(m.starts_at at time zone 'Europe/Istanbul', 'DD.MM HH24:MI') || ' · ' || m.place;
    msg := 'Maçın yaklaşıyor: ' || whentxt || '. Hâlâ geliyor musun? Gelemiyorsan yerini boşa düşürmemek için erkenden ayrıl.';
    perform _notify(m.host, 'reminder', msg, m.id);
    for p in select user_id from joins where match_id = m.id loop
      perform _notify(p.user_id, 'reminder', msg, m.id);
    end loop;
    update matches set reminded = true where id = m.id;
  end loop;
end $$;
revoke execute on function public._send_reminders() from public, anon, authenticated;

-- Her 15 dakikada bir çalıştır (pg_cron açık olmalı)
select cron.schedule('bireksik-reminders', '*/15 * * * *', $$ select public._send_reminders() $$);
