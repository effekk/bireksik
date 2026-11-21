// SMS kodunu doğrula ve numarayı onayla (kodu biz sakladık — yerel karşılaştırma)
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

    const { data: otp } = await admin.from('phone_otp').select('*').eq('user_id', user.id).maybeSingle()
    if (!otp || new Date(otp.expires_at).getTime() < Date.now())
      return json({ error: 'Kodun süresi doldu. Yeniden iste.' }, 400)
    if (otp.attempts >= 5)
      return json({ error: 'Çok fazla yanlış deneme. Yeni kod iste.' }, 429)

    if (String(code) !== String(otp.code)) {
      await admin.from('phone_otp').update({ attempts: otp.attempts + 1 }).eq('user_id', user.id)
      return json({ error: 'Kod yanlış.' }, 400)
    }

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
