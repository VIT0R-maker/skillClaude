const toggle = document.querySelector('#menu-toggle');
const panel = document.querySelector('#mobile-menu');
function setMenu(open, restoreFocus = false) {
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  panel.classList.toggle('open', open);
  panel.inert = !open;
  if (restoreFocus) toggle.focus();
}
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false, true); });
panel.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (link) { setMenu(false); document.querySelector(link.getAttribute('href'))?.focus({ preventScroll: true }); }
});
matchMedia('(min-width: 900px)').addEventListener('change', event => { if (event.matches) setMenu(false); });
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('shown'); observer.unobserve(entry.target); }
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(section => observer.observe(section));
  document.documentElement.classList.add('js');
}
document.querySelector('form').addEventListener('submit', event => { event.preventDefault(); document.querySelector('#form-status').textContent = 'Dados válidos neste navegador. Nenhuma mensagem foi enviada.'; });
