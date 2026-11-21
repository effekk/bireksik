-- 13_public_browse.sql
-- Misafir (üye olmayan) kullanıcılar ilanlara bakabilsin.
-- SADECE açık maçlar + katılım/yedek sayıları paylaşılır.
-- İsim, profil, telefon, Instagram, WhatsApp linki ve takdirler misafire GİTMEZ
-- (profiles / match_private / kudos tablolarında anon izni yok). İsimler istemcide
-- zaten blurlanır; bu dosya veriyi de sunucuda misafirden gizli tutar.

-- Tablo düzeyinde okuma izni (RLS ayrıca aşağıdaki politikalarla sınırlar)
grant select on public.matches  to anon;
grant select on public.joins    to anon;
grant select on public.waitlist to anon;

-- Açık maçları misafir okuyabilir
drop policy if exists "maçlar: misafir okur" on public.matches;
create policy "maçlar: misafir okur" on public.matches
  for select to anon using (status = 'open');

-- Katılım ve yedekler yalnızca açık maçlar için misafire görünür (isim yok, sadece sayılar)
drop policy if exists "katılımlar: misafir okur" on public.joins;
create policy "katılımlar: misafir okur" on public.joins
  for select to anon
  using (exists (select 1 from public.matches m where m.id = match_id and m.status = 'open'));

drop policy if exists "yedekler: misafir okur" on public.waitlist;
create policy "yedekler: misafir okur" on public.waitlist
  for select to anon
  using (exists (select 1 from public.matches m where m.id = match_id and m.status = 'open'));
