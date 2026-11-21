-- 15_terms.sql
-- Üye olurken kabul edilen sözleşmenin onay zamanını kaydet (hukuki iz).
-- Güvenle tekrar çalıştırılabilir.
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
grant update (terms_accepted_at) on public.profiles to authenticated;
