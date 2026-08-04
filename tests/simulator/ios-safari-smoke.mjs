import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';

const APPIUM_URL = process.env.APPIUM_URL || 'http://127.0.0.1:4723';
const TARGET_URL = process.env.TARGET_URL || 'http://127.0.0.1:4173/tests/fixtures/ios-interface.html';
const DEVICE_NAME = process.env.DEVICE_NAME;
const PLATFORM_VERSION = process.env.PLATFORM_VERSION || '18.5';
const SIMULATOR_UDID = process.env.SIMULATOR_UDID;
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'simulator-artifacts';
const ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';
const COMMAND_TIMEOUT = 180_000;
const SESSION_TIMEOUT = 720_000;

if (!DEVICE_NAME) throw new Error('DEVICE_NAME is required');
if (!SIMULATOR_UDID) throw new Error('SIMULATOR_UDID is required');

await mkdir(ARTIFACT_DIR, { recursive: true });

let sessionId = null;

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function request(method, path, body, { timeout = COMMAND_TIMEOUT } = {}) {
  const url = new URL(path, `${APPIUM_URL.replace(/\/$/, '')}/`);
  const bodyText = body === undefined ? null : JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const client = httpRequest(url, {
      method,
      headers: bodyText === null ? undefined : {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(bodyText)
      }
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let payload = {};

        if (text) {
          try {
            payload = JSON.parse(text);
          } catch {
            reject(new Error(`${method} ${path} returned non-JSON (${response.statusCode}): ${text.slice(0, 500)}`));
            return;
          }
        }

        if ((response.statusCode || 500) >= 400 || payload?.value?.error) {
          const detail = payload?.value?.message || payload?.message || text || response.statusMessage;
          reject(new Error(`${method} ${path} failed (${response.statusCode}): ${detail}`));
          return;
        }

        resolve(payload.value);
      });
    });

    client.setTimeout(timeout, () => {
      client.destroy(new Error(`${method} ${path} timed out after ${timeout}ms`));
    });
    client.on('error', reject);

    if (bodyText === null) client.end();
    else client.end(bodyText);
  });
}

async function poll(label, callback, { timeout = 45_000, interval = 250 } = {}) {
  const deadline = Date.now() + timeout;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const value = await callback();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(interval);
  }

  throw new Error(`${label} timed out${lastError ? `: ${lastError.message}` : ''}`);
}

function sessionCapabilities() {
  return {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': DEVICE_NAME,
    'appium:platformVersion': PLATFORM_VERSION,
    'appium:udid': SIMULATOR_UDID,
    'appium:noReset': true,
    'appium:autoLaunch': false,
    'appium:newCommandTimeout': 300,
    'appium:wdaLaunchTimeout': 600_000,
    'appium:wdaConnectionTimeout': 600_000,
    'appium:wdaStartupRetries': 1,
    'appium:wdaStartupRetryInterval': 10_000,
    'appium:waitForIdleTimeout': 1,
    'appium:includeSafariInWebviews': true,
    'appium:webviewConnectTimeout': 30_000,
    'appium:webviewConnectRetries': 60
  };
}

async function createSession() {
  const result = await request('POST', '/session', {
    capabilities: {
      alwaysMatch: sessionCapabilities(),
      firstMatch: [{}]
    }
  }, { timeout: SESSION_TIMEOUT });

  sessionId = result.sessionId;
  assert.ok(sessionId, 'Appium did not return a session id');
  await writeFile(
    `${ARTIFACT_DIR}/session-capabilities.json`,
    `${JSON.stringify(result.capabilities, null, 2)}\n`
  );
}

async function execute(script, args = []) {
  return request('POST', `/session/${sessionId}/execute/sync`, { script, args });
}

async function executeMobile(method, options = {}) {
  return execute(`mobile: ${method}`, [options]);
}

async function launchSafariFixture() {
  await executeMobile('deepLink', {
    url: TARGET_URL,
    bundleId: 'com.apple.mobilesafari'
  });
}

