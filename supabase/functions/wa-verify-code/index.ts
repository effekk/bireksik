// SMS kodunu doğrula — Twilio Verify; başarılıysa numarayı onayla
// Secret'lar: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

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

    const { code } = await req.json().catch(() => ({ code: '' }))
    const admin = createClient(url, service)

    // Kod hangi numaraya gitmişti?
    const { data: otp } = await admin.from('phone_otp').select('phone, expires_at').eq('user_id', user.id).maybeSingle()
    if (!otp || new Date(otp.expires_at).getTime() < Date.now())
      return json({ error: 'Kodun süresi doldu. Yeniden iste.' }, 400)

    // Twilio Verify — kodu kontrol et
    const sid = Deno.env.get('TWILIO_ACCOUNT_SID')!
    const tok = Deno.env.get('TWILIO_AUTH_TOKEN')!
    const vsid = Deno.env.get('TWILIO_VERIFY_SID')!
    const r = await fetch(`https://verify.twilio.com/v2/Services/${vsid}/VerificationCheck`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(`${sid}:${tok}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: otp.phone, Code: String(code) }),
    })
    const out = await r.json().catch(() => ({}))
    if (!r.ok || out.status !== 'approved')
      return json({ error: 'Kod yanlış ya da süresi doldu.' }, 400)

    // Numarayı onayla (tekillik DB'de garanti)
    const { error: upErr } = await admin.from('profiles')
      .update({ phone: otp.phone, phone_verified: true }).eq('id', user.id)
    if (upErr) {
      if ((upErr as { code?: string }).code === '23505')
        return json({ error: 'Bu numara başka bir hesapta kayıtlı.' }, 409)
      return json({ error: 'Kaydedilemedi.' }, 500)
    }
    await admin.from('phone_otp').delete().eq('user_id', user.id)
    return json({ ok: true, phone: otp.phone })
  } catch (e) {
    console.error(e)
    return json({ error: 'Beklenmedik hata.' }, 500)
  }
})
