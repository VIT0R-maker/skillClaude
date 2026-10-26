import { chromium } from 'playwright';

const firstLine = text => String(text).split('\n').find(line => line.trim())?.trim() ?? 'erro desconhecido';

function containerArgs(env) {
  // Somente para ambientes sem sandbox de navegador (contêineres, CI). Nunca é padrão.
  return env.LANDING_BROWSER_NO_SANDBOX === '1' ? ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] : [];
}

/**
 * Inicia um navegador Chromium. Ordem:
 * 1. LANDING_BROWSER_PATH, quando informado (falha explícita se não iniciar);
 * 2. Chromium instalado pelo Playwright;
 * 3. Microsoft Edge instalado (já presente em todo Windows 10/11);
 * 4. Google Chrome instalado.
 * Retorna { browser, source, version } para o relatório registrar a cobertura real.
 */
export async function launchBrowser({ env = process.env, launchOptions = {} } = {}) {
  const args = [...(launchOptions.args || []), ...containerArgs(env)];
  if (env.LANDING_BROWSER_PATH) {
    try {
      const browser = await chromium.launch({ ...launchOptions, executablePath: env.LANDING_BROWSER_PATH, args });
      return { browser, source: 'LANDING_BROWSER_PATH', version: browser.version() };
    } catch (error) {
      throw new Error(`LANDING_BROWSER_PATH não iniciou (${env.LANDING_BROWSER_PATH}): ${firstLine(error.message)}`);
    }
  }
  const candidates = [
    { source: 'Chromium do Playwright', options: {} },
    { source: 'Microsoft Edge instalado', options: { channel: 'msedge' } },
    { source: 'Google Chrome instalado', options: { channel: 'chrome' } }
  ];
  const failures = [];
  for (const { source, options } of candidates) {
    try {
      const browser = await chromium.launch({ ...launchOptions, ...options, args });
      return { browser, source, version: browser.version() };
    } catch (error) { failures.push(`- ${source}: ${firstLine(error.message)}`); }
  }
  throw new Error(`Nenhum navegador pôde ser iniciado:\n${failures.join('\n')}\nInstale o Chromium (npx playwright install chromium), instale Edge/Chrome ou informe LANDING_BROWSER_PATH.`);
}

/** Aguarda quadros reais: antes do primeiro quadro não existe estilo anterior de onde uma transição possa partir. */
export async function settleFrames(page, frames = 2) {
  await page.evaluate(count => new Promise(resolve => {
    const timer = setTimeout(resolve, 1500);
    const tick = remaining => remaining <= 0 ? (clearTimeout(timer), resolve()) : requestAnimationFrame(() => tick(remaining - 1));
    tick(count);
  }), frames);
}

/**
 * Contexto de teste que só lê do servidor local: bloqueia rede externa, WebSockets,
 * métodos de escrita e qualquer submit (inclusive programático). Use-o também nos
 * testes específicos do projeto para nunca enviar mensagens ou dados reais.
 */
export async function guardedContext(browser, origin, viewport, scale = 1, findings = [], reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale, reducedMotion, serviceWorkers: 'block', acceptDownloads: false });
  await context.route('**/*', async route => {
    const request = route.request();
    if (new URL(request.url()).origin === origin && ['GET', 'HEAD'].includes(request.method())) return route.continue();
    findings.push({ type: 'blocked-request', method: request.method(), url: request.url(), message: 'Requisição bloqueada: a verificação só permite leitura no servidor local.' });
    await route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', socket => { findings.push({ type: 'blocked-websocket', url: socket.url() }); socket.close(); });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => findings.push({ type: 'javascript', message: error.message }));
  page.on('console', message => { if (message.type() === 'error') findings.push({ type: 'console', message: message.text() }); });
  page.on('response', response => { if (response.status() >= 400) findings.push({ type: 'http', status: response.status(), url: response.url() }); });
  page.on('requestfailed', request => findings.push({ type: 'network', url: request.url(), message: request.failure()?.errorText }));
  page.on('dialog', dialog => dialog.dismiss());
  await context.addInitScript(() => {
    // Não dispara submit; inclusive submissões programáticas são neutralizadas.
    document.addEventListener('submit', event => event.preventDefault(), true);
    HTMLFormElement.prototype.submit = function () {};
    HTMLFormElement.prototype.requestSubmit = function () {};
  });
  return { page, context };
}
