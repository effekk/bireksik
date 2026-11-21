-- 18_dev_badge.sql
-- Profilde "Geliştirici" rozeti. Sadece SQL'den atanır; kullanıcı kendine veremez
-- (authenticated'a update izni verilmez), herkes görebilir.
-- Güvenle tekrar çalıştırılabilir.

alter table public.profiles add column if not exists is_dev boolean not null default false;
-- Not: is_dev için authenticated'a update izni VERİLMEZ; böylece kimse kendine rozet açamaz.

-- Kendi hesabına rozeti ver (e-postanı doğru yaz):
update public.profiles
set is_dev = true
where id = (select id from auth.users where email = 'efekargin2006@gmail.com');
