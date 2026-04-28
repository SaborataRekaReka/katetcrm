import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const navConfigPath = path.resolve(rootDir, 'src/app/components/shell/navConfig.ts');
const routeSyncPath = path.resolve(rootDir, 'src/app/components/shell/routeSync.ts');
const componentsDir = path.resolve(rootDir, 'src/app/components');

const DETAIL_SHELL_REQUIRED_FILES = [
  'src/app/components/detail/LeadDetailModal.tsx',
  'src/app/components/detail/TaskDetailView.tsx',
  'src/app/components/client/ClientWorkspace.tsx',
  'src/app/components/reservation/ReservationWorkspace.tsx',
  'src/app/components/departure/DepartureWorkspace.tsx',
  'src/app/components/completion/CompletionWorkspace.tsx',
];

const FORM_SHELL_REQUIRED_FILES = [
  'src/app/components/leads/NewLeadDialog.tsx',
  'src/app/components/leads/EditLeadDialog.tsx',
  'src/app/components/client/NewClientDialog.tsx',
  'src/app/components/client/EditClientDialog.tsx',
  'src/app/components/application/PositionDialog.tsx',
  'src/app/components/catalogs/CatalogDialogs.tsx',
];

function listFilesRecursively(dirPath) {
  const out = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursively(fullPath));
    } else {
      out.push(fullPath);
    }
  }
  return out;
}

function normalizedRelative(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function addFailuresForShellPolicy(failures) {
  const ensureContains = (relativePath, requiredToken, label) => {
    const absolutePath = path.resolve(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      failures.push(`${label} file is missing: "${relativePath}"`);
      return;
    }
    const source = fs.readFileSync(absolutePath, 'utf8');
    if (!source.includes(requiredToken)) {
      failures.push(`${label} file must include ${requiredToken}: "${relativePath}"`);
    }
  };

  for (const relativePath of DETAIL_SHELL_REQUIRED_FILES) {
    ensureContains(relativePath, '<DetailShell', 'Detail shell');
  }

  for (const relativePath of FORM_SHELL_REQUIRED_FILES) {
    ensureContains(relativePath, '<ShellDialog', 'Form shell');
  }

  const workspaceApiFiles = listFilesRecursively(componentsDir).filter(
    (filePath) => filePath.endsWith('WorkspaceApi.tsx'),
  );

  for (const filePath of workspaceApiFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    if (!source.includes('<DetailShell')) {
      failures.push(
        `Workspace API file must render DetailShell: "${normalizedRelative(filePath)}"`,
      );
    }
  }

  return {
    detailFilesChecked: DETAIL_SHELL_REQUIRED_FILES.length,
    formFilesChecked: FORM_SHELL_REQUIRED_FILES.length,
    workspaceApiFilesChecked: workspaceApiFiles.length,
  };
}

function extractObjectKeys(source, constName) {
  const match = source.match(new RegExp(`const\\s+${constName}[^=]*=\\s*{([\\s\\S]*?)};`));
  if (!match) {
    throw new Error(`Cannot find object ${constName}`);
  }
  return Array.from(
    match[1].matchAll(/^\s{2}(?:'([^']+)'|([A-Za-z0-9_-]+))\s*:/gm),
    (m) => m[1] ?? m[2],
  );
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    else seen.add(value);
  }
  return Array.from(duplicates).sort();
}

function addFailuresForEmptyMeta(metaEntries, failures) {
  for (const [id, meta] of metaEntries) {
    if (!meta || typeof meta !== 'object') {
      failures.push(`MODULE_META entry "${id}" is not an object`);
      continue;
    }

    if (!meta.title || !String(meta.title).trim()) {
      failures.push(`MODULE_META entry "${id}" has empty title`);
    }

    if (!meta.searchPlaceholder || !String(meta.searchPlaceholder).trim()) {
      failures.push(`MODULE_META entry "${id}" has empty searchPlaceholder`);
    }

    if (meta.ctaLabel !== undefined && !String(meta.ctaLabel).trim()) {
      failures.push(`MODULE_META entry "${id}" has empty ctaLabel`);
    }

    if (meta.tabs) {
      const tabIds = meta.tabs.map((tab) => tab.id);
      const duplicatedTabIds = findDuplicates(tabIds);
      for (const duplicatedTabId of duplicatedTabIds) {
        failures.push(`MODULE_META entry "${id}" has duplicate tab id "${duplicatedTabId}"`);
      }
      for (const tab of meta.tabs) {
        if (!tab.id || !String(tab.id).trim()) {
          failures.push(`MODULE_META entry "${id}" has tab with empty id`);
        }
        if (!tab.label || !String(tab.label).trim()) {
          failures.push(`MODULE_META entry "${id}" has tab with empty label`);
        }
      }
    }
  }
}

async function loadShellConfigRuntime() {
  const entrySource = [
    `import { PRIMARY_DOMAINS, MODULE_META } from ${JSON.stringify(navConfigPath)};`,
    `import { ROUTED_SECONDARY_IDS, pathnameForSecondary } from ${JSON.stringify(routeSyncPath)};`,
    'export { PRIMARY_DOMAINS, MODULE_META, ROUTED_SECONDARY_IDS, pathnameForSecondary };',
  ].join('\n');

  const buildResult = await build({
    stdin: {
      contents: entrySource,
      resolveDir: rootDir,
      sourcefile: 'check-ui-consistency.entry.ts',
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    logLevel: 'silent',
    target: ['node18'],
  });

  const tempPath = path.resolve(__dirname, '.check-ui-consistency.bundle.mjs');
  fs.writeFileSync(tempPath, buildResult.outputFiles[0].text, 'utf8');

  try {
    return await import(pathToFileURL(tempPath).href + `?t=${Date.now()}`);
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // best effort cleanup
    }
  }
}

