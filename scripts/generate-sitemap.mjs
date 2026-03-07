import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import { collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query } from 'firebase/firestore/lite';
import { buildAppPath, buildPublicEntityPath } from '../src/utils/publicRoutes.js';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const ENV_PATH = resolve(PROJECT_ROOT, '.env');
const OUTPUT_PATH = resolve(PROJECT_ROOT, 'sitemap.xml');

function readEnvFile(filepath) {
  if (!existsSync(filepath)) return {};
  return readFileSync(filepath, 'utf8')
    .split('\n')
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return acc;
      const separator = trimmed.indexOf('=');
      if (separator === -1) return acc;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      acc[key] = value;
      return acc;
    }, {});
}

function trimSlash(value = '') {
  return String(value || '').replace(/\/+$/, '');
}

function xmlEscape(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function toIsoDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);
}

function renderSitemap(baseUrl, entries) {
  const rows = entries.map((entry) => `  <url>
    <loc>${xmlEscape(`${baseUrl}${entry.path}`)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.join('\n')}
</urlset>
`;
}

async function loadDynamicEntries(env) {
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };

  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error('Missing Firebase configuration for sitemap generation.');
  }

  const defaultLguId = env.VITE_LGU_ID || 'sb-argao';
  const app = initializeApp(firebaseConfig, 'sitemap-generator');
  const db = getFirestore(app);
  const setupSnapshot = await getDoc(doc(db, 'setup', 'bootstrapped'));
  const platformSettings = setupSnapshot.exists() ? setupSnapshot.data()?.platformSettings || {} : {};
  const baseUrl = trimSlash(platformSettings?.seoCanonicalBaseUrl || env.VITE_SEO_CANONICAL_BASE_URL || 'https://multi-legislative.web.app');

  const [documentsSnapshot, membersSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'lgus', defaultLguId, 'legislations'), orderBy('timestamp', 'desc'), limit(200))),
    getDocs(query(collection(db, 'lgus', defaultLguId, 'members'), orderBy('name'), limit(200))),
  ]);

  const documentEntries = documentsSnapshot.docs.map((snapshot) => {
    const data = snapshot.data();
    return {
      path: buildPublicEntityPath('doc', {
        id: snapshot.id,
        title: data.title || data.docId || 'document',
      }),
      lastmod: toIsoDate(data.updatedAt || data.timestamp),
      changefreq: 'weekly',
      priority: '0.8',
    };
  });

  const memberEntries = membersSnapshot.docs
    .filter((snapshot) => !snapshot.data()?.isArchived)
    .map((snapshot) => {
      const data = snapshot.data();
      return {
        path: buildPublicEntityPath('member', {
          id: snapshot.id,
          name: data.name || 'member',
        }),
        lastmod: toIsoDate(data.updatedAt || data.timestamp),
        changefreq: 'weekly',
        priority: '0.7',
      };
    });

  return {
    baseUrl,
    entries: [
      { path: buildAppPath('public'), lastmod: toIsoDate(), changefreq: 'daily', priority: '1.0' },
      { path: buildAppPath('insights'), lastmod: toIsoDate(), changefreq: 'daily', priority: '0.7' },
      { path: buildAppPath('contact'), lastmod: toIsoDate(), changefreq: 'monthly', priority: '0.6' },
      ...documentEntries,
      ...memberEntries,
    ],
  };
}

async function main() {
  const env = {
    ...readEnvFile(ENV_PATH),
    ...process.env,
  };

  const fallbackBaseUrl = trimSlash(env.VITE_SEO_CANONICAL_BASE_URL || 'https://multi-legislative.web.app');
  const fallbackEntries = [
    { path: buildAppPath('public'), lastmod: toIsoDate(), changefreq: 'daily', priority: '1.0' },
    { path: buildAppPath('insights'), lastmod: toIsoDate(), changefreq: 'daily', priority: '0.7' },
    { path: buildAppPath('contact'), lastmod: toIsoDate(), changefreq: 'monthly', priority: '0.6' },
  ];

  try {
    const { baseUrl, entries } = await loadDynamicEntries(env);
    writeFileSync(OUTPUT_PATH, renderSitemap(baseUrl, entries), 'utf8');
    console.log(`[generate-sitemap] Wrote ${entries.length} URL(s) to sitemap.xml`);
  } catch (error) {
    console.warn(`[generate-sitemap] Falling back to static sitemap: ${error.message}`);
    writeFileSync(OUTPUT_PATH, renderSitemap(fallbackBaseUrl, fallbackEntries), 'utf8');
  }
}

await main();
