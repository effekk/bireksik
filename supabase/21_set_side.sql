-- 21_set_side.sql
-- Padel maçında katıldıktan sonra tarafını (Üst/Alt) değiştirebilme.
-- Güvenle tekrar çalıştırılabilir.

create or replace function public.set_match_side(p_match uuid, p_side text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); m matches%rowtype;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_side not in ('Üst', 'Alt') then raise exception 'Geçersiz taraf.'; end if;
  select * into m from matches where id = p_match;
  if not found then raise exception 'Maç bulunamadı.'; end if;
  if m.sport <> 'padel' or m.mode = 'team' then raise exception 'Bu maçta taraf seçilemez.'; end if;
  if m.status <> 'open' then raise exception 'Bu maç artık açık değil.'; end if;
  update joins set pos = p_side where match_id = p_match and user_id = me;
  if not found then raise exception 'Bu maçta değilsin.'; end if;
end $$;
revoke execute on function public.set_match_side(uuid, text) from public, anon;
grant execute on function public.set_match_side(uuid, text) to authenticated;
