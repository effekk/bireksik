// WhatsApp doğrulama kodu gönder
// Supabase Edge Function. Secret'lar: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID,
// WHATSAPP_TEMPLATE (authentication şablon adı), WHATSAPP_LANG (varsayılan "tr").
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY otomatik gelir.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { cors, json, normalizeTR } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Kullanıcıyı JWT'den çöz
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Giriş yapmalısın.' }, 401)

    const { phone } = await req.json().catch(() => ({ phone: '' }))
    const e164 = normalizeTR(phone)
    if (!e164) return json({ error: 'Geçerli bir Türk cep numarası gir (5xx xxx xx xx).' }, 400)

    const admin = createClient(url, service)

    // Bir numaraya tek hesap: başka doğrulanmış hesapta var mı?
    const { data: taken } = await admin.from('profiles')
      .select('id').eq('phone', e164).eq('phone_verified', true).neq('id', user.id).maybeSingle()
    if (taken) return json({ error: 'Bu numara başka bir hesapta kayıtlı.' }, 409)

    // 60 sn hız sınırı
    const { data: prev } = await admin.from('phone_otp').select('last_sent').eq('user_id', user.id).maybeSingle()
    if (prev && Date.now() - new Date(prev.last_sent).getTime() < 60_000)
      return json({ error: 'Çok sık denedin, bir dakika bekle.' }, 429)

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expires = new Date(Date.now() + 5 * 60_000).toISOString()
    const { error: upErr } = await admin.from('phone_otp').upsert({
      user_id: user.id, phone: e164, code, expires_at: expires, attempts: 0, last_sent: new Date().toISOString(),
    })
    if (upErr) return json({ error: 'Kayıt hatası.' }, 500)

    // WhatsApp Cloud API — authentication şablonu (gövde + kopyala butonu = kod)
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
      const t = await waRes.text()
      console.error('WA error', waRes.status, t)
      return json({ error: 'WhatsApp mesajı gönderilemedi. Numaranı ve WhatsApp kurulumunu kontrol et.' }, 502)
    }
    return json({ ok: true })
  } catch (e) {
    console.error(e)
    return json({ error: 'Beklenmedik hata.' }, 500)
  }
})
