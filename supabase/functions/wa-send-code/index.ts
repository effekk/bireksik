// WhatsApp doğrulama kodu gönder — tek dosya (panelden yapıştırılabilir)
// Secret'lar: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE, WHATSAPP_LANG (ops.)
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

    const { data: taken } = await admin.from('profiles')
      .select('id').eq('phone', e164).eq('phone_verified', true).neq('id', user.id).maybeSingle()
    if (taken) return json({ error: 'Bu numara başka bir hesapta kayıtlı.' }, 409)

    const { data: prev } = await admin.from('phone_otp').select('last_sent').eq('user_id', user.id).maybeSingle()
    if (prev && Date.now() - new Date(prev.last_sent).getTime() < 60_000)
      return json({ error: 'Çok sık denedin, bir dakika bekle.' }, 429)

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expires = new Date(Date.now() + 5 * 60_000).toISOString()
    const { error: upErr } = await admin.from('phone_otp').upsert({
      user_id: user.id, phone: e164, code, expires_at: expires, attempts: 0, last_sent: new Date().toISOString(),
    })
    if (upErr) return json({ error: 'Kayıt hatası.' }, 500)

    const token = Deno.env.get('WHATSAPP_TOKEN')!
    const phoneId = Deno.env.get('WHATSAPP_PHONE_ID')!
    const template = Deno.env.get('WHATSAPP_TEMPLATE') || 'bireksik_dogrulama'
    const lang = Deno.env.get('WHATSAPP_LANG') || 'tr'

    const waRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: e164.replace('+', ''),
        type: 'template',
        template: {
          name: template,
          language: { code: lang },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
          ],
        },
      }),
    })
    if (!waRes.ok) {
      console.error('WA error', waRes.status, await waRes.text())
      return json({ error: 'WhatsApp mesajı gönderilemedi. Numaranı ve WhatsApp kurulumunu kontrol et.' }, 502)
    }
    return json({ ok: true })
  } catch (e) {
    console.error(e)
    return json({ error: 'Beklenmedik hata.' }, 500)
  }
})
