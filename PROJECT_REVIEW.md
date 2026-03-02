# Project Review & Development Roadmap
## Sangguniang Bayan of Argao — Legislative Information System

> Last updated: March 2026
> Stack: Vanilla HTML/CSS/JS · Firebase Auth · Cloud Firestore · Firebase Hosting

---

## 1. Current State Assessment

### Architecture at a Glance

| Aspect | Current State | Target State |
|---|---|---|
| Stack | Single `index.html` (~2,600 lines) with CDN imports | Componentized React app (Vite already configured) |
| Auth model | Binary — anonymous public vs. one hardcoded admin | Role-based: Super Admin → Admin → Editor → Viewer |
| Admin roles | None — any logged-in user has full write access | Custom Claims via Firebase (enforced server-side) |
| Firestore rules | `request.auth != null` = full write to everything | Role + LGU-scoped rules |
| Data path | `artifacts/sb-argao/public/data/*` (hardcoded) | `lgus/{lguId}/*` (multi-tenant ready) |
| User management | One admin profile at `admin/profile` | `users/{uid}` collection with roles and status |
| Admin UI | Always-open forms, nested tabs, cluttered layout | Sidebar nav, list-first, drawer-based forms |

### What Works Well

- Real-time Firestore listeners for instant UI updates
- Clean public-facing view (search, members, stats)
- XSS-safe HTML escaping on rendered content
- Batch CSV import for documents
- View tracking with atomic `increment()` operations
- Responsive design with Tailwind CSS
- Well-structured document metadata (sponsors, tags, co-sponsors)

### Key Pain Points

1. **Single admin bottleneck** — one person must do everything; no delegation
2. **No audit trail** — no way to know who changed what or when
3. **Admin UI clutter** — forms always open, all fields always visible, settings overwhelming
4. **Firebase config exposed in HTML** — API key hardcoded, no environment variables
5. **Monolithic file** — 2,600+ lines make maintenance and collaboration error-prone
6. **Firestore rules too permissive** — any authenticated user can write any document

---

## 2. Role Hierarchy (Target)

```
Super Admin
  └── full system access, manages all LGUs and all users

  Admin (per LGU)
    ├── Full Admin   → documents, members, settings, user invitations
    ├── Editor       → documents and members only (no settings, no user mgmt)
    └── Viewer       → read-only admin panel (can view but not save)

Public User
  └── Anonymous visitor — browse, search, request document copies
```

---

## 3. Admin Panel Redesign

### What's Wrong Now

| Tab | Problem |
|---|---|
| Documents | 8-field upload form permanently open above the document list; nested sub-tabs (Single/Batch) add a second tab layer inside the first |
| Members | 7-field Add Member form occupies a full column side-by-side with the list even when not in use |
| Settings | Branding (9 fields) + Document Notice (1 textarea) + Social Media (3 fields) all stacked open simultaneously — 13+ fields visible at all times |
| Profile | Disabled Email Service block (~8 greyed-out fields) takes up a third of the page with no current function |

### Proposed Layout: Sidebar + List-First + Action-Triggered Drawers

**Core principle: lists are the default view. Forms only appear when you trigger an action.**

#### Overall Shell

```
┌─────────────────────────────────────────────────────────────┐
│  [≡ Seal]  Management Panel       [Members: 12] [Docs: 48] │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│  📄 Docs │  [content area — changes per section]            │
│  👥 Memb │                                                   │
│  ⚙ Sett │                                                   │
│  👤 Prof │                                                   │
│          │                                                   │
│  ← Public│                                                   │
└──────────┴──────────────────────────────────────────────────┘
```

- Left sidebar replaces the top tab bar — scales cleanly to more tabs (Users, Activity Log, Super Admin)
- Stats (member/doc counts) move to top bar
- Active section highlighted with icon + label

#### Documents — List-First with Drawer

