import { lazy, Suspense, useEffect, useState, useMemo } from 'react';
import { normalizeText, normalizeTag } from '../../utils/helpers';
import { buildPublicShareUrl } from '../../utils/share';
import { useSeo } from '../../hooks/useSeo';
import { buildAppPath, buildPublicEntityPath, parsePublicEntityLocation } from '../../utils/publicRoutes';
import DocumentGrid         from './DocumentGrid';
import MembersSection       from './MembersSection';
import MemberProfileModal from '../modals/MemberProfileModal';

const DocumentDetailsModal = lazy(() => import('../modals/DocumentDetailsModal'));
const DocumentNoticeModal = lazy(() => import('../modals/DocumentNoticeModal'));
const DocumentRequestModal = lazy(() => import('../modals/DocumentRequestModal'));

/**
 * Public landing page — hero search, document grid, members section.
 * Manages the document modal flow: Details → Notice → (open PDF) / Request.
 * TODO (Phase 3): Port full hero HTML from index.html (~lines 132–267).
 */
export default function PublicView({
  documents,
  documentStats,
  hasMoreDocuments,
  loadingMoreDocuments,
  loadMoreDocuments,
  members,
  hasMoreMembers,
  loadingMoreMembers,
  loadMoreMembers,
  settings,
  platformSettings,
  tenantId,
  municipalities,
  barangays,
  defaultMunicipalityId,
  showToast,
  user,
  userRole,
}) {
  const [search, setSearch]   = useState('');
  const [typeFilter, setType] = useState('All');
  const [municipalityFilter, setMunicipalityFilter] = useState(defaultMunicipalityId || '');
  const [barangayFilter, setBarangayFilter] = useState('');

  const focusDocumentResults = () => {
    const target = document.getElementById('documents');
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ─── Modal state ────────────────────────────────────────────────────────────
  // modal: null | 'details' | 'notice' | 'request'
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeMember, setActiveMember] = useState(null);
  const [modal, setModal]         = useState(null);
  const [routeTarget, setRouteTarget] = useState(() => {
    const pathTarget = parsePublicEntityLocation(window.location.pathname);
    if (pathTarget.type) return pathTarget;

    const params = new URLSearchParams(window.location.search);
    return {
      type: params.get('member') ? 'member' : params.get('doc') ? 'doc' : null,
      id: params.get('member') || params.get('doc') || '',
    };
  });

  const openDetails = (doc) => {
    setActiveDoc(doc);
    setModal('details');
    setRouteTarget({ type: 'doc', id: doc.id });
  };
  const openMemberProfile = (member) => {
    setActiveMember(member);
    setModal('member');
    setRouteTarget({ type: 'member', id: member.id });
  };
  const openNotice  = ()    => setModal('notice');
  const openRequest = ()    => setModal('request');
  const closeModals = ()    => {
    setModal(null);
    setActiveDoc(null);
    setActiveMember(null);
    setRouteTarget({ type: null, id: '' });
  };

  const { orgName, municipality, province } = settings || {};
  const cityProvince = [municipality, province].filter(Boolean).join(', ') || 'Argao, Cebu';
  const publicPortalLabel = municipalityFilter
    ? municipalityById.get(municipalityFilter)?.label || cityProvince
    : 'All Municipalities · Public Legislative Search';
  const municipalityById = useMemo(
    () => new Map((municipalities || []).map((entry) => [entry.id, entry])),
    [municipalities],
  );
  const scopedBarangays = useMemo(() => (
    municipalityFilter
      ? (barangays || []).filter((entry) => entry.lguId === municipalityFilter)
      : barangays || []
  ), [barangays, municipalityFilter]);

  const enrichedDocuments = useMemo(() => documents.map((entry) => {
    const location = municipalityById.get(entry.lguId);
    return {
      ...entry,
      municipality: entry.municipality || location?.municipality || '',
      province: entry.province || location?.province || '',
      lguLabel: location?.label || entry.lguId || '',
      barangayLabel: entry.barangayName || entry._barangayName || entry.barangayId || '',
    };
  }), [documents, municipalityById]);

  const enrichedMembers = useMemo(() => members.map((entry) => {
    const location = municipalityById.get(entry.lguId);
    return {
      ...entry,
      municipality: entry.municipality || location?.municipality || '',
      province: entry.province || location?.province || '',
      lguLabel: location?.label || entry.lguId || '',
      barangayLabel: entry.barangayName || entry.barangayId || '',
    };
  }), [members, municipalityById]);

  const memberById = useMemo(
    () => new Map(enrichedMembers.map(member => [member.id, member])),
    [enrichedMembers],
  );

  useEffect(() => {
    if (!defaultMunicipalityId) return;
    setMunicipalityFilter((current) => current || defaultMunicipalityId);
  }, [defaultMunicipalityId]);

  useEffect(() => {
    if (!barangayFilter) return;
    const existsInScope = scopedBarangays.some((entry) => entry.id === barangayFilter);
    if (!existsInScope) {
      setBarangayFilter('');
    }
  }, [barangayFilter, scopedBarangays]);

  // ─── Derived stats ──────────────────────────────────────────────────────────
  const totalDocs      = documentStats?.totalDocs ?? enrichedDocuments.length;
  const ordinanceCount = documentStats?.ordinanceCount ?? enrichedDocuments.filter(d => d.type === 'Ordinance').length;
  const resCount       = documentStats?.resolutionCount ?? enrichedDocuments.filter(d => d.type === 'Resolution').length;
  const totalViews     = documentStats?.totalViews ?? enrichedDocuments.reduce((acc, d) => acc + (d.views || 0), 0);

  // ─── Filtered documents ─────────────────────────────────────────────────────
  const filteredDocuments = useMemo(() => {
    const q = normalizeText(search);
    return enrichedDocuments.filter((d) => {
      const matchType = typeFilter === 'All' || d.type === typeFilter;
      const matchMunicipality = !municipalityFilter || d.lguId === municipalityFilter;
      const matchBarangay = !barangayFilter || `${d.lguId}:${d.barangayId || ''}` === barangayFilter;
      const matchSearch = !q
        || normalizeText(d.title).includes(q)
        || normalizeText(d.docId).includes(q)
        || normalizeText(d.authorName).includes(q)
        || normalizeText(d.municipality).includes(q)
        || normalizeText(d.barangayLabel).includes(q)
        || (d.tags || []).some(t => normalizeTag(t).includes(q));
      return matchType && matchMunicipality && matchBarangay && matchSearch;
    });
  }, [barangayFilter, enrichedDocuments, municipalityFilter, search, typeFilter]);

  const filteredMembers = useMemo(() => enrichedMembers.filter((member) => {
    const matchMunicipality = !municipalityFilter || member.lguId === municipalityFilter;
    const matchBarangay = !barangayFilter || `${member.lguId}:${member.barangayId || ''}` === barangayFilter;
    return matchMunicipality && matchBarangay;
  }), [barangayFilter, enrichedMembers, municipalityFilter]);

  const modalFallback = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 text-white">
      <div className="flex items-center gap-3 rounded-2xl bg-slate-900/90 px-5 py-4 text-sm font-semibold">
        <i className="fas fa-spinner fa-spin" />
        <span>Loading dialog…</span>
      </div>
    </div>
  );

  useEffect(() => {
    const handlePopState = () => {
      const pathTarget = parsePublicEntityLocation(window.location.pathname);
      if (pathTarget.type) {
        setRouteTarget(pathTarget);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const nextRoute = {
        type: params.get('member') ? 'member' : params.get('doc') ? 'doc' : null,
        id: params.get('member') || params.get('doc') || '',
      };
      setRouteTarget(nextRoute);
      if (!nextRoute.type) {
        setModal(null);
        setActiveDoc(null);
        setActiveMember(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!routeTarget.type || !routeTarget.id) return;

    if (routeTarget.type === 'member') {
      const targetMember = enrichedMembers.find((member) => member.id === routeTarget.id);
      if (targetMember) {
        setActiveMember(targetMember);
        setModal('member');
      }
      return;
    }

    if (routeTarget.type === 'doc') {
      const targetDoc = enrichedDocuments.find((entry) => entry.id === routeTarget.id);
      if (targetDoc) {
        setActiveDoc(targetDoc);
        setModal('details');
      }
    }
  }, [enrichedDocuments, enrichedMembers, routeTarget]);

  useEffect(() => {
    if (modal === 'member' && activeMember) {
      window.history.replaceState(null, '', buildPublicShareUrl('member', activeMember));
      return;
    }
    if ((modal === 'details' || modal === 'notice' || modal === 'request') && activeDoc) {
      window.history.replaceState(null, '', buildPublicShareUrl('doc', activeDoc));
      return;
    }

    window.history.replaceState(null, '', `${window.location.origin}${buildAppPath('public')}${window.location.hash || ''}`);
  }, [activeDoc, activeMember, modal]);

  const entitySeo = useMemo(() => {
    if (modal === 'member' && activeMember) {
      const memberRole = activeMember.role || 'LGU Legislative Member';
      const memberLocation = [activeMember.municipality || municipality, activeMember.province || province].filter(Boolean).join(', ');
      return {
        title: `${activeMember.name} | ${memberRole}`,
        description: `View the public member profile for ${activeMember.name}, ${memberRole}${memberLocation ? ` in ${memberLocation}` : ''}. Browse committees, biography, and recent sponsored ordinances.`,
        canonicalPath: buildPublicEntityPath('member', activeMember),
        ogTitle: `${activeMember.name} | Member Profile`,
        ogDescription: `Public legislative profile for ${activeMember.name}${memberRole ? `, ${memberRole}` : ''}.`,
        image: activeMember.image || settings?.sealUrl || platformSettings?.logoUrl || '/argao-seal.png',
        ogType: 'profile',
      };
    }

    if ((modal === 'details' || modal === 'notice' || modal === 'request') && activeDoc) {
      const docDate = activeDoc.timestamp?.toDate
        ? activeDoc.timestamp.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';
      const tagText = (activeDoc.tags || []).slice(0, 4).join(', ');
      const docOwner = activeDoc.municipality || orgName || 'Legislative Portal';
      return {
        title: `${activeDoc.title || activeDoc.docId || 'Legislative Document'} | ${docOwner}`,
        description: `${activeDoc.type || 'Document'} ${activeDoc.docId ? `${activeDoc.docId} · ` : ''}${activeDoc.title || 'Legislative document'}${activeDoc.authorName ? ` by ${activeDoc.authorName}` : ''}${docDate ? ` on ${docDate}` : ''}${tagText ? ` · Topics: ${tagText}` : ''}.`,
        canonicalPath: buildPublicEntityPath('doc', activeDoc),
        ogTitle: `${activeDoc.title || 'Legislative Document'}${activeDoc.docId ? ` | ${activeDoc.docId}` : ''}`,
        ogDescription: `Public legislative record${activeDoc.authorName ? ` sponsored by ${activeDoc.authorName}` : ''}${docDate ? ` on ${docDate}` : ''}.`,
        image: activeDoc.authorImage || settings?.sealUrl || platformSettings?.logoUrl || '/argao-seal.png',
        ogType: 'article',
      };
    }

    return null;
  }, [activeDoc, activeMember, modal, municipality, orgName, platformSettings?.logoUrl, province, settings?.sealUrl]);

  useSeo('public', settings, platformSettings, entitySeo, { user, userRole });

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-white via-blue-50/40 to-amber-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-bold mb-8">
              <i className="fas fa-landmark text-xs" />
              {publicPortalLabel}
            </div>
            <h1 className="text-5xl lg:text-[3.6rem] font-black text-slate-900 leading-[1.08] mb-5">
              Find Legislative <span className="text-blue-600">Documents</span><br />in Seconds
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
              Browse the latest public ordinances, resolutions, and member profiles across municipalities, or drill into one LGU and barangay.
            </p>

            {/* Search bar */}
            <div className="hero-search mb-4 max-w-4xl mx-auto">
              <div className="flex-1 flex items-center gap-3 pl-6">
                <i className="fas fa-search text-slate-400 text-xl flex-shrink-0" />
                <input
                  type="text" value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by title, ID, sponsor, municipality, or tag…"
                  className="flex-1 py-5 bg-transparent outline-none font-medium text-slate-800 placeholder-slate-400 text-lg min-w-0"
                />
              </div>
              <select
                value={typeFilter} onChange={e => setType(e.target.value)}
                className="hidden sm:block shrink-0 bg-blue-50 border-l border-slate-100 px-6 py-5 text-sm font-bold text-blue-700 outline-none cursor-pointer"
              >
                <option value="All">📋 All Types</option>
                <option value="Ordinance">📜 Ordinances</option>
                <option value="Resolution">📄 Resolutions</option>
              </select>
              <button
                type="button"
                onClick={focusDocumentResults}
                className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-9 py-5 font-black text-sm tracking-wide transition-all flex items-center gap-2"
              >
                <i className="fas fa-search text-xs" /> Search
              </button>
            </div>
            <div className="mx-auto mb-10 grid max-w-4xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Municipality</span>
                <select
                  value={municipalityFilter}
                  onChange={(event) => setMunicipalityFilter(event.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="">All municipalities</option>
                  {(municipalities || []).map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.label}</option>
                  ))}
                </select>
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Barangay</span>
                <select
                  value={barangayFilter}
                  onChange={(event) => setBarangayFilter(event.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="">All barangays</option>
                  {scopedBarangays.map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.label}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-center rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 shadow-sm">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-blue-400">Discovery Scope</p>
                  <p className="mt-2">
                    {municipalityFilter
                      ? `Showing ${municipalityById.get(municipalityFilter)?.label || municipalityFilter}`
                      : 'Showing all municipalities'}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Docs',  value: totalDocs,      bg: 'bg-red-50 border-red-100' },
                { label: 'Ordinances',  value: ordinanceCount, bg: 'bg-amber-50 border-amber-100' },
                { label: 'Resolutions', value: resCount,       bg: 'bg-green-50 border-green-100' },
                { label: 'Total Views', value: totalViews,     bg: 'bg-blue-50 border-blue-100' },
              ].map(s => (
                <div key={s.label} className={`stat-pill ${s.bg} border rounded-2xl p-4`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                  <p className="text-2xl font-black text-slate-900">{s.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Document grid ─────────────────────────────────────────────────── */}
      <DocumentGrid
        documents={filteredDocuments}
        memberById={memberById}
        hasMore={hasMoreDocuments}
        loadingMore={loadingMoreDocuments}
        onLoadMore={loadMoreDocuments}
        onClear={() => {
          setSearch('');
          setType('All');
          setMunicipalityFilter(defaultMunicipalityId || '');
          setBarangayFilter('');
        }}
        onViewDetails={openDetails}
      />

      {/* ── Members section ───────────────────────────────────────────────── */}
      <MembersSection
        members={filteredMembers}
        documents={filteredDocuments}
        hasMore={hasMoreMembers}
        loadingMore={loadingMoreMembers}
        onLoadMore={loadMoreMembers}
        onViewProfile={openMemberProfile}
      />

      {modal === 'member' && activeMember ? (
        <MemberProfileModal
          member={activeMember}
          documents={enrichedDocuments}
          onClose={closeModals}
          onOpenDocument={openDetails}
          showToast={showToast}
        />
      ) : null}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {modal === 'details' && activeDoc && (
        <Suspense fallback={modalFallback}>
          <DocumentDetailsModal
            doc={activeDoc}
            onClose={closeModals}
            onDownload={openNotice}
            onRequest={openRequest}
            showToast={showToast}
          />
        </Suspense>
      )}
      {modal === 'notice' && activeDoc && (
        <Suspense fallback={modalFallback}>
          <DocumentNoticeModal
            doc={activeDoc}
            tenantId={tenantId}
            settings={settings}
            onClose={closeModals}
          />
        </Suspense>
      )}
      {modal === 'request' && activeDoc && (
        <Suspense fallback={modalFallback}>
          <DocumentRequestModal
            doc={activeDoc}
            settings={settings}
            onClose={closeModals}
          />
        </Suspense>
      )}
    </div>
  );
}
