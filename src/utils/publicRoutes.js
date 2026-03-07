import { slugifyFilePart } from './helpers.js';

const VIEW_PATHS = {
  public: '/',
  insights: '/insights',
  contact: '/contact',
  login: '/login',
  'barangay-login': '/barangay',
  admin: '/admin',
  platform: '/platform',
};

function trimTrailingSlash(path = '') {
  if (!path || path === '/') return '/';
  return path.replace(/\/+$/, '');
}

function normalizePath(path = '/') {
  const trimmed = trimTrailingSlash(path);
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function buildAppPath(view = 'public') {
  return VIEW_PATHS[view] || VIEW_PATHS.public;
}

export function buildEntitySlug(label = '', id = '') {
  const slug = slugifyFilePart(label) || 'record';
  return id ? `${slug}--${id}` : slug;
}

export function extractEntityIdFromSlug(slug = '') {
  const cleanSlug = String(slug || '').split('/').filter(Boolean).at(-1) || '';
  const markerIndex = cleanSlug.lastIndexOf('--');
  if (markerIndex === -1) return cleanSlug;
  return cleanSlug.slice(markerIndex + 2);
}

export function buildPublicEntityPath(type, entityOrId, label = '') {
  const entity = typeof entityOrId === 'object' && entityOrId !== null
    ? entityOrId
    : {
        id: entityOrId,
        title: label,
        name: label,
      };

  const entityId = entity?.id || '';
  const entityLabel = entity?.title || entity?.name || entity?.docId || label || entityId;
  const segment = type === 'member' ? 'members' : 'documents';
  return normalizePath(`/${segment}/${buildEntitySlug(entityLabel, entityId)}`);
}

export function buildPublicEntityUrl(type, entityOrId, label = '') {
  const path = buildPublicEntityPath(type, entityOrId, label);
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}${window.location.hash || ''}`;
}

export function parsePublicEntityLocation(pathname = '/') {
  const parts = String(pathname || '/').split('/').filter(Boolean);
  if (parts[0] === 'documents' && parts[1]) {
    return { type: 'doc', id: extractEntityIdFromSlug(parts[1]) };
  }
  if (parts[0] === 'members' && parts[1]) {
    return { type: 'member', id: extractEntityIdFromSlug(parts[1]) };
  }
  return { type: null, id: '' };
}

export function resolveAppLocation(pathname = '/') {
  const normalized = normalizePath(pathname);
  const entityRoute = parsePublicEntityLocation(normalized);

  if (entityRoute.type) {
    return {
      view: 'public',
      entityType: entityRoute.type,
      entityId: entityRoute.id,
    };
  }

  const matchedView = Object.entries(VIEW_PATHS).find(([, path]) => path === normalized)?.[0] || 'public';
  return {
    view: matchedView,
    entityType: null,
    entityId: '',
  };
}
