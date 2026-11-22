-- 20_padel_sides.sql
-- joins.pos artık padel taraflarını da (Üst/Alt) kabul etsin.
-- Önceden sadece halısaha pozisyonlarına izin veriyordu.
-- Güvenle tekrar çalıştırılabilir.

alter table public.joins drop constraint if exists joins_pos_check;
alter table public.joins add constraint joins_pos_check
  check (pos is null or pos in ('Kaleci', 'Defans', 'Orta saha', 'Forvet', 'Üst', 'Alt'));
