-- 23_delete_note.sql
-- Profildeki bir notu kaldırma: notu YAZAN kişi veya GELİŞTİRİCİ (is_dev) silebilir.
-- Not metni boşaltılır; rozetler (tags) ve takdir kaydı korunur.
-- Güvenle tekrar çalıştırılabilir.

create or replace function public.clear_kudos_note(p_match uuid, p_from uuid, p_to uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() <> p_from
     and not exists (select 1 from profiles where id = auth.uid() and is_dev) then
    raise exception 'Bu notu silme yetkin yok';
  end if;
  update public.kudos set note = ''
   where match_id = p_match and from_user = p_from and to_user = p_to;
end $$;

revoke all on function public.clear_kudos_note(uuid, uuid, uuid) from public, anon;
grant execute on function public.clear_kudos_note(uuid, uuid, uuid) to authenticated;
