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

function trimSlash(value = '') {
  return value.replace(/\/+$/, '');
}

function buildSeoState(view, settings, platformSettings) {
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
    },
    insights: {
      title: `Insights | ${siteName}`,
      description: `Public legislative analytics and document performance for ${orgName}.`,
      robots: 'index, follow',
    },
    contact: {
      title: `Contact | ${siteName}`,
      description: `Contact ${orgName}${cityProvince ? ` in ${cityProvince}` : ''} for legislative document inquiries and official communications.`,
      robots: 'index, follow',
    },
    login: {
      title: `Admin Portal | ${siteName}`,
      description: `Administrative sign-in for ${orgName}.`,
      robots: 'noindex, nofollow',
    },
    'barangay-login': {
      title: `Barangay Portal | ${siteName}`,
      description: `Barangay portal access for ${orgName}.`,
      robots: 'noindex, nofollow',
    },
    admin: {
      title: `Admin Dashboard | ${siteName}`,
      description: `Administrative dashboard for ${orgName}.`,
      robots: 'noindex, nofollow',
    },
    platform: {
      title: `Platform Dashboard | ${siteName}`,
      description: `Platform administration workspace for ${siteName}.`,
      robots: 'noindex, nofollow',
    },
  };

  const current = pageConfig[view] || pageConfig.public;

  return {
    title: current.title,
    description: current.description,
    keywords,
    robots: current.robots,
    canonical: `${canonicalBase}/`,
    ogTitle: current.title,
    ogDescription: current.description,
    ogImage,
    twitterTitle: current.title,
    twitterDescription: current.description,
    twitterImage: ogImage,
    favicon,
    author: siteName,
  };
}

export function useSeo(view, settings, platformSettings) {
  const seo = useMemo(
    () => buildSeoState(view, settings, platformSettings),
    [platformSettings, settings, view],
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
    ensureMeta('property', 'og:type').setAttribute('content', 'website');
    ensureMeta('property', 'og:locale').setAttribute('content', 'en_PH');
    ensureMeta('name', 'twitter:card').setAttribute('content', 'summary_large_image');
    ensureMeta('name', 'twitter:title').setAttribute('content', seo.twitterTitle);
    ensureMeta('name', 'twitter:description').setAttribute('content', seo.twitterDescription);
    ensureMeta('name', 'twitter:image').setAttribute('content', seo.twitterImage);

    const canonical = ensureLink('canonical');
    canonical.setAttribute('href', seo.canonical);

    const favicon = ensureLink('icon');
    favicon.setAttribute('href', seo.favicon);
  }, [seo]);
}