async function main() {
  const routeSyncSource = fs.readFileSync(routeSyncPath, 'utf8');
  const pathMapIds = extractObjectKeys(routeSyncSource, 'PATHNAME_BY_ID');

  const {
    PRIMARY_DOMAINS,
    MODULE_META,
    ROUTED_SECONDARY_IDS,
    pathnameForSecondary,
  } = await loadShellConfigRuntime();

  const navIds = [];
  const navEntryIds = [];
  const navDomainById = new Map();

  for (const domain of PRIMARY_DOMAINS) {
    navIds.push(domain.defaultSecondary);
    navDomainById.set(domain.defaultSecondary, domain.id);

    for (const group of domain.groups) {
      for (const item of group.items) {
        navIds.push(item.id);
        navEntryIds.push(item.id);
        navDomainById.set(item.id, domain.id);
      }
    }

    for (const view of domain.savedViews ?? []) {
      navIds.push(view.id);
      navEntryIds.push(view.id);
      navDomainById.set(view.id, domain.id);
    }
  }

  const routedIds = Array.from(ROUTED_SECONDARY_IDS);
  const moduleMetaIds = Object.keys(MODULE_META);

  const navIdSet = new Set(navIds);
  const routedIdSet = new Set(routedIds);
  const pathMapIdSet = new Set(pathMapIds);
  const moduleMetaIdSet = new Set(moduleMetaIds);

  const failures = [];

  const duplicateNavIds = findDuplicates(navEntryIds);
  const duplicateRoutedIds = findDuplicates(routedIds);
  const duplicatePathMapIds = findDuplicates(pathMapIds);

  for (const id of duplicateNavIds) {
    failures.push(`Duplicate secondary id in PRIMARY_DOMAINS: "${id}"`);
  }
  for (const id of duplicateRoutedIds) {
    failures.push(`Duplicate secondary id in ROUTED_SECONDARY_IDS: "${id}"`);
  }
  for (const id of duplicatePathMapIds) {
    failures.push(`Duplicate secondary id in PATHNAME_BY_ID: "${id}"`);
  }

  for (const id of navIdSet) {
    if (!moduleMetaIdSet.has(id)) {
      failures.push(`Missing MODULE_META entry for nav id "${id}"`);
    }
  }

  for (const id of routedIds) {
    if (!moduleMetaIdSet.has(id)) {
      failures.push(`Missing MODULE_META entry for routed id "${id}"`);
    }
    if (!pathMapIdSet.has(id)) {
      failures.push(`Missing PATHNAME_BY_ID entry for routed id "${id}"`);
    }

    const pathname = pathnameForSecondary(id);
    if (!pathname || typeof pathname !== 'string') {
      failures.push(`pathnameForSecondary returned empty value for routed id "${id}"`);
    } else if (!pathname.startsWith('/')) {
      failures.push(`Path for routed id "${id}" must start with '/': got "${pathname}"`);
    }
  }

  for (const id of pathMapIds) {
    if (!routedIdSet.has(id)) {
      failures.push(`PATHNAME_BY_ID has id not present in ROUTED_SECONDARY_IDS: "${id}"`);
    }
  }

  const pathToIds = new Map();
  for (const id of routedIds) {
    const pathname = pathnameForSecondary(id);
    if (!pathname) continue;
    const existing = pathToIds.get(pathname) ?? [];
    existing.push(id);
    pathToIds.set(pathname, existing);
  }
  for (const [pathname, ids] of pathToIds.entries()) {
    if (ids.length > 1) {
      failures.push(`Multiple routed ids map to the same path "${pathname}": ${ids.join(', ')}`);
    }
  }

  for (const [id, meta] of Object.entries(MODULE_META)) {
    if (navDomainById.has(id)) {
      const expectedDomain = navDomainById.get(id);
      if (meta.domain !== expectedDomain) {
        failures.push(
          `Domain mismatch for "${id}": nav expects "${expectedDomain}", MODULE_META has "${meta.domain}"`,
        );
      }
    }
  }

  addFailuresForEmptyMeta(Object.entries(MODULE_META), failures);
  const shellPolicyStats = addFailuresForShellPolicy(failures);

  if (failures.length > 0) {
    console.error('UI consistency check failed.');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('UI consistency check passed.');
  console.log(`- nav ids: ${navIdSet.size}`);
  console.log(`- routed ids: ${routedIdSet.size}`);
  console.log(`- module meta entries: ${moduleMetaIds.length}`);
  console.log(`- detail shell files checked: ${shellPolicyStats.detailFilesChecked}`);
  console.log(`- form shell files checked: ${shellPolicyStats.formFilesChecked}`);
  console.log(`- workspace api files checked: ${shellPolicyStats.workspaceApiFilesChecked}`);
}

main().catch((error) => {
  console.error('UI consistency check crashed.');
  console.error(error?.stack ?? String(error));
  process.exit(1);
});
