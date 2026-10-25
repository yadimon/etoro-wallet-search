import { resolveLanguage, translate } from './i18n.js';
const language = resolveLanguage(
  new URLSearchParams(location.search).get('lang') || chrome.i18n.getUILanguage(),
);
document.documentElement.lang = language;
document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
document.querySelector('article').lang = language;
for (const [id, key] of Object.entries({
  title: 'title',
  help: 'help',
  instructions: 'helpText',
  statistics: 'statistics',
  'status-note': 'statusNote',
  classification: 'classificationNote',
  cache: 'cacheClear',
  'cache-note': 'cacheInfo',
  'permission-note': 'permission',
}))
  document.getElementById(id).textContent = translate(language, key);