async function ensureWebContext() {
  const webContext = await poll('Safari web context', async () => {
    const contexts = await request('GET', `/session/${sessionId}/contexts`);
    return contexts.find((context) => context !== 'NATIVE_APP');
  }, { timeout: 60_000, interval: 500 });

  await request('POST', `/session/${sessionId}/context`, { name: webContext });
  await request('POST', `/session/${sessionId}/url`, { url: TARGET_URL });
}

async function find(selector) {
  const value = await request('POST', `/session/${sessionId}/element`, {
    using: 'css selector',
    value: selector
  });
  const elementId = value?.[ELEMENT_KEY];
  assert.ok(elementId, `No WebDriver element id returned for ${selector}`);
  return elementId;
}

async function click(selector) {
  const elementId = await find(selector);
  await request('POST', `/session/${sessionId}/element/${elementId}/click`, {});
}

async function type(selector, text) {
  const elementId = await find(selector);
  await request('POST', `/session/${sessionId}/element/${elementId}/value`, {
    text,
    value: Array.from(text)
  });
}

async function readInterfaceState() {
  return execute(`
    return {
      ready: document.body.dataset.fixtureReady,
      surface: document.body.dataset.uiSurface,
      blocking: document.body.dataset.uiBlocking,
      timelineOpen: document.querySelector('#timelineHud')?.dataset.open,
      settingsOpen: document.querySelector('#searchShell')?.classList.contains('is-open'),
      searchOpen: document.querySelector('#searchSuggestions')?.dataset.open,
      placeDetent: document.querySelector('#placeSheet')?.dataset.detent,
      semanticPlaceDetent: window.WorldlineIOSInterface?.semanticDetent('place'),
      focusedId: document.activeElement?.id || '',
      searchValue: document.querySelector('#historySearch')?.value || '',
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      visualWidth: window.visualViewport?.width || 0,
      visualHeight: window.visualViewport?.height || 0,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      orientation: screen.orientation?.type || ''
    };
  `);
}

function assertContained(state, label) {
  assert.ok(state.visualWidth > 0 && state.visualHeight > 0, `${label}: VisualViewport is unavailable`);
  assert.ok(
    state.scrollWidth <= state.innerWidth + 1,
    `${label}: horizontal page overflow (${state.scrollWidth} > ${state.innerWidth})`
  );
  assert.ok(
    state.scrollHeight <= state.innerHeight + 1,
    `${label}: vertical page overflow (${state.scrollHeight} > ${state.innerHeight})`
  );
}

async function rotate(orientation) {
  await request('POST', `/session/${sessionId}/orientation`, { orientation });
  await poll(`${orientation} orientation`, async () => {
    const current = await request('GET', `/session/${sessionId}/orientation`);
    return String(current).toUpperCase() === orientation;
  }, { timeout: 30_000 });
  await sleep(750);
}

async function captureWebDriverScreenshot(name) {
  if (!sessionId) return;
  try {
    const image = await request('GET', `/session/${sessionId}/screenshot`);
    await writeFile(`${ARTIFACT_DIR}/${name}.png`, Buffer.from(image, 'base64'));
  } catch (error) {
    await writeFile(`${ARTIFACT_DIR}/${name}-error.txt`, `${error.stack || error.message}\n`);
  }
}

async function deleteSession() {
  if (!sessionId) return;
  try {
    await request('DELETE', `/session/${sessionId}`, undefined, { timeout: 120_000 });
  } finally {
    sessionId = null;
  }
}

