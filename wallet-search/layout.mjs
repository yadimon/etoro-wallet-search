import { normalize, parseMinor } from './core.mjs';
export const PROFILE = Object.freeze({
  account: 'et-wallet-account',
  balance: 'et-wallet-account-balance',
  group: '.et-wallet-account__group__txn',
  list: 'cdk-virtual-scroll-viewport',
  header: 'et-wallet-account-group-txn-header',
  row: 'et-wallet-account-txn',
  firstDay: '2007-01-01',
  rowHeight: 80,
});

export function findAdapter(account, records = []) {
  const balance = account.querySelector(PROFILE.balance);
  const group = account.querySelector(PROFILE.group);
  const knownList = group?.querySelector(PROFILE.list);
  if (balance && knownList && !knownList.contains(balance))
    return { balance, group, list: knownList, known: true };
  // Conservative fallback: at least two recent CSV merchants must match sibling
  // rows. Never hide an ancestor containing the balance or account controls.
  const hits = [];
  for (const record of records.slice(0, 12)) {
    if (record.name.length < 5) continue;
    const leaf = [...account.querySelectorAll('span,p,div')].find(
      (node) =>
        node.children.length === 0 && normalize(node.textContent).includes(normalize(record.name)),
    );
    if (!leaf) continue;
    let row = leaf;
    for (let depth = 0; row?.parentElement && depth < 5; depth++, row = row.parentElement) {
      const parent = row.parentElement;
      if (parent === account || (balance && parent.contains(balance))) break;
      if (
        parent.children.length >= 2 &&
        parent.children.length < 1000 &&
        /[€£$]/.test(row.textContent)
      ) {
        hits.push(parent);
        break;
      }
    }
  }
  const list = hits.find((node) => hits.filter((hit) => hit === node).length >= 2);
  return { balance, group: list?.parentElement || group, list: list || null, known: false };
}

// Learn typography by comparing the latest export names/amounts with visible
// native records. A fixed, maintained layout remains the fallback.
export function inferTypography(account, records, host) {
  const items = [...account.querySelectorAll(PROFILE.row)].slice(0, 50);
  for (const record of records.slice(0, 12)) {
    const item = items.find((node) => normalize(node.textContent).includes(record.search));
    if (!item) continue;
    const leaves = [...item.querySelectorAll('span,div,p')].filter(
      (node) => node.children.length === 0,
    );
    const name = leaves.find((node) => normalize(node.textContent).includes(record.search));
    const amount = leaves.find((node) => {
      if (!/[€£$]/.test(node.textContent)) return false;
      try {
        return parseMinor(node.textContent) === record.minor;
      } catch {
        return false;
      }
    });
    if (!name || !amount) continue;
    const style = getComputedStyle(name);
    const size = Math.min(16, Math.max(12, parseFloat(style.fontSize) || 14));
    host.style.setProperty('--ws-name-size', `${size}px`);
    host.style.setProperty('--ws-name-weight', style.fontWeight);
    return true;
  }
  return false;
}