```
┌──────────────────────────────────────────────────────┐
│  Documents                          [+ Add Document] │
│  [Search by title or ID…] [Type ▾] [Year ▾]          │
├──────────────────────────────────────────────────────┤
│  ORD-2024-001 · An Ordinance…    Ordinance  [✏] [🗑] │
│  RES-2024-047 · A Resolution…   Resolution  [✏] [🗑] │
└──────────────────────────────────────────────────────┘

                          ┌─────────────────────────┐
                          │  Add Document        [×] │  (drawer — right side)
                          │  ○ Single  ○ Batch       │
                          │  ─────────────────────── │
                          │  Title                   │
                          │  Doc ID        Type ▾    │
                          │  Primary Sponsor ▾       │
                          │  PDF URL                 │
                          │  ▾ Optional fields       │  ← Co-Sponsors, Tags, More Info
                          │  ─────────────────────── │  collapsed by default
                          │  [Cancel]  [Publish Doc] │
                          └─────────────────────────┘
```

#### Members — List-First with Drawer

```
┌──────────────────────────────────────────────────────┐
│  Members                             [+ Add Member]  │
│  [Search by name or role…]                           │
├──────────────────────────────────────────────────────┤
│  [Photo] Hon. Juan dela Cruz                         │
│          Vice Mayor · Committee on Health  [✏] [🗑]  │
│  [Photo] Hon. Maria Santos                           │
│          Councilor · Committee on Budget   [✏] [🗑]  │
└──────────────────────────────────────────────────────┘
```

- No permanently-open left column
- Add/Edit share the same drawer, pre-filled on edit
- Archive toggle inline on each row

#### Settings — Accordion (One Section Open at a Time)

```
┌──────────────────────────────────────────────────────┐
│  Settings                                            │
├──────────────────────────────────────────────────────┤
│  ▼  🏛  Organization Branding               [Save]  │  ← expanded
│  ─────────────────────────────────────────────────  │
│  Org Name  [Sangguniang Bayan of Argao           ]  │
│  Municipality [Argao    ]  Province [Cebu        ]  │
│  Seal URL  [https://…                            ]  │
│  Phone 1   [           ]   Phone 2  [            ]  │
│  Contact Email [                                 ]  │
├──────────────────────────────────────────────────────┤
│  ▶  📋  Document Download Notice                    │  ← collapsed
├──────────────────────────────────────────────────────┤
│  ▶  📱  Social Media Links                          │  ← collapsed
└──────────────────────────────────────────────────────┘
```

- Click header to expand/collapse; only one open at a time
- Each section has its own Save button inline — no scrolling to find it

#### Profile — Focused, No Dead Weight

```
┌──────────────────────────────────────────────────────┐
│  My Profile                                          │
│  ─────────────────────────────────────────────────  │
│  Full Name     [                                 ]  │
│  Position      [                                 ]  │
│  Contact Email [                                 ] *│
│  Photo URL     [                                 ]  │
│  Bio           [                                 ]  │
│                                                     │
│                              [Save Profile]         │
└──────────────────────────────────────────────────────┘
```

- Email Service Configuration section **removed** — disabled, confuses users, serves no current purpose. Reintroduce only when implemented.

---

## 4. Architecture: Multi-User, Multi-Admin, Super Admin

### Firebase Auth + Custom Claims (Role Engine)

Custom Claims are embedded in the JWT — enforced by both client UI gating and Firestore server-side rules.

```js
// Cloud Function: setUserRole (called only by Super Admin)
await admin.auth().setCustomUserClaims(uid, {
  role: 'admin',   // 'superadmin' | 'admin' | 'editor' | 'viewer'
  lguId: 'argao'   // which organization this user belongs to
});
```

Client reads claims via:
```js
const { role, lguId } = (await user.getIdTokenResult()).claims;
```

### Firestore Data Model Changes

**New `users` collection** (replaces single `admin/profile`):
```
users/{uid}
  ├── email
  ├── name
  ├── role: 'superadmin' | 'admin' | 'editor' | 'viewer'
  ├── lguId: 'argao'
  ├── status: 'active' | 'suspended' | 'pending'
  ├── createdAt
  ├── createdBy (uid)
  └── lastLogin
```

**Multi-tenant data path** (replaces hardcoded `sb-argao`):
```
lgus/{lguId}/
  ├── profile/              ← org name, seal, contact info
  ├── legislations/{docId}  ← documents
  ├── members/{memberId}    ← members
  └── settings/general      ← branding, social links, download notice
```

