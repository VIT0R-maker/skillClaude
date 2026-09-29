const ROOT = '/Users/rtadewald/.agents/skills/animate';

const MODES = {
  idle: { label: 'Idle', note: 'Movimento contínuo aplicado a elementos.' },
  transitions: { label: 'Entradas e transições', note: 'Aparições, reveals e mudanças de estado.' },
  interactions: { label: 'Interações', note: 'Respostas a hover, clique, foco, drag e scroll.' },
  backgrounds: { label: 'Backgrounds', note: 'Atmosferas animadas para superfícies e seções.' },
};

const ANIMATIONS = [
  { id: 'IDL-01', slug: 'cloth-flag', name: 'Cloth flag', mode: 'idle', category: 'Mídia e marca', sourcePage: 'component-motion.html', sourceId: 'cloth-flag' },
  { id: 'IDL-02', slug: 'glass-object', name: 'Glass object', mode: 'idle', category: 'Objetos 3D', sourcePage: 'spatial-3d.html', sourceId: 'glass-object', hint: 'Arraste para orbitar' },

  { id: 'TRN-01', slug: 'fade-rise', name: 'Fade rise', mode: 'transitions', category: 'Seções e hero', sourcePage: 'index.html', sourceId: 'fade-rise', replay: 'standard' },
  { id: 'TRN-02', slug: 'clip-reveal', name: 'Clip reveal', mode: 'transitions', category: 'Textos e tipografia', sourcePage: 'index.html', sourceId: 'clip-reveal', replay: 'standard' },
  { id: 'TRN-03', slug: 'blur-scale', name: 'Blur scale', mode: 'transitions', category: 'Cards e coleções', sourcePage: 'index.html', sourceId: 'blur-scale', replay: 'standard' },
  { id: 'TRN-04', slug: 'particle-scroll', name: 'Particle scroll', mode: 'transitions', category: 'Conteúdo rolável', sourcePage: 'index.html', sourceId: 'particle-scroll', replay: 'particle', hint: 'Role dentro do exemplo' },

  { id: 'INT-01', slug: 'glass-shimmer-cta', name: 'Glass shimmer CTA', mode: 'interactions', category: 'Botões e CTAs', sourcePage: 'component-motion.html', sourceId: 'aura-glass-cta', hint: 'Passe o cursor e clique' },
  { id: 'INT-02', slug: 'valence-core', name: 'Valence Core', mode: 'interactions', category: 'Botões e CTAs', sourcePage: 'component-motion.html', sourceId: 'valence-core', hint: 'Passe o cursor e clique' },
  { id: 'INT-03', slug: 'border-glow', name: 'Border glow', mode: 'interactions', category: 'Cards e containers', sourcePage: 'component-motion.html', sourceId: 'border-glow', hint: 'Aproxime o cursor das bordas' },
  { id: 'INT-04', slug: 'option-wheel', name: 'Option wheel', mode: 'interactions', category: 'Navegação e seleção', sourcePage: 'component-motion.html', sourceId: 'option-wheel', hint: 'Role, arraste ou use o teclado' },

  { id: 'BG-01', slug: 'liquid-shader', name: 'Liquid shader', mode: 'backgrounds', category: 'Página e seções', sourcePage: 'live-backgrounds.html', sourceId: 'liquid-shader' },
  { id: 'BG-02', slug: 'blaze', name: 'Blaze', mode: 'backgrounds', category: 'Página e seções', sourcePage: 'live-backgrounds.html', sourceId: 'blaze' },
  { id: 'BG-03', slug: 'droplets', name: 'Droplets', mode: 'backgrounds', category: 'Overlays de superfície', sourcePage: 'live-backgrounds.html', sourceId: 'droplets', hint: 'Mova o cursor sobre o vidro' },
  { id: 'BG-04', slug: 'frost', name: 'Frost', mode: 'backgrounds', category: 'Overlays de superfície', sourcePage: 'live-backgrounds.html', sourceId: 'frost', hint: 'Mova o cursor para derreter' },
  { id: 'BG-05', slug: 'matrix', name: 'Matrix', mode: 'backgrounds', category: 'Página e seções', sourcePage: 'live-backgrounds.html', sourceId: 'unicorn-matrix' },
  { id: 'BG-06', slug: 'aura-laser', name: 'Aura laser', mode: 'backgrounds', category: 'Hero e banners', sourcePage: 'live-backgrounds.html', sourceId: 'aura-laser' },
  { id: 'BG-07', slug: 'gradient-field', name: 'Gradient field', mode: 'backgrounds', category: 'Página e seções', sourcePage: 'live-backgrounds.html', sourceId: 'gradient-field' },
  { id: 'BG-08', slug: 'masked-matrix', name: 'Masked Matrix', mode: 'backgrounds', category: 'Bordas de seção', sourcePage: 'live-backgrounds.html', sourceId: 'masked-matrix' },
  { id: 'BG-09', slug: 'glass-wave', name: 'Glass wave', mode: 'backgrounds', category: 'Hero e banners', sourcePage: 'live-backgrounds.html', sourceId: 'glass-wave' },
  { id: 'BG-10', slug: 'aurora', name: 'Aurora', mode: 'backgrounds', category: 'Página e seções', sourcePage: 'live-backgrounds.html', sourceId: 'reactbits-aurora' },
  { id: 'BG-11', slug: 'floating-lines', name: 'Floating lines', mode: 'backgrounds', category: 'Página e seções', sourcePage: 'live-backgrounds.html', sourceId: 'floating-lines' },
  { id: 'BG-12', slug: 'light-pillar', name: 'Light pillar', mode: 'backgrounds', category: 'Hero e banners', sourcePage: 'live-backgrounds.html', sourceId: 'light-pillar' },
].map((item) => ({
  ...item,
  folder: `${item.id.toLowerCase()}-${item.slug}`,
  path: `${ROOT}/assets/animations/${item.id.toLowerCase()}-${item.slug}/`,
}));

