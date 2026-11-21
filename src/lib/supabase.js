import { createClient } from '@supabase/supabase-js'

// Bu iki değer herkese açıktır (tarayıcıya zaten gider). Veriyi koruyan şey
// veritabanındaki güvenlik kurallarıdır (RLS). Gizli "secret / service_role"
// anahtarı ASLA buraya yazılmaz.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://bpkydmxgjwagbeoabakb.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwa3lkbXhnandhZ2Jlb2FiYWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxMjMzMzAsImV4cCI6MjExMDY5OTMzMH0.hS60VavDmDxo7pNDCHNq3wMp2cKVvUDaL1YsWNd45uM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Depolama isteklerini elle göndermek için (aşağıda api.js kullanıyor)
export { SUPABASE_URL, SUPABASE_KEY }


// Supabase hata mesajlarını anlaşılır Türkçeye çevir
export function trError(err) {
  const msg = (err?.message || String(err || '')).toLowerCase()
  if (msg.includes('not authorized')) return 'Mail gönderilemedi: Supabase mail ayarı (SMTP) henüz yapılmamış.'
  if (msg.includes('rate limit') || msg.includes('security purposes')) return 'Çok sık denedin. Bir dakika bekleyip tekrar dene.'
  if (msg.includes('database error saving new user')) return 'Kayıt sırasında bir sorun oldu, tekrar dene.'
  if (msg.includes('expired') || msg.includes('invalid')) return 'Kod hatalı ya da süresi dolmuş. Yeni kod isteyebilirsin.'
  if (msg.includes('fetch') || msg.includes('network')) return 'İnternet bağlantısı yok gibi görünüyor.'
  return err?.message || 'Bir şeyler ters gitti. Tekrar dene.'
}