async function run() {
  await createSession();
  await launchSafariFixture();
  await ensureWebContext();

  await poll('Worldline fixture readiness', async () => {
    const state = await readInterfaceState();
    return state.ready === 'true' && state;
  }, { timeout: 60_000 });

  let state = await readInterfaceState();
  assert.equal(state.surface, 'none');
  assert.equal(state.placeDetent, 'closed');
  assertContained(state, 'initial portrait');

  await click('#yearButton');
  state = await poll('timeline activation', async () => {
    const next = await readInterfaceState();
    return next.surface === 'timeline' && next.timelineOpen === 'true' && next;
  });
  assert.equal(state.settingsOpen, false);
  assert.equal(state.placeDetent, 'closed');

  await execute('window.setSheetOpen(true, {}); return true;');
  state = await poll('settings activation', async () => {
    const next = await readInterfaceState();
    return next.surface === 'settings' && next.settingsOpen === true && next;
  });
  assert.equal(state.timelineOpen, 'false');
  assert.equal(state.placeDetent, 'closed');

  await execute(`
    window.openPlaceCard({
      name: 'Rome',
      eyebrow: 'Historical city',
      subtitle: '117 CE',
      range: '117 CE',
      confidence: 'Reviewed evidence',
      evidence: 'iOS Simulator fixture',
      note: 'Native Safari regression',
      sourceUrl: '#source',
      coordinates: [12.4964, 41.9028]
    });
    return true;
  `);
  state = await poll('place peek detent', async () => {
    const next = await readInterfaceState();
    return next.surface === 'place' && next.placeDetent === 'peek' && next;
  });
  assert.equal(state.settingsOpen, false);
  assert.equal(state.blocking, 'false');

  await click('#placeExpand');
  state = await poll('place medium detent', async () => {
    const next = await readInterfaceState();
    return next.placeDetent === 'medium' && next;
  });
  assert.equal(state.semanticPlaceDetent, 'medium');
  assert.equal(state.blocking, 'false');

  await click('#placeExpand');
  state = await poll('place full detent', async () => {
    const next = await readInterfaceState();
    return next.placeDetent === 'full' && next;
  });
  assert.equal(state.semanticPlaceDetent, 'large');
  assert.equal(state.blocking, 'true');
  assertContained(state, 'full place sheet portrait');

  await click('#placeClose');
  state = await poll('place dismissal', async () => {
    const next = await readInterfaceState();
    return next.surface === 'none' && next.placeDetent === 'closed' && next;
  });

  await click('#historySearch');
  await type('#historySearch', 'Rome');
  state = await poll('Safari search typing', async () => {
    const next = await readInterfaceState();
    return next.surface === 'search' && next.searchValue === 'Rome' && next;
  });
  assert.equal(state.focusedId, 'historySearch');
  assert.equal(state.searchOpen, 'true');
  assertContained(state, 'search with software keyboard request');

  await execute(`
    document.querySelector('#historySearch')?.blur();
    window.WorldlineUI?.close('search', { reason: 'simulator-test-close' });
    return true;
  `);
  await poll('search dismissal', async () => {
    const next = await readInterfaceState();
    return next.surface === 'none' && next.focusedId !== 'historySearch' && next;
  });

  await rotate('LANDSCAPE');
  state = await readInterfaceState();
  assertContained(state, 'landscape');

  await execute(`
    window.openPlaceCard({
      name: 'Rome',
      subtitle: '117 CE',
      range: '117 CE',
      confidence: 'Reviewed evidence',
      evidence: 'Orientation fixture',
      sourceUrl: '#source'
    });
    return true;
  `);
  await click('#placeExpand');
  await click('#placeExpand');
  state = await poll('landscape full place sheet', async () => {
    const next = await readInterfaceState();
    return next.placeDetent === 'full' && next;
  });
  assertContained(state, 'full place sheet landscape');

  await rotate('PORTRAIT');
  state = await readInterfaceState();
  assertContained(state, 'restored portrait');

  await captureWebDriverScreenshot('ios-safari-pass');
  await writeFile(`${ARTIFACT_DIR}/final-state.json`, `${JSON.stringify(state, null, 2)}\n`);
}

try {
  await run();
  console.log(`iOS Simulator Safari checks passed on ${DEVICE_NAME} (${PLATFORM_VERSION}).`);
} catch (error) {
  console.error(error.stack || error.message);
  await captureWebDriverScreenshot('ios-safari-failure');
  await writeFile(`${ARTIFACT_DIR}/failure.txt`, `${error.stack || error.message}\n`);
  process.exitCode = 1;
} finally {
  await deleteSession();
}