const catalog = document.querySelector('#catalog');
const sourceCache = new Map();
const loadedModes = new Set();

const slugify = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

async function getSourcePage(name) {
  if (!sourceCache.has(name)) {
    sourceCache.set(name, fetch(`assets/runtime/source/${name}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Não foi possível carregar ${name}.`);
        return response.text();
      })
      .then((html) => new DOMParser().parseFromString(html, 'text/html')));
  }
  return sourceCache.get(name);
}

function makeReplay(item) {
  if (!item.replay) return null;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'specimen-action specimen-action--quiet';
  button.textContent = 'REPLAY';
  if (item.replay === 'particle') button.setAttribute('data-particle-scroll-replay', '');
  else button.dataset.replay = item.sourceId;
  return button;
}

function makeSpecimen(item, sourceDocument) {
  const source = sourceDocument.querySelector(`#${item.sourceId}`);
  if (!source) throw new Error(`Exemplo ${item.sourceId} não encontrado em ${item.sourcePage}.`);

  const specimen = source.cloneNode(true);
  specimen.classList.add('specimen');
  specimen.dataset.animationId = item.id;
  specimen.querySelectorAll('.parameter-panel').forEach((node) => node.remove());

  const card = specimen.querySelector('.demo-card');
  card?.querySelector('.demo-card-bar')?.remove();

  const header = document.createElement('header');
  header.className = 'specimen-head';
  header.innerHTML = `<span>${item.id}</span><h3>${item.name}</h3>`;
  card?.prepend(header);

  const footer = document.createElement('footer');
  footer.className = 'specimen-foot';
  const note = document.createElement('small');
  note.textContent = item.hint || 'Implementation ready';
  footer.append(note);

  const actions = document.createElement('div');
  actions.className = 'specimen-actions';
  const replay = makeReplay(item);
  if (replay) actions.append(replay);

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'specimen-action';
  copy.dataset.copyPath = item.path;
  copy.textContent = 'COPY ANIMATION';
  actions.append(copy);
  footer.append(actions);
  card?.append(footer);

  return specimen;
}

function groupByCategory(items) {
  const groups = new Map();
  items.forEach((item) => {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  });
  return groups;
}

