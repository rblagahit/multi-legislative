import { useEffect, useMemo } from 'react';

const MANAGED_HEAD_CONFIG = {
  default: {
    allowedTags: new Set(['META', 'LINK']),
    allowedScriptHosts: new Set(),
  },
  global: {
    allowedTags: new Set(['META', 'LINK']),
    allowedScriptHosts: new Set(),
  },
  adsense: {
    allowedTags: new Set(['META', 'LINK', 'SCRIPT']),
    allowedScriptHosts: new Set([
      'pagead2.googlesyndication.com',
      'partner.googleadservices.com',
      'www.googletagservices.com',
    ]),
  },
};

function isSafeHeadUrl(value, allowedHosts = null) {
  const raw = String(value || '').trim();
  if (!raw) return false;

  try {
    const url = new URL(raw, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (allowedHosts && allowedHosts.size && !allowedHosts.has(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function ensureMeta(selectorType, selectorValue) {
  const selector = `meta[${selectorType}="${selectorValue}"]`;
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(selectorType, selectorValue);
    document.head.appendChild(element);
  }
  return element;
}

function ensureLink(rel) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  return element;
}

function applyManagedHeadHtml(rawHtml = '', scope = 'default') {
  const config = MANAGED_HEAD_CONFIG[scope] || MANAGED_HEAD_CONFIG.default;
  const selector = `[data-managed-head-html="${scope}"]`;
  const existingManagedNodes = document.head.querySelectorAll(selector);
  existingManagedNodes.forEach((node) => node.remove());

  const html = String(rawHtml || '').trim();
  if (!html) return;

  const template = document.createElement('template');
  template.innerHTML = html;

  Array.from(template.content.children).forEach((sourceNode) => {
    if (!config.allowedTags.has(sourceNode.tagName)) return;
    if (sourceNode.tagName === 'SCRIPT' && sourceNode.textContent?.trim()) return;

    const nextNode = document.createElement(sourceNode.tagName.toLowerCase());
    let skipNode = false;

    Array.from(sourceNode.attributes).forEach((attribute) => {
      if (/^on/i.test(attribute.name)) return;

      if ((attribute.name === 'src' || attribute.name === 'href')
        && !isSafeHeadUrl(
          attribute.value,
          sourceNode.tagName === 'SCRIPT' ? config.allowedScriptHosts : null,
        )) {
        skipNode = true;
        return;
      }

      nextNode.setAttribute(attribute.name, attribute.value);
    });

    if (skipNode) return;

    nextNode.setAttribute('data-managed-head-html', scope);
    document.head.appendChild(nextNode);
  });
}

function shouldInjectAdsenseHtml(view, platformSettings, session = {}) {
  if (!platformSettings?.adsEnabled) return false;
  if (!String(platformSettings?.adsenseHeadHtml || '').trim()) return false;
  if (platformSettings?.adsDisableForAuthenticated && (session?.isAuthenticated || session?.user)) return false;

  const excludedByView = {
    public: Boolean(platformSettings?.adsExcludePublic),
    insights: Boolean(platformSettings?.adsExcludeInsights),
    contact: Boolean(platformSettings?.adsExcludeContact),
    login: Boolean(platformSettings?.adsExcludeLogin),
    'barangay-login': Boolean(platformSettings?.adsExcludeLogin),
    admin: Boolean(platformSettings?.adsExcludeAdmin),
    platform: Boolean(platformSettings?.adsExcludePlatform),
  };

  return !excludedByView[view];
}

function trimSlash(value = '') {
  return value.replace(/\/+$/, '');
}

function buildSeoState(view, settings, platformSettings, entitySeo = null) {
  const orgName = settings?.orgName || 'LGU Legislative Information System';
  const cityProvince = [settings?.municipality, settings?.province].filter(Boolean).join(', ');
  const siteName = platformSettings?.seoSiteName || platformSettings?.navTitle || orgName;
  const favicon = platformSettings?.logoUrl || settings?.sealUrl || '/argao-seal.png';
  const baseDescription = platformSettings?.seoDefaultDescription
    || `Browse legislative documents, ordinances, and resolutions published by ${orgName}${cityProvince ? ` in ${cityProvince}` : ''}.`;
  const keywords = platformSettings?.seoDefaultKeywords
    || 'LGU, ordinances, resolutions, legislative documents, government transparency, Philippines';
  const canonicalBase = trimSlash(platformSettings?.seoCanonicalBaseUrl || 'https://multi-legislative.web.app');
  const ogImage = platformSettings?.seoOgImage || favicon;

  const pageConfig = {
    public: {
      title: `${siteName} | Legislative Portal`,
      description: baseDescription,
      robots: 'index, follow',
      canonicalPath: '/',
    },
    insights: {
      title: `Insights | ${siteName}`,
      description: `Public legislative analytics and document performance for ${orgName}.`,
      robots: 'index, follow',
      canonicalPath: '/insights',
    },
    contact: {
      title: `Contact | ${siteName}`,
      description: `Contact ${orgName}${cityProvince ? ` in ${cityProvince}` : ''} for legislative document inquiries and official communications.`,
      robots: 'index, follow',
      canonicalPath: '/contact',
    },
    login: {
      title: `Admin Portal | ${siteName}`,
      description: `Administrative sign-in for ${orgName}.`,
      robots: 'noindex, nofollow',
      canonicalPath: '/login',
    },
    'barangay-login': {
      title: `Barangay Portal | ${siteName}`,
      description: `Barangay portal access for ${orgName}.`,
      robots: 'noindex, nofollow',
      canonicalPath: '/barangay',
    },
    admin: {
      title: `Admin Dashboard | ${siteName}`,
      description: `Administrative dashboard for ${orgName}.`,
      robots: 'noindex, nofollow',
      canonicalPath: '/admin',
    },
    platform: {
      title: `Platform Dashboard | ${siteName}`,
      description: `Platform administration workspace for ${siteName}.`,
      robots: 'noindex, nofollow',
      canonicalPath: '/platform',
    },
  };

  const current = pageConfig[view] || pageConfig.public;
  const title = entitySeo?.title || current.title;
  const description = entitySeo?.description || current.description;
  const canonicalPath = entitySeo?.canonicalPath || current.canonicalPath;
  const ogType = entitySeo?.ogType || 'website';
  const ogTitle = entitySeo?.ogTitle || title;
  const ogDescription = entitySeo?.ogDescription || description;
  const entityImage = entitySeo?.image || ogImage;

  return {
    title,
    description,
    keywords,
    robots: current.robots,
    canonical: `${canonicalBase}${canonicalPath}`,
    ogTitle,
    ogDescription,
    ogImage: entityImage,
    ogType,
    twitterTitle: entitySeo?.twitterTitle || ogTitle,
    twitterDescription: entitySeo?.twitterDescription || ogDescription,
    twitterImage: entitySeo?.twitterImage || entityImage,
    favicon,
    author: siteName,
  };
}

export function useSeo(view, settings, platformSettings, entitySeo = null, session = {}) {
  const seo = useMemo(
    () => buildSeoState(view, settings, platformSettings, entitySeo),
    [entitySeo, platformSettings, settings, view],
  );
  const shouldInjectAdsense = shouldInjectAdsenseHtml(view, platformSettings, session);

  useEffect(() => {
    document.title = seo.title;

    ensureMeta('name', 'description').setAttribute('content', seo.description);
    ensureMeta('name', 'keywords').setAttribute('content', seo.keywords);
    ensureMeta('name', 'author').setAttribute('content', seo.author);
    ensureMeta('name', 'robots').setAttribute('content', seo.robots);
    ensureMeta('property', 'og:title').setAttribute('content', seo.ogTitle);
    ensureMeta('property', 'og:description').setAttribute('content', seo.ogDescription);
    ensureMeta('property', 'og:image').setAttribute('content', seo.ogImage);
    ensureMeta('property', 'og:type').setAttribute('content', seo.ogType);
    ensureMeta('property', 'og:locale').setAttribute('content', 'en_PH');
    ensureMeta('name', 'twitter:card').setAttribute('content', 'summary_large_image');
    ensureMeta('name', 'twitter:title').setAttribute('content', seo.twitterTitle);
    ensureMeta('name', 'twitter:description').setAttribute('content', seo.twitterDescription);
    ensureMeta('name', 'twitter:image').setAttribute('content', seo.twitterImage);

    const canonical = ensureLink('canonical');
    canonical.setAttribute('href', seo.canonical);

    const favicon = ensureLink('icon');
    favicon.setAttribute('href', seo.favicon);

    applyManagedHeadHtml(platformSettings?.globalHeadHtml, 'global');
    applyManagedHeadHtml(
      shouldInjectAdsense
        ? platformSettings?.adsenseHeadHtml
        : '',
      'adsense',
    );
  }, [
    platformSettings?.adsDisableForAuthenticated,
    platformSettings?.adsEnabled,
    platformSettings?.adsExcludeAdmin,
    platformSettings?.adsExcludeContact,
    platformSettings?.adsExcludeInsights,
    platformSettings?.adsExcludeLogin,
    platformSettings?.adsExcludePlatform,
    platformSettings?.adsExcludePublic,
    platformSettings?.adsenseHeadHtml,
    platformSettings?.globalHeadHtml,
    seo,
    session?.isAuthenticated,
    session?.user,
    shouldInjectAdsense,
  ]);
}
