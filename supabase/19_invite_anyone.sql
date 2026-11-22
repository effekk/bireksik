-- 19_invite_anyone.sql
-- Artık sadece ev sahibi değil, herhangi bir kullanıcı da bir ilana başkasını
-- davet edebilir (maçın kadrosunu doldurmak için). Bildirim metni nötr yapıldı.
-- Güvenle tekrar çalıştırılabilir.

create or replace function public.invite_to_match(p_to uuid, p_match uuid, p_note text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); m matches%rowtype; v_id uuid; myname text; whentxt text;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_to = me then raise exception 'Kendini davet edemezsin.'; end if;
  select * into m from matches where id = p_match;
  if not found then raise exception 'İlan bulunamadı.'; end if;
  -- (host şartı kaldırıldı: herkes davet edebilir)
  if m.status <> 'open' then raise exception 'Bu ilan artık açık değil.'; end if;
  if m.starts_at <= now() then raise exception 'Bu maçın saati geçmiş.'; end if;
  if m.host = p_to or exists (select 1 from joins where match_id = p_match and user_id = p_to) then
    raise exception 'Bu kişi zaten maçta.';
  end if;
  if (m.size - m.ready) - _filled(p_match) <= 0 then raise exception 'İlanda boş yer kalmadı.'; end if;
  -- aynı kişi, aynı ilana, aynı davet edenden iki kez davet gönderemesin
  if exists (select 1 from offers where kind = 'invite' and match_id = p_match and to_user = p_to and from_user = me and status = 'pending') then
    raise exception 'Bu kişiye bu ilan için zaten davet gönderdin.';
  end if;
  insert into offers (kind, from_user, to_user, match_id, note)
  values ('invite', me, p_to, p_match, left(coalesce(trim(p_note), ''), 200))
  returning id into v_id;
  select name into myname from profiles where id = me;
  whentxt := to_char(m.starts_at at time zone 'Europe/Istanbul', 'DD.MM HH24:MI');
  perform _notify(p_to, 'invite',
    coalesce(myname, 'Biri') || ' seni bir maça davet etti (' || whentxt || ' · ' || m.place || ').', p_match);
  return v_id;
end $$;
revoke execute on function public.invite_to_match(uuid, uuid, text) from public, anon;
grant execute on function public.invite_to_match(uuid, uuid, text) to authenticated;
