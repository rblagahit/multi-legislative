import { useState } from 'react';
import DocumentsTab from './DocumentsTab';
import MembersTab   from './MembersTab';
import SettingsTab  from './SettingsTab';
import ProfileTab   from './ProfileTab';

const TABS = [
  { id: 'docs',     label: 'Documents', icon: 'fa-file-alt' },
  { id: 'members',  label: 'Members',   icon: 'fa-users' },
  { id: 'settings', label: 'Settings',  icon: 'fa-sliders' },
  { id: 'profile',  label: 'My Profile',icon: 'fa-user-circle' },
];

/**
 * Admin management panel with tab navigation.
 * Phase 3: Replace top tab bar with left sidebar per PROJECT_REVIEW.md §3.
 */
export default function AdminView({ user, documents, members, settings, navigateTo, showToast }) {
  const [activeTab, setActiveTab] = useState('docs');

  const tabProps = { user, documents, members, settings, showToast };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateTo('public')}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all"
          >
            <i className="fas fa-arrow-left text-sm" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white">
              <i className="fas fa-crown" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Management Panel</h2>
              <p className="text-slate-500 text-sm mt-0.5">Manage members and legislative documents</p>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Members</p>
            <p className="text-2xl font-black text-slate-900">{members.filter(m => !m.isArchived).length}</p>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Documents</p>
            <p className="text-2xl font-black text-slate-900">{documents.length}</p>
          </div>
        </div>
      </div>

      {/* Tab bar — Phase 3: replace with AdminSidebar */}
      <div className="flex gap-2 mb-8 border-b border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-all
              ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'}`}
          >
            <i className={`fas ${tab.icon} mr-2`} />{tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'docs'     && <DocumentsTab {...tabProps} />}
      {activeTab === 'members'  && <MembersTab   {...tabProps} />}
      {activeTab === 'settings' && <SettingsTab  {...tabProps} />}
      {activeTab === 'profile'  && <ProfileTab   {...tabProps} />}

    </section>
  );
}
