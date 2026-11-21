-- 14_profile_and_remove.sql
-- (1) Profile: yaş ve cinsiyet alanları
-- (2) İlan sahibi katılımcı çıkarabilsin + çıkarılana bildirim/e-posta
-- Güvenle tekrar çalıştırılabilir.

-- ---------------------------------------------------------------------
-- 1) Yaş + cinsiyet (ikisi de isteğe bağlı)
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists age int
  check (age is null or (age between 13 and 99));
alter table public.profiles add column if not exists gender text
  check (gender is null or gender in ('Kadın', 'Erkek', 'Belirtmek istemiyorum'));

-- Kullanıcı bu iki alanı kendi güncelleyebilsin
grant update (age, gender) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 2) 'removed' bildirimi için e-posta tetikleyicisine konu ekle
-- ---------------------------------------------------------------------
create or replace function public._email_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare mail text; subj text;
begin
  if new.kind not in ('join', 'left', 'promoted', 'reminder', 'cancelled', 'removed') then
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
    else 'BirEksik' end;
  perform _send_email(mail, subj, _email_html(new.text, new.match_id));
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 3) remove_participant — sadece ilan sahibi; çıkarılana bildirim,
--    boşalan yere (players modunda) yedek otomatik alınır.
-- ---------------------------------------------------------------------
create or replace function public.remove_participant(p_match uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m matches%rowtype; j joins%rowtype; freed int; w record; whentxt text;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  select * into m from matches where id = p_match for update;
  if not found then raise exception 'Maç bulunamadı.'; end if;
  if m.host <> auth.uid() then raise exception 'Sadece maçı açan kişi oyuncu çıkarabilir.'; end if;
  if p_user = m.host then raise exception 'Kendini çıkaramazsın.'; end if;
  if m.starts_at <= now() then raise exception 'Maç başladıktan sonra oyuncu çıkaramazsın.'; end if;
  select * into j from joins where match_id = p_match and user_id = p_user;
  if not found then raise exception 'Bu kişi maçta değil.'; end if;

  freed := 1 + j.plus;
  delete from joins where match_id = p_match and user_id = p_user;
  whentxt := _tr_datetime(m.starts_at) || ' · ' || m.place;
  perform _notify(p_user, 'removed',
    'Maçı açan kişi seni şu maçtan çıkardı: ' || whentxt || '. Üzülme — sana uygun başka maçlar seni bekliyor!', p_match);

  -- Boşalan yere yedekleri al (sadece oyuncu modunda)
  if m.mode = 'players' then
    for w in select * from waitlist where match_id = p_match order by created_at limit freed loop
      insert into joins (match_id, user_id) values (p_match, w.user_id);
      delete from waitlist where match_id = p_match and user_id = w.user_id;
      perform _notify(w.user_id, 'promoted',
        '🎉 Sıra sende! Yedekten kadroya alındın — ' || whentxt || '. Görüşmek üzere!', p_match);
    end loop;
  end if;
end $$;
grant execute on function public.remove_participant(uuid, uuid) to authenticated;
revoke execute on function public.remove_participant(uuid, uuid) from public, anon;
