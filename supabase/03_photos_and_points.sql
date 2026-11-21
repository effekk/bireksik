-- =====================================================================
-- BirEksik — profil fotoğrafları ve oynanan maç puanı (3. adım)
-- 01 ve 02'den SONRA çalıştır: SQL Editor → New query → yapıştır → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) PROFİL FOTOĞRAFLARI
-- "avatars" adında herkese açık bir klasör. Herkes sadece kendi
-- klasörüne (kendi kullanıcı kimliği adındaki klasöre) yükleyebilir.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif'])
on conflict (id) do nothing;

create policy "fotoğraf: kendi klasörüne yükler" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotoğraf: kendi fotoğrafını değiştirir" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotoğraf: kendi fotoğrafını siler" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- ---------------------------------------------------------------------
-- 2) OYNANAN MAÇ: +2 PUAN
-- Maç bittikten 2 saat sonra, o maçta olan herkes siteye girdiğinde
-- otomatik olarak +2 puan ve "oynanan maç" sayısına +1 alır. Her maç bir kez.
-- (Habersiz gelmeme bildirimi eklenince gelmeyenler bunu almayacak.)
-- ---------------------------------------------------------------------
create table public.match_settlements (
  match_id   uuid not null references public.matches (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.match_settlements enable row level security;
create policy "oynanan maçlar: kendini görür" on public.match_settlements
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.match_settlements from anon, authenticated;

create or replace function public.settle_my_matches()
returns int   -- bu çağrıda kazanılan toplam puan
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  r record;
  gained int := 0;
begin
  if me is null then return 0; end if;
  for r in
    select m.id from matches m
    where m.status = 'open'
      and m.starts_at < now() - interval '2 hours'
      and m.starts_at > now() - interval '30 days'
      and (m.host = me or exists (select 1 from joins j where j.match_id = m.id and j.user_id = me))
      -- maçı açan, kimse katılmadıysa puan almaz
      and exists (select 1 from joins j where j.match_id = m.id)
      and not exists (select 1 from match_settlements s where s.match_id = m.id and s.user_id = me)
  loop
    insert into match_settlements (match_id, user_id) values (r.id, me);
    update profiles set played = played + 1 where id = me;
    perform _add_trust(me, 2, 'Maç oynandı', r.id);
    gained := gained + 2;
  end loop;
  return gained;
end $$;

revoke execute on function public.settle_my_matches() from public, anon;
grant execute on function public.settle_my_matches() to authenticated;
