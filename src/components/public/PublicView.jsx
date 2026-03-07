import { lazy, Suspense, useEffect, useState, useMemo, useRef } from 'react';
import { normalizeText, normalizeTag } from '../../utils/helpers';
import { buildPublicShareUrl } from '../../utils/share';
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
  tenantId,
  showToast,
}) {
  const [search, setSearch]   = useState('');
  const [typeFilter, setType] = useState('All');

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
  const deepLinkHandledRef = useRef(false);

  const openDetails = (doc) => { setActiveDoc(doc); setModal('details'); };
  const openMemberProfile = (member) => { setActiveMember(member); setModal('member'); };
  const openNotice  = ()    => setModal('notice');
  const openRequest = ()    => setModal('request');
  const closeModals = ()    => { setModal(null); setActiveDoc(null); setActiveMember(null); };

  const { orgName, municipality, province } = settings || {};
  const cityProvince = [municipality, province].filter(Boolean).join(', ') || 'Argao, Cebu';
  const memberById = useMemo(
    () => new Map(members.map(member => [member.id, member])),
    [members],
  );

  // ─── Derived stats ──────────────────────────────────────────────────────────
  const totalDocs      = documentStats?.totalDocs ?? documents.length;
  const ordinanceCount = documentStats?.ordinanceCount ?? documents.filter(d => d.type === 'Ordinance').length;
  const resCount       = documentStats?.resolutionCount ?? documents.filter(d => d.type === 'Resolution').length;
  const totalViews     = documentStats?.totalViews ?? documents.reduce((acc, d) => acc + (d.views || 0), 0);

  // ─── Filtered documents ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = normalizeText(search);
    return documents.filter(d => {
      const matchType = typeFilter === 'All' || d.type === typeFilter;
      const matchSearch = !q
        || normalizeText(d.title).includes(q)
        || normalizeText(d.docId).includes(q)
        || (d.tags || []).some(t => normalizeTag(t).includes(q));
      return matchType && matchSearch;
    });
  }, [documents, search, typeFilter]);

  const modalFallback = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 text-white">
      <div className="flex items-center gap-3 rounded-2xl bg-slate-900/90 px-5 py-4 text-sm font-semibold">
        <i className="fas fa-spinner fa-spin" />
        <span>Loading dialog…</span>
      </div>
    </div>
  );

  useEffect(() => {
    if (deepLinkHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const memberId = params.get('member');
    const docId = params.get('doc');

    if (!memberId && !docId) {
      deepLinkHandledRef.current = true;
      return;
    }

    if (memberId && !activeMember) {
      const targetMember = members.find((member) => member.id === memberId);
      if (targetMember) {
        deepLinkHandledRef.current = true;
        openMemberProfile(targetMember);
        return;
      }
    }

    if (docId && !activeDoc) {
      const targetDoc = documents.find((entry) => entry.id === docId);
      if (targetDoc) {
        deepLinkHandledRef.current = true;
        openDetails(targetDoc);
      }
    }
  }, [activeDoc, activeMember, documents, members]);

  useEffect(() => {
    if (modal === 'member' && activeMember) {
      window.history.replaceState(null, '', buildPublicShareUrl('member', activeMember.id));
      return;
    }
    if ((modal === 'details' || modal === 'notice' || modal === 'request') && activeDoc) {
      window.history.replaceState(null, '', buildPublicShareUrl('doc', activeDoc.id));
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('member');
    url.searchParams.delete('doc');
    window.history.replaceState(null, '', url.toString());
  }, [activeDoc, activeMember, modal]);

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-white via-blue-50/40 to-amber-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-bold mb-8">
              <i className="fas fa-landmark text-xs" />
              {cityProvince} · Official Legislative Portal
            </div>
            <h1 className="text-5xl lg:text-[3.6rem] font-black text-slate-900 leading-[1.08] mb-5">
              Find Legislative <span className="text-blue-600">Documents</span><br />in Seconds
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
              Browse all ordinances and resolutions passed by the {orgName || 'Sangguniang Bayan of Argao'}.
            </p>

            {/* Search bar */}
            <div className="hero-search mb-10 max-w-4xl mx-auto">
              <div className="flex-1 flex items-center gap-3 pl-6">
                <i className="fas fa-search text-slate-400 text-xl flex-shrink-0" />
                <input
                  type="text" value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by title, ID, or tag…"
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
        documents={filtered}
        memberById={memberById}
        hasMore={hasMoreDocuments}
        loadingMore={loadingMoreDocuments}
        onLoadMore={loadMoreDocuments}
        onClear={() => { setSearch(''); setType('All'); }}
        onViewDetails={openDetails}
      />

      {/* ── Members section ───────────────────────────────────────────────── */}
      <MembersSection
        members={members}
        documents={documents}
        hasMore={hasMoreMembers}
        loadingMore={loadingMoreMembers}
        onLoadMore={loadMoreMembers}
        onViewProfile={openMemberProfile}
      />

      {modal === 'member' && activeMember ? (
        <MemberProfileModal
          member={activeMember}
          documents={documents}
          onClose={closeModals}
          onOpenDocument={(doc) => {
            setActiveDoc(doc);
            setModal('details');
          }}
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
