import path from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import { startServer } from './serve.mjs';
import { main, number, parseArgs, writeJson } from './lib/cli.mjs';
import { guardedContext, launchBrowser, settleFrames } from './lib/browser.mjs';

const pendingReview = [
  'Comparar as capturas com TODAS as referências do usuário: composição, copy, fontes, fotografias, fundos, sombras e espaçamentos.',
  'Inspecionar sobreposições e cortes visualmente; a detecção de overflow não prova ausência de colisões.',
  'Conferir destinos comerciais e fluxo de negócio. Os formulários não são enviados e links externos não são abertos.',
  'Examinar a qualidade das animações com movimento habilitado. Os testes de estados e transições não avaliam sua estética.',
  'Exercitar controles específicos da página (por exemplo, galeria, accordion, carrossel) e registrar evidências separadas.'
];

async function settle(page, findings) {
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await page.evaluate(async () => {
    await Promise.race([document.fonts.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Fontes não estabilizaram em 10 s.')), 10000))]);
  });
  // Visita a página inteira para disparar loading=lazy e IntersectionObserver.
  let reachedEnd = false;
  for (let step = 0; step < 160; step++) {
    const position = await page.evaluate(() => ({ y: scrollY, max: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - innerHeight, increment: Math.max(200, innerHeight * 0.7) }));
    if (position.y >= position.max - 2) { reachedEnd = true; break; }
    await page.evaluate(increment => scrollBy(0, increment), position.increment);
    await page.waitForTimeout(70);
  }
  if (!reachedEnd) findings.push({ type: 'scroll-limit', message: 'Página não terminou em 160 passos; investigar scroll infinito ou bloqueado.' });
  await page.waitForTimeout(650);
  const images = await page.evaluate(async () => {
    await Promise.all([...document.images].map(image => Promise.race([
      image.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 10000))
    ])));
    return [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.currentSrc || image.src || '(sem src)');
  });
  for (const url of images) findings.push({ type: 'image', url, message: 'Imagem não carregada.' });
  await page.evaluate(async () => {
    await Promise.race([document.fonts.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Fontes tardias não estabilizaram em 10 s.')), 10000))]);
  });
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      try { if (animation.effect?.getComputedTiming().iterations === Infinity) animation.cancel(); else animation.finish(); } catch { animation.cancel(); }
    }
    scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.mouse.move(-1, -1);
  await page.waitForTimeout(120);
}

async function inspect(page) {
  return page.evaluate(() => {
    const visible = element => { const style = getComputedStyle(element); return style.visibility !== 'hidden' && style.display !== 'none' && element.getClientRects().length > 0; };
    const overflow = [...document.querySelectorAll('body *')].filter(visible).filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.left < -1 || rect.right > innerWidth + 1;
    }).slice(0, 30).map(element => ({ tag: element.tagName, id: element.id, className: element.className?.toString() }));
    const anchors = [...document.querySelectorAll('a[href]')].map(anchor => {
      const href = anchor.getAttribute('href');
      let issue = null;
      if (!href || href === '#') issue = 'Destino vazio';
      if (/^javascript:/i.test(href)) issue = 'Destino javascript';
      if (href.startsWith('#') && href.length > 1) {
        try { if (!document.getElementById(decodeURIComponent(href.slice(1)))) issue = 'Âncora ausente'; }
        catch { issue = 'Fragmento inválido'; }
      }
      return { text: anchor.textContent.trim().slice(0, 80), href, issue };
    });
    const forms = [...document.forms].map(form => ({
      action: form.getAttribute('action'), method: form.method,
      controls: [...form.elements].filter(field => 'validity' in field).map(field => ({ name: field.name, type: field.type, required: field.required, valid: field.validity.valid })),
      submitted: false, status: 'inventariado; validação de negócio e estados precisam de teste específico sem envio'
    }));
    return { horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1, overflowCandidates: overflow, anchors, forms };
  });
}

