import { readFile } from 'node:fs/promises';

// An explicit allowlist: never recurse over the private working directory.
export const SOURCE_FILES = Object.freeze([
  '.gitignore',
  '.prettierrc.json',
  '.prettierignore',
  'README.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'COMMERCIAL.md',
  'NOTICE',
  'project-site.json',
  '.github/workflows/ci.yml',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  'docs/.nojekyll',
  ...['index.html', 'privacy.html', 'support.html', 'legal.html'].map((name) => `docs/${name}`),
  ...['site.css', 'icon.png', 'search.png', 'filters.png', 'statistics.png'].map(
    (name) => `docs/assets/${name}`,
  ),
  'playwright.config.mjs',
  ...[
    'build-wallet-search.mjs',
    'wallet-artifacts.mjs',
    'wallet-artifacts.test.mjs',
    'wallet-source.mjs',
    'package-wallet-source.mjs',
    'build-project-site.mjs',
    'verify-project-site.mjs',
  ].map((name) => `scripts/${name}`),
  'wallet-search/README.md',
  ...[
    'accordion',
    'bridge',
    'bridge-client',
    'browser',
    'cache-client',
    'cache-store',
    'charts',
    'core',
    'data',
    'i18n',
    'layout',
    'native',
    'policy',
    'transport',
    'bridge.test',
    'bridge-client.test',
    'core.test',
    'data.test',
    'transport.test',
  ].map((name) => `wallet-search/${name}.mjs`),
  ...[
    'accordion.spec',
    'autorefresh.spec',
    'cache.spec',
    'extension.spec',
    'fixture',
    'helpers',
    'search.spec',
    'security.spec',
    'transport.spec',
    'userscript.spec',
  ].map((name) => `wallet-search/e2e/${name}.mjs`),
  ...[
    'manifest.json',
    'export-relay.js',
    'export-worker.js',
    'popup.html',
    'popup.css',
    'popup.js',
    'help.html',
    'help.css',
    'help.js',
    'INSTALL.de.md',
    'INSTALL.ru.md',
  ].map((name) => `wallet-search/extension/${name}`),
  ...['ARCHITECTURE.md', 'CODE-AUDIT.md', 'PRIVACY.md', 'PUBLISH.de.md', 'CHANGELOG.md'].map(
    (name) => `wallet-search/docs/${name}`,
  ),
]);

export async function sourceFiles(root) {
  const files = new Map();
  for (const path of SOURCE_FILES) files.set(path, await readFile(new URL(path, root)));
  const manifest = JSON.parse(files.get('wallet-search/extension/manifest.json'));
  const workspacePackage = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const workspaceLock = JSON.parse(await readFile(new URL('package-lock.json', root), 'utf8'));
  const names = ['@playwright/test', 'prettier'];
  const devDependencies = Object.fromEntries(
    names.map((name) => [name, workspacePackage.devDependencies[name]]),
  );
  if (
    Object.values(devDependencies).some(
      (version) => typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version),
    )
  )
    throw new Error('Source tools must use pinned versions');
  const scripts = Object.fromEntries(
    Object.entries(workspacePackage.scripts).filter(([name]) => name.includes('wallet')),
  );
  const pkg = {
    name: 'wallet-search-for-etoro',
    version: manifest.version,
    private: true,
    type: 'module',
    description: manifest.description,
    license: 'PolyForm-Noncommercial-1.0.0',
    engines: { node: '>=22' },
    scripts,
    devDependencies,
  };
  const packages = {
    '': { name: pkg.name, version: pkg.version, devDependencies, engines: pkg.engines },
  };
  // This toolchain uses root-resolved dependencies. Fail if a future tool adds
  // nested dependencies rather than silently producing a partial lockfile.
  const pending = [...names];
  while (pending.length) {
    const name = pending.shift(),
      path = `node_modules/${name}`;
    if (packages[path]) continue;
    const entry = workspaceLock.packages[path];
    if (!entry) throw new Error(`Missing source dependency: ${name}`);
    if (Object.keys(workspaceLock.packages).some((key) => key.startsWith(path + '/node_modules/')))
      throw new Error(`Nested source dependency needs explicit support: ${name}`);
    packages[path] = entry;
    pending.push(
      ...Object.keys(entry.dependencies || {}),
      ...Object.keys(entry.optionalDependencies || {}),
    );
  }
  files.set('package.json', Buffer.from(JSON.stringify(pkg, null, 2) + '\n'));
  files.set(
    'package-lock.json',
    Buffer.from(
      JSON.stringify(
        { name: pkg.name, version: pkg.version, lockfileVersion: 3, requires: true, packages },
        null,
        2,
      ) + '\n',
    ),
  );
  // An owner-selected license is included if it exists. None is invented.
  try {
    files.set('LICENSE', await readFile(new URL('LICENSE', root)));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return { files, version: manifest.version };
}
