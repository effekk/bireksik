-- =====================================================================
-- BirEksik — ilk giriş kurulumu (4. adım)
-- 01, 02, 03'ten SONRA çalıştır: SQL Editor → New query → yapıştır → Run
-- "onboarded": kullanıcı ilk kurulum (hoş geldin) ekranını tamamladı mı?
-- =====================================================================

alter table public.profiles
  add column if not exists onboarded boolean not null default false;

-- Kullanıcı bu alanı kendi profilinde güncelleyebilsin
grant update (onboarded) on public.profiles to authenticated;
