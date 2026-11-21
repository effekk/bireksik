// SMS doğrulama kodu gönder — Twilio Verify (hat/numara gerektirmez)
// Secret'lar: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY otomatik gelir.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

function normalizeTR(raw: string): string | null {
  let d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('0')) d = '90' + d.slice(1)
  if (d.length === 10 && d.startsWith('5')) d = '90' + d
  if (d.length === 12 && d.startsWith('905')) return '+' + d
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Giriş yapmalısın.' }, 401)

    const { phone } = await req.json().catch(() => ({ phone: '' }))
    const e164 = normalizeTR(phone)
    if (!e164) return json({ error: 'Geçerli bir Türk cep numarası gir (5xx xxx xx xx).' }, 400)

    const admin = createClient(url, service)

    // Bir numaraya tek hesap
    const { data: taken } = await admin.from('profiles')
      .select('id').eq('phone', e164).eq('phone_verified', true).neq('id', user.id).maybeSingle()
    if (taken) return json({ error: 'Bu numara başka bir hesapta kayıtlı.' }, 409)

    // 60 sn hız sınırı
    const { data: prev } = await admin.from('phone_otp').select('last_sent').eq('user_id', user.id).maybeSingle()
    if (prev && Date.now() - new Date(prev.last_sent).getTime() < 60_000)
      return json({ error: 'Çok sık denedin, bir dakika bekle.' }, 429)

    // Twilio Verify — kodu Twilio gönderir
    const sid = Deno.env.get('TWILIO_ACCOUNT_SID')!
    const tok = Deno.env.get('TWILIO_AUTH_TOKEN')!
    const vsid = Deno.env.get('TWILIO_VERIFY_SID')!
    const r = await fetch(`https://verify.twilio.com/v2/Services/${vsid}/Verifications`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(`${sid}:${tok}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: e164, Channel: 'sms' }),
    })
    if (!r.ok) {
      console.error('Twilio start error', r.status, await r.text())
      return json({ error: 'SMS gönderilemedi. Numaranı kontrol et ya da biraz sonra dene.' }, 502)
    }

    // Hangi numaraya kod gittiğini sakla (doğrulama adımı için) — kodu Twilio tutar
    const expires = new Date(Date.now() + 10 * 60_000).toISOString()
    await admin.from('phone_otp').upsert({
      user_id: user.id, phone: e164, code: '-', expires_at: expires, attempts: 0, last_sent: new Date().toISOString(),
    })
    return json({ ok: true })
  } catch (e) {
    console.error(e)
    return json({ error: 'Beklenmedik hata.' }, 500)
  }
})
