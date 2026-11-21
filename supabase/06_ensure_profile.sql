-- =====================================================================
-- BirEksik — 6. adım: eksik profili otomatik oluştur
-- 01–05'ten SONRA çalıştır: SQL Editor → New query → yapıştır → Run
-- Profili silinmiş bir hesap tekrar girince profili kendiliğinden oluşsun.
-- =====================================================================

create or replace function public.ensure_profile()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (
    auth.uid(),
    left(split_part((select email from auth.users where id = auth.uid()), '@', 1), 40)
  )
  on conflict (id) do nothing;
end $$;

revoke execute on function public.ensure_profile() from public, anon;
grant execute on function public.ensure_profile() to authenticated;