async function keyboardSmoke(page) {
  await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
  const visited = [];
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab');
    visited.push(await page.evaluate(() => {
      const el = document.activeElement;
      return { tag: el?.tagName, id: el?.id, text: el?.textContent?.trim().slice(0, 60), hidden: el && (getComputedStyle(el).visibility === 'hidden' || getComputedStyle(el).display === 'none') };
    }));
  }
  return visited;
}

async function testMenu(browser, origin, width, scale, menu) {
  const findings = [];
  const checks = [];
  const { context, page } = await guardedContext(browser, origin, { width, height: 900 }, scale, findings);
  const record = (name, passed) => { checks.push({ name, passed }); if (!passed) findings.push({ type: 'menu', message: name }); };
  const duration = number(menu.durationMs ?? 400, 'menu.durationMs', { min: 150, max: 3000 });
  try {
    await page.goto(origin, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    // Sem um primeiro quadro não há estilo anterior de onde a transição possa partir.
    await settleFrames(page);
    const toggle = page.locator(menu.toggle);
    const panel = page.locator(menu.panel);
    if (await toggle.count() !== 1 || await panel.count() !== 1) throw new Error('Seletores do menu devem identificar um botão e um painel.');
    const closeControl = menu.close ? page.locator(menu.close) : toggle;
    if (await closeControl.count() !== 1) throw new Error('menu.close deve identificar um único controle de fechamento.');
    const expanded = async expected => (await toggle.getAttribute('aria-expanded')) === String(expected);
    const activeAnimations = () => panel.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => ['running', 'pending'].includes(animation.playState)).length);
    // Observa a transição desde ANTES da ativação, por eventos e quadros. Amostrar um instante fixo
    // gera falso negativo quando o navegador atrasa a amostra e a transição já terminou.
    const watchMotion = () => panel.evaluate(element => {
      const state = { seen: 0, stopped: false };
      const mark = () => { state.seen++; };
      const types = ['transitionrun', 'animationstart'];
      for (const type of types) element.addEventListener(type, mark, true);
      const poll = () => {
        if (element.getAnimations({ subtree: true }).some(animation => ['running', 'pending'].includes(animation.playState))) state.seen++;
        if (!state.stopped) requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
      state.stop = () => { state.stopped = true; for (const type of types) element.removeEventListener(type, mark, true); };
      window.__landingMotion = state;
    });
    const motionSeen = async () => {
      const seen = await page.waitForFunction(() => window.__landingMotion?.seen > 0, null, { timeout: duration }).then(() => true, () => false);
      await page.evaluate(() => window.__landingMotion?.stop?.());
      return seen;
    };
    const hidden = () => panel.evaluate(element => { const style = getComputedStyle(element); return style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0 || !element.getClientRects().length; });
    record('menu inicialmente fechado', await expanded(false));
    await toggle.focus();
    await watchMotion();
    await page.keyboard.press('Enter');
    record('abertura tem transição com movimento habilitado', await motionSeen());
    await page.waitForTimeout(duration);
    record('abertura atualiza aria-expanded e mostra painel', await expanded(true) && !await hidden());
    await watchMotion();
    await page.keyboard.press('Escape');
    record('fechamento tem transição com movimento habilitado', await motionSeen());
    await page.waitForTimeout(duration);
    record('Escape fecha e devolve foco ao botão', await expanded(false) && await toggle.evaluate(element => document.activeElement === element));
    record('painel fechado fica invisível', await hidden());
    record('painel fechado não intercepta cliques', await panel.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const target = document.elementFromPoint(Math.max(0, Math.min(innerWidth - 1, rect.x + rect.width / 2)), Math.max(0, Math.min(innerHeight - 1, rect.y + rect.height / 2)));
      return !target || !element.contains(target);
    }));
    for (let index = 0; index < 8; index++) {
      await page.keyboard.press('Tab');
      if (await panel.evaluate(element => element.contains(document.activeElement))) { record('painel invisível não recebe foco', false); break; }
    }
    // Enter gera ativação nativa do botão sem aguardar a estabilidade geométrica
    // exigida por locator.click(). O foco precisa ser alcançável em cada estado.
    const activate = async (control, name) => {
      await control.focus();
      if (!await control.evaluate(element => document.activeElement === element && !element.closest('[inert]') && !element.disabled)) {
        throw new Error(`Controle não alcançável durante reversão: ${name}`);
      }
      await page.keyboard.press('Enter');
    };
    await watchMotion();
    await activate(toggle, 'abrir');
    record('reversão começa durante a abertura', await expanded(true) && await motionSeen());
    await watchMotion();
    await activate(closeControl, 'fechar');
    record('ativação durante abertura inicia fechamento', await expanded(false) && await motionSeen());
    await activate(toggle, 'reabrir'); await page.waitForTimeout(duration + 40);
    record('ativações rápidas por teclado preservam a última intenção', await expanded(true) && !await hidden());
    if (await panel.getAttribute('aria-modal') === 'true') {
      record('modal bloqueia rolagem de fundo', await page.evaluate(() => ['hidden', 'clip'].includes(getComputedStyle(document.body).overflowY) || getComputedStyle(document.body).position === 'fixed' || ['hidden', 'clip'].includes(getComputedStyle(document.documentElement).overflowY)));
      await panel.locator('a, button, input, [tabindex="0"]').first().focus();
      let trapped = true;
      for (let index = 0; index < 12; index++) { await page.keyboard.press('Tab'); trapped &&= await panel.evaluate(element => element.contains(document.activeElement)); }
      record('modal mantém foco dentro do painel', trapped);
    }
    const sectionLink = panel.locator('a[href^="#"]').first();
    if (await sectionLink.count()) {
      await sectionLink.click(); await page.waitForTimeout(duration + 80);
      record('selecionar seção fecha o menu', await expanded(false));
    } else checks.push({ name: 'fechar ao escolher seção', passed: null, reason: 'Não há âncora interna no painel.' });
    if (await expanded(false)) await toggle.click();
    await page.setViewportSize({ width: Math.max(1200, (menu.breakpoint || 900) + 100), height: 900 });
    await page.waitForTimeout(duration + 80);
    record('mudar para desktop libera rolagem', await page.evaluate(() => !['hidden', 'clip'].includes(getComputedStyle(document.body).overflowY) && !['hidden', 'clip'].includes(getComputedStyle(document.documentElement).overflowY)));
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'load' });
    await toggle.click(); await page.waitForTimeout(100);
    record('reduced-motion mantém conteúdo acessível sem transição prolongada', await expanded(true) && !await hidden() && await activeAnimations() === 0);
  } catch (error) { findings.push({ type: 'menu-execution', message: error.message }); }
  finally { await context.close(); }
  return { width, movement: 'habilitado; reduced-motion conferido separadamente ao final', checks, findings };
}

