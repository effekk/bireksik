// Aşağı kaydırdıkça .reveal öğelerini yumuşakça belirt.
// IntersectionObserver yoksa ya da kullanıcı "hareketi azalt" dediyse hiçbir şey
// gizlenmez (html.reveal-ready eklenmez → CSS'te içerik tam görünür kalır).
if (typeof window !== 'undefined' &&
    'IntersectionObserver' in window &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  const root = document.documentElement
  root.classList.add('reveal-ready')

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 })

  const scan = (node) => {
    if (!node || node.nodeType !== 1) return
    if (node.matches && node.matches('.reveal:not(.in)')) io.observe(node)
    if (node.querySelectorAll) node.querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el))
  }

  const start = () => {
    scan(document.body)
    new MutationObserver((muts) => {
      for (const m of muts) for (const n of m.addedNodes) scan(n)
    }).observe(document.body, { childList: true, subtree: true })
  }

  if (document.body) start()
  else document.addEventListener('DOMContentLoaded', start)
}
