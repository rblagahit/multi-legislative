import { useEffect, useMemo } from 'react';

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

function applyManagedHeadHtml(rawHtml = '') {
  const existingManagedNodes = document.head.querySelectorAll('[data-managed-head-html="true"]');
  existingManagedNodes.forEach((node) => node.remove());

  const html = String(rawHtml || '').trim();
  if (!html) return;

  const template = document.createElement('template');
  template.innerHTML = html;
  const allowedTags = new Set(['META', 'SCRIPT', 'LINK']);

  Array.from(template.content.children).forEach((sourceNode) => {
    if (!allowedTags.has(sourceNode.tagName)) return;

    const nextNode = document.createElement(sourceNode.tagName.toLowerCase());
    Array.from(sourceNode.attributes).forEach((attribute) => {
      if (/^on/i.test(attribute.name)) return;
      nextNode.setAttribute(attribute.name, attribute.value);
    });

    if (sourceNode.tagName === 'SCRIPT' && sourceNode.textContent) {
      nextNode.textContent = sourceNode.textContent;
    }

    nextNode.setAttribute('data-managed-head-html', 'true');
    document.head.appendChild(nextNode);
  });
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

export function useSeo(view, settings, platformSettings, entitySeo = null) {
  const seo = useMemo(
    () => buildSeoState(view, settings, platformSettings, entitySeo),
    [entitySeo, platformSettings, settings, view],
  );

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

    applyManagedHeadHtml(platformSettings?.globalHeadHtml);
  }, [platformSettings?.globalHeadHtml, seo]);
}
