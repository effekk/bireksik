-- 17_public_notes.sql
-- Oyunculara bırakılan notlar artık doğrudan profilde herkese görünür.
-- Kullanıcı tek tek seçmez; gizlenemez.
-- Güvenle tekrar çalıştırılabilir.

-- Yeni notlar varsayılan olarak herkese açık
alter table public.kudos alter column note_public set default true;

-- Mevcut tüm notları herkese açık yap
update public.kudos set note_public = true where note_public is distinct from true;

-- Kullanıcı artık notun görünürlüğünü değiştiremez (gizleyemez)
revoke update (note_public) on public.kudos from authenticated;
