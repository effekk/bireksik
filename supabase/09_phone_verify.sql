-- =====================================================================
-- BirEksik — Telefon doğrulama (WhatsApp) altyapısı (9. adım)
-- 01–08 çalıştıktan SONRA: SQL Editor → New query → yapıştır → Run
-- Bu dosya sadece tabloyu/sütunu kurar. Kod gönderme/doğrulama
-- Supabase Edge Function'larında (service role) yapılır.
-- NOT: create/join için "doğrulanmış olma" şartı, WhatsApp canlı
-- olduktan SONRA ayrı bir göçle açılacak (10_require_verified.sql).
-- =====================================================================

-- Doğrulanmış mı?
alter table public.profiles add column if not exists phone_verified boolean not null default false;

-- Bir numaraya tek hesap: yalnızca DOĞRULANMIŞ numaralarda tekillik.
-- (Doğrulanmamış/boş numaralar çakışma yaratmaz.)
create unique index if not exists profiles_phone_verified_unique
  on public.profiles (phone) where phone_verified and phone is not null;

-- Tek seferlik kod tablosu — sadece Edge Function (service role) erişir.
create table if not exists public.phone_otp (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  phone      text not null,              -- E.164, ör. +905xxxxxxxxx
  code       text not null,              -- 6 haneli
  expires_at timestamptz not null,
  attempts   int not null default 0,
  last_sent  timestamptz not null default now()
);

alter table public.phone_otp enable row level security;
-- Hiçbir politika yok → anon/authenticated erişemez. Edge Function service role ile bypass eder.
revoke all on public.phone_otp from anon, authenticated;