### Revised Firestore Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSuperAdmin() {
      return request.auth != null
          && request.auth.token.role == 'superadmin';
    }
    function isAdminOf(lguId) {
      return request.auth != null
          && request.auth.token.lguId == lguId
          && request.auth.token.role in ['admin', 'superadmin'];
    }
    function isEditorOf(lguId) {
      return request.auth != null
          && request.auth.token.lguId == lguId
          && request.auth.token.role in ['admin', 'editor', 'superadmin'];
    }

    match /users/{uid} {
      allow read:  if request.auth.uid == uid || isSuperAdmin();
      allow write: if isSuperAdmin();
    }

    match /lgus/{lguId}/legislations/{doc} {
      allow read:  if true;
      allow write: if isEditorOf(lguId);
    }
    match /lgus/{lguId}/members/{doc} {
      allow read:  if true;
      allow write: if isEditorOf(lguId);
    }
    match /lgus/{lguId}/settings/{doc} {
      allow read:  if true;
      allow write: if isAdminOf(lguId);   // editors cannot change settings
    }
    match /lgus/{lguId}/profile/{doc} {
      allow read:  if true;
      allow write: if isAdminOf(lguId);
    }
  }
}
```

---

## 5. Development Phasing

---

### ⚡ PHASE 0 — Quick Wins (No Architecture Change Required)
**Goal: Highest immediate impact with the least disruption. Ship now.**

| # | Task | Impact | Effort |
|---|---|---|---|
| 0.1 | **Tighten Firestore rules** — add `lguId` and `role` check even before Custom Claims are set up. Minimum: restrict writes to a known admin UID list. | 🔴 Security Critical | XS |
| 0.2 | **Move Firebase config to `.env`** — use Vite's `import.meta.env.VITE_*`. Removes API key from public HTML. | 🔴 Security | S |
| 0.3 | **Remove the disabled Email Service block** from the Profile tab. Dead UI that confuses users. | 🟢 UX / Clarity | XS |
| 0.4 | **Collapse the Add Document form** — hide it behind an "+ Add Document" button. List becomes the default view. | 🟢 UX / Clarity | S |
| 0.5 | **Collapse the Add Member form** — same pattern; show only on button click. Removes the permanent two-column layout. | 🟢 UX / Clarity | S |
| 0.6 | **Settings accordion** — wrap each settings group (Branding, Notice, Social) in a collapsible card. All collapsed by default except the first. | 🟢 UX / Clarity | S |
| 0.7 | **Optional fields in upload form collapsed** — Co-Sponsors, Tags, and More Info hidden under a "▾ Optional fields" toggle. Reduces first-view noise significantly. | 🟢 UX / Clarity | XS |

> **Phase 0 can be completed entirely within the current `index.html`** — no build tooling, no migration, no Firebase changes required for most items.

---

### PHASE 1 — Foundation: Roles & Secure Rules
**Goal: Lay the security and data model foundation. Existing users unaffected.**

| # | Task | Notes |
|---|---|---|
| 1.1 | Create `users/{uid}` collection in Firestore | Migrate current `admin/profile` → first user document with `role: 'admin'` |
| 1.2 | Add Firebase Cloud Functions project | `setUserRole`, `getUserRole` — callable functions only Super Admin can invoke |
| 1.3 | Promote current admin to `role: 'admin'` via one-time script | One `setCustomUserClaims()` call |
| 1.4 | Deploy updated Firestore security rules | Role-scoped, LGU-scoped rules from §4 above |
| 1.5 | Update client auth logic to read `role` from token claims | Gate UI sections based on role |

---

### PHASE 2 — Multi-Admin: Invite & Manage Users
**Goal: Allow a Full Admin to invite editors and viewers.**

| # | Task | Notes |
|---|---|---|
| 2.1 | Add **Users tab** to admin sidebar | Visible only to `admin` and `superadmin` roles |
| 2.2 | Invite by email flow | Firebase creates account → Cloud Function sets role claim → user receives email |
| 2.3 | User list: active, suspended, pending invite | Admin can suspend (not delete) access |
| 2.4 | Role-gated UI | Editors see Docs + Members tabs only; Settings and Users tabs hidden for editors/viewers |
| 2.5 | Activity log collection | `lgus/{lguId}/activityLog/{id}` — records who changed what and when |

---

### PHASE 3 — Admin Panel Redesign (Full)
**Goal: Ship the full sidebar + drawer UI redesign from §3.**

| # | Task | Notes |
|---|---|---|
| 3.1 | Migrate `index.html` to React components | Vite + React already in `package.json` — split views into component files |
| 3.2 | Implement left sidebar navigation | Replace top tab bar; built for scalability |
| 3.3 | Slide-in drawer component | Shared by Add Document, Add Member, Edit Document, Edit Member |
| 3.4 | Settings accordion component | Branding / Notice / Social — one open at a time |
| 3.5 | Activity log view in sidebar | Read-only list of recent changes with user, action, timestamp |

---

### PHASE 4 — Super Admin Dashboard
**Goal: Central control panel for managing all LGUs and all users.**

| # | Task | Notes |
|---|---|---|
| 4.1 | `view-superadmin` section / route | Only accessible with `role: 'superadmin'` claim |
| 4.2 | LGU management | Create new LGU instances (`lgus/{lguId}/profile`), assign first admin |
| 4.3 | Global user management | List all users across all LGUs, reassign roles, suspend |
| 4.4 | System-wide settings | Global download notice defaults, email service config |
| 4.5 | Enable Firebase App Check | Prevents unauthorized API calls from outside the app |

---

### PHASE 5 — Multi-Tenant (Optional / Future)
**Goal: One deployment serves multiple LGUs (SB Dalaguete, SB Carcar, SP Cebu, etc.)**

| # | Task | Notes |
|---|---|---|
| 5.1 | Migrate data paths to `lgus/{lguId}/*` | Replace hardcoded `artifacts/sb-argao/` path |
| 5.2 | LGU selector on login or subdomain routing | `argao.sb-lis.gov.ph` vs `dalaguete.sb-lis.gov.ph` |
| 5.3 | Per-LGU branding isolation | Each LGU has its own seal, colors, contact info |
| 5.4 | Cross-LGU search (Super Admin only) | Super admin can query across all LGU document libraries |

---

## 6. Phase Summary & Recommended Sequence

```
Phase 0 ──► NOW       Quick wins in the current index.html (no migration)
Phase 1 ──► Next      Security foundation: roles, rules, users collection
Phase 2 ──► After 1   Multi-admin: invite system, role-gated UI, activity log
Phase 3 ──► After 2   Full admin UI redesign (React components + drawers)
Phase 4 ──► After 3   Super admin dashboard
Phase 5 ──► Future    Full multi-tenant if expanding to other LGUs
```

**Minimum viable improvement that adds real security and usability:**
Complete **Phase 0 + Phase 1**. These two phases together fix the biggest pain points (UI clutter + open Firestore rules) with the least risk of breaking existing functionality.

---

## 7. File / Folder Structure (Target — Phase 3+)

```
erp-legislative/
├── src/
│   ├── main.jsx
│   ├── firebase.js              ← config from .env
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminSidebar.jsx
│   │   │   ├── Drawer.jsx       ← shared slide-in panel
│   │   │   └── Toast.jsx
│   │   ├── admin/
│   │   │   ├── DocumentsTab.jsx
│   │   │   ├── MembersTab.jsx
│   │   │   ├── SettingsTab.jsx
│   │   │   ├── ProfileTab.jsx
│   │   │   └── UsersTab.jsx     ← Phase 2
│   │   └── public/
│   │       ├── PublicView.jsx
│   │       ├── ContactView.jsx
│   │       └── MemberCard.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useDocuments.js
│   │   └── useMembers.js
│   └── views/
│       ├── AdminView.jsx
│       ├── PublicView.jsx
│       └── LoginView.jsx
├── functions/                   ← Phase 1 (Firebase Cloud Functions)
│   ├── index.js
│   └── setUserRole.js
├── firestore.rules
├── .env                         ← Firebase config (not committed)
├── .env.example                 ← committed template
└── package.json
```

---

*Document maintained by the development team. Update phase status as tasks are completed.*
