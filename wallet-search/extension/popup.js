import { LOCALES, translate, resolveLanguage } from './i18n.js';
import { azureExportOrigin } from './policy.js';
const refs = Object.fromEntries(
  [
    'version',
    'status',
    'details',
    'rows-label',
    'rows',
    'zone-label',
    'zone',
    'show',
    'remove',
    'open',
    'memory',
    'help',
    'permission',
    'permission-text',
    'permission-origin',
    'allow',
    'cache-label',
    'cache',
    'clear-cache',
  ].map((id) => [id, document.getElementById(id)]),
);
let tab,
  status = null,
  language = resolveLanguage(chrome.i18n.getUILanguage());
const t = (key) => translate(language, key);
const isEtoro = () => {
  try {
    return new URL(tab?.url || '').origin === 'https://www.etoro.com';
  } catch {
    return false;
  }
};
const isWallet = () =>
  isEtoro() && /^\/wallet\/account\/[A-Z]{3}\/?$/.test(new URL(tab.url).pathname);
const execute = (options) =>
  chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', ...options });
function permissionOrigin() {
  return azureExportOrigin(status?.permissionOrigin)
    ? new URL(status.permissionOrigin).origin
    : null;
}
function render() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  refs.version.textContent = `v${chrome.runtime.getManifest().version}`;
  refs['rows-label'].textContent = t('loaded');
  refs['zone-label'].textContent = t('timeZone');
  refs['cache-label'].textContent = t('cached');
  refs.show.textContent = t(status?.mounted ? 'show' : 'enable');
  refs.remove.textContent = t('remove');
  refs.remove.title = t('disableHint');
  refs.open.textContent = t('openWallet');
  refs.memory.textContent = t('cacheInfo');
  refs.help.textContent = t('help');
  refs.help.href = `help.html?lang=${encodeURIComponent(language)}`;
  refs['clear-cache'].textContent = t('cacheClear');
  refs.show.hidden = !isWallet();
  refs.remove.hidden = !status?.enabled;
  refs.open.hidden = isWallet();
  refs.details.hidden = !status?.mounted;
  refs['clear-cache'].hidden = !status?.cacheAvailable;
  refs.rows.textContent = new Intl.NumberFormat(LOCALES[language]).format(status?.rows || 0);
  refs.cache.textContent = new Intl.NumberFormat(LOCALES[language]).format(status?.cachedRows || 0);
  refs.zone.textContent = status?.timeZone || '—';
  refs.status.textContent = t(!isEtoro() ? 'openWallet' : status?.mounted ? 'active' : 'inactive');
  refs.permission.hidden = !permissionOrigin();
  refs['permission-text'].textContent = t('permission');
  refs['permission-origin'].textContent = permissionOrigin() || '';
  refs.allow.textContent = t('allow');
}
async function refresh() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  status = null;
  if (isEtoro()) {
    const [result] = await execute({
      func: () => window.__etoroWalletSearchV1?.getStatus?.() || null,
    });
    status = result?.result || null;
    if (status?.language) language = resolveLanguage(status.language);
  }
  render();
}
async function action(fn) {
  const buttons = [refs.show, refs.remove, refs.open, refs['clear-cache']];
  buttons.forEach((node) => (node.disabled = true));
  refs.status.classList.remove('error');
  try {
    await fn();
    await refresh();
  } catch {
    refs.status.textContent = t('error');
    refs.status.classList.add('error');
  } finally {
    buttons.forEach((node) => (node.disabled = false));
  }
}
refs.show.addEventListener(
  'click',
  () =>
    void action(async () => {
      const [shown] = await execute({
        func: () => {
          const host = document.querySelector('[data-etoro-wallet-search]');
          if (host) {
            host.scrollIntoView({ block: 'start', behavior: 'smooth' });
            return true;
          }
          return false;
        },
      });
      if (!shown?.result) await execute({ files: ['wallet-search.js'] });
    }),
);
refs.remove.addEventListener(
  'click',
  () => void action(() => execute({ func: () => window.__etoroWalletSearchV1?.destroy() })),
);
refs['clear-cache'].addEventListener(
  'click',
  () => void action(() => execute({ func: () => window.__etoroWalletSearchV1?.clearCache?.() })),
);
refs.open.addEventListener(
  'click',
  () => void action(() => chrome.tabs.create({ url: 'https://www.etoro.com/wallet/account/EUR' })),
);
refs.allow.addEventListener('click', async () => {
  const origin = permissionOrigin();
  if (!origin) return;
  refs.allow.disabled = true;
  try {
    if (await chrome.permissions.request({ origins: [`${origin}/*`] }))
      await execute({ func: () => window.__etoroWalletSearchV1?.retryExport?.() });
    await refresh();
  } catch {
    refs.status.textContent = t('error');
    refs.status.classList.add('error');
  } finally {
    refs.allow.disabled = false;
  }
});
void action(async () => {});