async function renderCatalog() {
  const pages = [...new Set(ANIMATIONS.map((item) => item.sourcePage))];
  await Promise.all(pages.map(getSourcePage));
  catalog.replaceChildren();

  for (const [mode, info] of Object.entries(MODES)) {
    const items = ANIMATIONS.filter((item) => item.mode === mode);
    const groups = groupByCategory(items);
    const view = document.createElement('section');
    view.className = 'mode-view';
    view.dataset.modeView = mode;
    view.hidden = true;

    const side = document.createElement('aside');
    side.className = 'category-rail';
    side.setAttribute('aria-label', `Categorias de ${info.label}`);
    const sideIntro = document.createElement('div');
    sideIntro.className = 'rail-intro';
    sideIntro.innerHTML = `<span>${info.label}</span><p>${info.note}</p>`;
    side.append(sideIntro);
    const sideNav = document.createElement('nav');

    const content = document.createElement('div');
    content.className = 'mode-content';

    let index = 0;
    for (const [category, groupItems] of groups.entries()) {
      index += 1;
      const categorySlug = slugify(category);
      const categoryId = `${mode}-${categorySlug}`;
      const link = document.createElement('a');
      link.href = `#${mode}/${categorySlug}`;
      link.dataset.categoryLink = categoryId;
      link.innerHTML = `<b>${String(index).padStart(2, '0')}</b><span>${category}</span>`;
      sideNav.append(link);

      const section = document.createElement('section');
      section.className = 'category-section';
      section.id = categoryId;
      section.dataset.categorySection = categoryId;
      section.innerHTML = `
        <header class="category-head">
          <h2>${category}</h2>
          <span>${String(groupItems.length).padStart(2, '0')} examples</span>
        </header>
      `;
      const grid = document.createElement('div');
      grid.className = 'specimen-grid';
      for (const item of groupItems) {
        const source = await getSourcePage(item.sourcePage);
        grid.append(makeSpecimen(item, source));
      }
      section.append(grid);
      content.append(section);
    }

    side.append(sideNav);
    view.append(side, content);
    catalog.append(view);
  }
}

function loadClassic(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-runtime-src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.dataset.runtimeSrc = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.append(script);
  });
}

async function loadModeRuntime(mode) {
  if (loadedModes.has(mode)) return;
  loadedModes.add(mode);
  if (mode === 'transitions') {
    await loadClassic('assets/runtime/js/entrances.js');
    await import('../runtime/js/particle-scroll-entrance.js');
  }
  if (mode === 'idle') {
    await Promise.all([
      import('../runtime/js/cloth-flag.js'),
      import('../runtime/js/glass-object.js'),
    ]);
  }
  if (mode === 'interactions') {
    await loadClassic('assets/runtime/js/aura-glass-cta.js');
    await loadClassic('assets/runtime/js/valence-core.js');
    await loadClassic('assets/runtime/js/reactbits-border-glow.js');
    await loadClassic('assets/runtime/js/reactbits-option-wheel.js');
  }
  if (mode === 'backgrounds') {
    await loadClassic('assets/runtime/js/live-backgrounds.js');
    await Promise.all([
      import('../runtime/js/blaze-background.js'),
      import('../runtime/js/droplets-background.js'),
      import('../runtime/js/frost-background.js'),
    ]);
    await loadClassic('assets/runtime/js/unicorn-backgrounds.js');
    await loadClassic('assets/runtime/js/spline-background.js');
    await loadClassic('assets/runtime/js/reactbits-aurora.js');
    await loadClassic('assets/runtime/js/reactbits-floating-lines.js');
    await loadClassic('assets/runtime/js/reactbits-light-pillar.js');
  }
}

function currentRoute() {
  const raw = location.hash.replace(/^#/, '') || 'idle';
  const [candidate, category] = raw.split('/');
  return { mode: MODES[candidate] ? candidate : 'idle', category };
}

async function activateRoute() {
  const { mode, category } = currentRoute();
  document.querySelectorAll('[data-mode-view]').forEach((view) => {
    view.hidden = view.dataset.modeView !== mode;
  });
  document.querySelectorAll('[data-mode-link]').forEach((link) => {
    const active = link.dataset.modeLink === mode;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.body.dataset.mode = mode;
  await loadModeRuntime(mode);
  if (category) {
    requestAnimationFrame(() => document.querySelector(`#${mode}-${category}`)?.scrollIntoView({ behavior: 'smooth' }));
  } else {
    scrollTo({ top: 0, behavior: 'instant' });
  }
}

function installCopy() {
  const toast = document.querySelector('.copy-toast');
  let toastTimer;
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy-path]');
    if (!button) return;
    const path = button.dataset.copyPath;
    try {
      await navigator.clipboard.writeText(path);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = path;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    button.textContent = 'COPIED';
    toast.textContent = path;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
      button.textContent = 'COPY ANIMATION';
    }, 1800);
  });
}

function installVisibilityEvents() {
  document.addEventListener('visibilitychange', () => {
    document.dispatchEvent(new Event(document.hidden ? 'motion:pause' : 'motion:resume'));
  });
}

try {
  await renderCatalog();
  installCopy();
  installVisibilityEvents();
  window.addEventListener('hashchange', activateRoute);
  await activateRoute();
} catch (error) {
  console.error(error);
  catalog.innerHTML = `<div class="loading-state error"><span>Catalog error</span><strong>${error.message}</strong></div>`;
}
