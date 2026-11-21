// Tarayıcıdan çağrı için CORS başlıkları
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Girilen numarayı E.164 Türk cep formatına çevir: +905xxxxxxxxx
export function normalizeTR(raw: string): string | null {
  let d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('0')) d = '90' + d.slice(1)
  if (d.length === 10 && d.startsWith('5')) d = '90' + d
  if (d.length === 12 && d.startsWith('905')) return '+' + d
  return null
}