export async function verify({ root = '.', out = '.work/verification', desktopWidth, desktopHeight = 900, scale = 1, config = {} }) {
  desktopWidth = number(desktopWidth, 'desktop-width', { min: 320, max: 6000 });
  desktopHeight = number(desktopHeight, 'desktop-height', { min: 320, max: 4000 });
  scale = number(scale, 'scale', { min: 0.5, max: 4, integer: false });
  if (config.menu) {
    if (typeof config.menu.toggle !== 'string' || typeof config.menu.panel !== 'string') throw new Error('Configure menu.toggle e menu.panel como seletores CSS.');
    if (config.menu.close !== undefined && typeof config.menu.close !== 'string') throw new Error('menu.close deve ser um seletor CSS.');
    number(config.menu.breakpoint ?? 900, 'menu.breakpoint', { min: 320, max: 3000 });
  }
  const output = path.resolve(out);
  await mkdir(output, { recursive: true });
  const report = { version: 1, startedAt: new Date().toISOString(), root: path.resolve(root), scale, automatedPassed: false, fidelityEstablished: false, viewports: [], motion: [], pendingReview };
  const server = await startServer({ root });
  let browser;
  try {
    const launched = await launchBrowser();
    browser = launched.browser;
    report.browser = { source: launched.source, version: launched.version };
    const widths = [...new Set([desktopWidth, 768, 390, 360])];
    for (const width of widths) {
      const findings = [];
      const height = width === desktopWidth ? desktopHeight : 900;
      const { context, page } = await guardedContext(browser, server.url, { width, height }, scale, findings);
      const result = { width, height, screenshot: `page-${width}.png`, regions: [], findings };
      try {
        await page.goto(server.url, { waitUntil: 'load' });
        await settle(page, findings);
        result.inspection = await inspect(page);
        if (result.inspection.horizontalOverflow) findings.push({ type: 'overflow', message: 'A página ultrapassa a largura do viewport.' });
        for (const anchor of result.inspection.anchors.filter(item => item.issue)) findings.push({ type: 'anchor', ...anchor });
        await page.screenshot({ path: path.join(output, result.screenshot), fullPage: true, animations: 'disabled', caret: 'hide' });
        for (const [index, region] of (config.regions || []).entries()) {
          const filename = `region-${width}-${index + 1}.png`;
          const locator = page.locator(region.selector);
          if (await locator.count() !== 1) { findings.push({ type: 'region', message: `Região deve ter um único alvo: ${region.selector}` }); continue; }
          await locator.screenshot({ path: path.join(output, filename), animations: 'disabled', caret: 'hide' });
          result.regions.push({ name: region.name || region.selector, selector: region.selector, screenshot: filename });
        }
        result.keyboardSmoke = await keyboardSmoke(page);
        for (const focus of result.keyboardSmoke.filter(item => item.hidden)) findings.push({ type: 'focus', message: 'Tab alcançou elemento oculto.', ...focus });
      } catch (error) { findings.push({ type: 'capture', message: error.message }); }
      finally { await context.close(); }
      report.viewports.push(result);
    }
    if (config.menu) {
      for (const width of [768, 390, 360].filter(value => value < (config.menu.breakpoint || 900))) report.motion.push(await testMenu(browser, server.url, width, scale, config.menu));
    } else report.pendingReview = [...pendingReview, 'Menu não testado automaticamente: forneça menu.toggle e menu.panel no arquivo de configuração, ou registre que a página não possui menu mobile.'];
    report.automatedPassed = [...report.viewports, ...report.motion].every(result => result.findings.length === 0);
  } catch (error) { report.executionError = error.message; }
  finally {
    if (browser) await browser.close();
    await server.close();
    report.finishedAt = new Date().toISOString();
    await writeJson(path.join(output, 'report.json'), report);
  }
  return report;
}

main(import.meta.url, async () => {
  const { options, files } = parseArgs(process.argv.slice(2), ['root', 'out', 'desktop-width', 'desktop-height', 'scale', 'config']);
  if (files.length || !options['desktop-width']) throw new Error('Use --root <projeto> --out <capturas> --desktop-width <pixels CSS> [--desktop-height 900] [--scale 1] [--config arquivo.json].');
  const config = options.config ? JSON.parse(await readFile(options.config, 'utf8')) : {};
  const report = await verify({ root: options.root, out: options.out, desktopWidth: options['desktop-width'], desktopHeight: options['desktop-height'], scale: options.scale, config });
  console.log(`Verificações automáticas: ${report.automatedPassed ? 'passaram' : 'há falhas'}. Relatório: ${path.resolve(options.out || '.work/verification', 'report.json')}`);
  console.log('Fidelidade visual e fluxos de negócio ainda exigem inspeção pelo agente; consulte pendingReview.');
  if (!report.automatedPassed) process.exitCode = 1;
});
