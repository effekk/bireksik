-- =====================================================================
-- BirEksik — İletişim / geri bildirim (12. adım)
-- Öneri, istek, şikayet, iletişim mesajları. Sadece eklenebilir;
-- mesajları Supabase panelinden (Table Editor) okursun.
-- 01–11 çalıştıktan sonra Run et.
-- =====================================================================

create table if not exists public.feedback (
  id         bigint generated always as identity primary key,
  user_id    uuid references public.profiles (id) on delete set null,
  kind       text not null check (kind in ('oneri', 'istek', 'sikayet', 'iletisim')),
  message    text not null check (char_length(message) between 1 and 2000),
  contact    text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "feedback: giris yapan ekler" on public.feedback;
create policy "feedback: giris yapan ekler" on public.feedback
  for insert to authenticated with check (user_id = auth.uid());

revoke all on public.feedback from anon, authenticated;
grant insert on public.feedback to authenticated;
