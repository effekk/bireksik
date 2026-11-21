-- 16_match_alerts.sql
-- Yeni ilan bildirimleri: kullanıcı padel ve/veya halı saha için açarsa,
-- o sporda yeni maç açıldığında bildirim (ve e-posta) alır. İstediğinde kapatır.
-- Güvenle tekrar çalıştırılabilir.

-- 1) Tercih sütunları (varsayılan kapalı)
alter table public.profiles add column if not exists alert_padel boolean not null default false;
alter table public.profiles add column if not exists alert_halisaha boolean not null default false;
grant update (alert_padel, alert_halisaha) on public.profiles to authenticated;

-- 2) 'new_match' bildirimine e-posta konusu ekle
create or replace function public._email_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare mail text; subj text;
begin
  if new.kind not in ('join', 'left', 'promoted', 'reminder', 'cancelled', 'removed', 'new_match') then
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
    when 'removed'   then 'BirEksik · Maç kadrosu güncellendi'
    when 'new_match' then 'BirEksik · Yeni maç açıldı! 🎾⚽'
    else 'BirEksik' end;
  perform _send_email(mail, subj, _email_html(new.text, new.match_id));
  return new;
end $$;

-- 3) İlan açılınca ilgilenenlere bildir
create or replace function public._alert_new_match()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record; whentxt text; sportlbl text;
begin
  if new.status <> 'open' then return new; end if;
  sportlbl := case new.sport when 'padel' then 'padel' else 'halı saha' end;
  whentxt := _tr_datetime(new.starts_at) || ' · ' || new.place;
  for p in
    select id from profiles
    where onboarded = true and id <> new.host
      and ((new.sport = 'padel' and alert_padel) or (new.sport = 'halisaha' and alert_halisaha))
  loop
    perform _notify(p.id, 'new_match',
      'Yeni ' || sportlbl || ' maçı açıldı: ' || whentxt || '. Kadroda yerini kapabilirsin!', new.id);
  end loop;
  return new;
end $$;

drop trigger if exists alert_new_match on public.matches;
create trigger alert_new_match
  after insert on public.matches
  for each row execute function public._alert_new_match();
