-- 24_report_note.sql
-- Profildeki notları (yorumları) kullanıcılar bildirebilsin; bildirim gelince
-- uygulama mailine e-posta düşsün. Mevcut "reports" tablosu + _send_email kullanılır.
-- Güvenle tekrar çalıştırılabilir.
-- ÖN KOŞUL: 10_email_notifications.sql çalışmış ve app_config'de resend_key + from_email dolu olmalı.

-- 1) Bildirim sebeplerine "Uygunsuz yorum" ekle
alter table public.reports drop constraint if exists reports_reason_check;
alter table public.reports add constraint reports_reason_check
  check (reason in ('Kaba davranış', 'Kavga çıkardı', 'Taciz / rahatsız etme',
                    'Sahte profil', 'Uygunsuz yorum', 'Diğer'));

-- 2) Bildirimlerin gideceği uygulama maili (app_config).
--    AŞAĞIDAKİ SATIRI KENDİ OKUDUĞUN ADRESLE DEĞİŞTİRİP ÇALIŞTIR.
--    (Ayarlanmazsa e-posta gönderilmez; bildirim yine Supabase'de birikir.)
insert into public.app_config (key, value) values ('admin_email', 'efekargin2006@gmail.com')
  on conflict (key) do update set value = excluded.value;

-- 3) Bir bildirim oluşunca uygulama mailine e-posta gönder
create or replace function public._email_report()
returns trigger language plpgsql security definer set search_path = public as $$
declare adm text; who text; byname text; body text;
begin
  select value into adm from app_config where key = 'admin_email';
  if adm is null or adm = '' then return new; end if;
  select name into who from profiles where id = new.reported;
  select name into byname from profiles where id = new.reporter;
  body := '<div style="background:#f2f5f1;padding:28px 16px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">'
    || '<div style="max-width:460px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #e3e8e3;overflow:hidden;">'
    || '<div style="background:#8a1c1c;padding:16px 22px;color:#fff;font-weight:800;font-size:20px;">BirEksik · Bildirim</div>'
    || '<div style="padding:24px 22px;color:#13201a;font-size:15px;line-height:1.55;">'
    || '<p style="margin:0 0 10px;"><b>Sebep:</b> ' || coalesce(new.reason, '-') || '</p>'
    || '<p style="margin:0 0 10px;"><b>Bildirilen:</b> ' || coalesce(who, '-') || ' (' || new.reported::text || ')</p>'
    || '<p style="margin:0 0 10px;"><b>Bildiren:</b> ' || coalesce(byname, '-') || ' (' || new.reporter::text || ')</p>'
    || case when new.detail <> '' then '<p style="margin:0 0 10px;"><b>İçerik/not:</b> ' || new.detail || '</p>' else '' end
    || case when new.match_id is not null then '<p style="margin:0;color:#6b7a72;font-size:13px;">Maç: ' || new.match_id::text || '</p>' else '' end
    || '</div></div>'
    || '<p style="text-align:center;margin:16px 0 0;font-size:12px;color:#9baba1;">Supabase → reports tablosundan tüm bildirimleri görebilirsin.</p></div>';
  perform _send_email(adm, 'BirEksik · Yeni bildirim: ' || coalesce(new.reason, ''), body);
  return new;
end $$;

drop trigger if exists reports_email on public.reports;
create trigger reports_email after insert on public.reports
  for each row execute function public._email_report();
