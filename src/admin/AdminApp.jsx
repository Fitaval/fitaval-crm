import { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Icon } from './components/Icon';
import { NotifDrawer } from './components/NotifDrawer';
import { ScannerModal } from './components/ScannerModal';
import { Btn } from './components/ui/Button';
import { Modal } from './components/ui/Modal';
import { Toasts } from './components/ui/Toasts';
import { AppCtx } from './context/AppContext';
import { BR } from './data/branches';
import { ROLES, permsFor } from './data/roles';
import { Header } from './layout/Header';
import { Sidebar } from './layout/Sidebar';
import { iso, TODAY, uid } from './lib/utils';
import { useAdminTheme } from './lib/theme';
import { Accounts } from './pages/account/Accounts';
import { Dashboard } from './pages/dashboard/Dashboard';
import { GymManagement } from './pages/gyms/GymManagement';
import { SubscriptionPlans } from './pages/gyms/SubscriptionPlans';
import { GymDetail } from './pages/gyms/detail/GymDetail';
import { UserManagement } from './pages/users/UserManagement';
import { logout, getSession } from '../portal/session';
import { adminClient } from './api/client';
import { setVerified } from '../shared/verified';

function AdminAppContent() {
  const { theme, dark, toggleTheme } = useAdminTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'admin') {
      window.location.assign('/login?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search));
    }
  }, []);

  const section = useMemo(() => {
    const p = location.pathname.replace(/\/+$/, '') || '/admin';
    if (p === '/admin' || p === '/admin/dashboard') return 'dashboard';
    if (p === '/admin/gyms' || p === '/admin/gym') return 'gym';
    if (p.startsWith('/admin/gyms/')) return 'gymDetail';
    if (p === '/admin/plans' || p === '/admin/subscriptions' || p === '/admin/subscription-plans') return 'plans';
    if (p === '/admin/users' || p === '/admin/members') return 'users';
    if (p === '/admin/account' || p === '/admin/accounts' || p === '/admin/profile') return 'account';
    return 'dashboard';
  }, [location.pathname]);

  const setSection = (id) => {
    if (id === 'dashboard') navigate('/admin/dashboard');
    else if (id === 'gym') navigate('/admin/gyms');
    else if (id === 'gymDetail') {
      if (gymId) navigate(`/admin/gyms/${gymId}`);
      else navigate('/admin/gyms');
    }
    else if (id === 'plans') navigate('/admin/plans');
    else if (id === 'users') navigate('/admin/users');
    else if (id === 'account' || id === 'accounts') navigate('/admin/account');
    else navigate('/admin/dashboard');
  };

  const [role, setRole] = useState('super');
  const [branch, setBranch] = useState('all');
  const [nav, setNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [logoutAsk, setLogoutAsk] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [bell, setBell] = useState(false);

  // Live state from backend
  const [members, setMembers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [gyms, setGyms] = useState({});
  const [gymId, setGymId] = useState('');
  const [approvedN, setApprovedN] = useState(0);
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([
    {
      id: 'sess-active',
      device: 'Admin Console (Current Session)',
      icon: 'Laptop',
      ip: '127.0.0.1',
      jti: 'jti-fitaval-admin-01',
      last: 'Active now',
      current: true,
    },
  ]);
  const [staff, setStaff] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [occ, setOcc] = useState({ kochi: 0, tvm: 0 });
  const [scans, setScans] = useState({ kochi: 0, tvm: 0 });
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch live admin data from Django backend on mount
  useEffect(() => {
    let isMounted = true;
    async function loadAdminBackendData() {
      try {
        setLoading(true);
        const [gymsRes, approvalsRes, usersRes, auditRes] = await Promise.all([
          adminClient.gyms.list().catch((e) => {
            console.error('Failed to load gyms:', e);
            return { data: [] };
          }),
          adminClient.approvals.list().catch((e) => {
            console.error('Failed to load approvals:', e);
            return { data: [] };
          }),
          adminClient.users.list().catch((e) => {
            console.error('Failed to load members:', e);
            return { data: [] };
          }),
          adminClient.audit.list().catch((e) => {
            console.error('Failed to load audit logs:', e);
            return { data: [] };
          }),
        ]);

        if (!isMounted) return;

        const rawGyms = Array.isArray(gymsRes) ? gymsRes : (gymsRes?.data || gymsRes?.results || []);
        if (rawGyms.length > 0) {
          const map = {};
          rawGyms.forEach((g) => {
            const regCode = g.registration_number || g.reg_code || g.code || 'GYM001';
            const vFlag = Boolean(g.is_verified ?? g.verified);
            setVerified(g.id, vFlag, false);
            if (regCode) setVerified(regCode, vFlag, false);
            if (g.id === 'ba0ece81-cc3e-42bd-b1a3-cb47d2817e8d' || regCode === 'GYM001') {
              setVerified('GYM001', vFlag, false);
            }
            map[g.id] = {
              ...g,
              registration_number: regCode,
              reg_code: regCode,
              code: regCode,
              staff: Array.isArray(g.staff) ? g.staff : [],
              trainers: Array.isArray(g.trainers) ? g.trainers : [],
              members: Array.isArray(g.members) ? g.members : [],
              reviews: Array.isArray(g.reviews) ? g.reviews : [],
              txns: Array.isArray(g.txns) ? g.txns : [],
              facilities: Array.isArray(g.facilities) ? g.facilities : [],
              services: Array.isArray(g.services) ? g.services : [],
              photos: Array.isArray(g.photos) ? g.photos : [],
              hours: Array.isArray(g.hours) ? g.hours : [],
              loc: g.loc || g.city || g.address || '',
              owner: typeof g.owner === 'object' ? (g.owner?.name || 'Gym Owner') : (g.owner || 'Gym Owner'),
              owner_obj: typeof g.owner === 'object' ? g.owner : null,
              email: g.email || g.contact_email || (typeof g.owner === 'object' ? g.owner?.email : '') || '',
              phone: g.phone || g.contact_phone || (typeof g.owner === 'object' ? g.owner?.phone : '') || '',
            };
          });
          setGyms(map);
          setGymId((prev) => prev || rawGyms[0]?.id || '');
        }

        const rawApprovals = Array.isArray(approvalsRes) ? approvalsRes : (approvalsRes?.data || approvalsRes?.results || []);
        const normApprovals = rawApprovals.map((a, idx) => {
          let displayDate = a.on;
          if (!displayDate && a.created_at) {
            try {
              const dt = new Date(a.created_at);
              displayDate = !isNaN(dt.getTime())
                ? `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`
                : a.created_at.split('T')[0];
            } catch (e) {
              displayDate = '';
            }
          }
          const rawStatus = (a.status || 'Pending').toLowerCase().replace(/[\s_]+/g, '');
          const titleStatus =
            rawStatus === 'approved'
              ? 'Approved'
              : rawStatus === 'rejected'
              ? 'Rejected'
              : rawStatus === 'underreview'
              ? 'Under Review'
              : 'Pending';

          const regCode =
            a.registration_number ||
            a.reg_code ||
            (typeof a.id === 'string' && a.id.startsWith('GYM') ? a.id : `GYM${String(idx + 1).padStart(3, '0')}`);

          return {
            ...a,
            id: a.id || a.registration_number,
            gym_id: a.gym_id || a.gym || a.id,
            registration_number: regCode,
            reg_code: regCode,
            name: a.name || a.gym_name || 'Gym',
            loc: a.loc || a.city || a.address || '',
            owner: a.owner || a.owner_name || 'Gym Owner',
            email: a.email || a.owner_email || (typeof a.owner === 'object' ? a.owner?.email : '') || '',
            phone: a.phone || a.owner_phone || (typeof a.owner === 'object' ? a.owner?.phone : '') || '',
            status: titleStatus,
            on: displayDate || 'Today',
          };
        });
        setApprovals(normApprovals);
        setApprovedN(normApprovals.filter((a) => a.status === 'Approved').length);

        const rawUsers = Array.isArray(usersRes) ? usersRes : (usersRes?.data || usersRes?.results || []);
        const filteredUsers = rawUsers.filter((u) => {
          const r = (u.role || '').toLowerCase();
          const name = (u.name || u.full_name || '').toLowerCase();
          if (r === 'super_admin' || r === 'admin') return false;
          if (r === 'gym_owner' || r === 'crm') return false;
          if (u.status === 'pending_verification' || u.status === 'Pending') return false;
          if (name === 'super admin') return false;
          return true;
        });
        const normUsers = filteredUsers.map((u, i) => {
          const rawStatus = (u.status || 'Active').toLowerCase();
          const titleStatus = rawStatus === 'active' ? 'Active' : rawStatus === 'inactive' ? 'Expired' : 'Frozen';
          return {
            ...u,
            id: u.id || `u-${i}`,
            name: u.name || u.full_name || 'Member',
            phone: u.phone || '',
            email: u.email || '',
            gender: u.gender || '',
            date_of_birth: u.date_of_birth || u.dob || '',
            age: u.age || null,
            weight: u.weight || u.weight_kg || null,
            weight_kg: u.weight_kg || u.weight || null,
            height: u.height || u.height_cm || null,
            height_cm: u.height_cm || u.height || null,
            avatar_url: u.avatar_url || '',
            plan: u.plan || u.plan_name || 'App Member (Free)',
            branch: u.branch || u.gym_name || 'Main',
            status: u.status ? (u.status.charAt(0).toUpperCase() + u.status.slice(1)) : titleStatus,
            since: u.since || u.joined_at || u.created_at || new Date().toISOString(),
            end: u.end || u.end_date || null,
            visits: u.visits ?? 0,
            last: u.last || u.last_checkin || 'Never',
            num: u.num || String(i + 1).padStart(3, '0'),
            hex: u.hex || (u.qr_token ? u.qr_token.slice(-6) : (u.id ? u.id.slice(-6).toUpperCase() : 'A1B2C3')),
            crm: u.crm || [],
          };
        });
        setMembers(normUsers);

        const rawAudit = Array.isArray(auditRes) ? auditRes : (auditRes?.data || auditRes?.results || []);
        const normAudit = rawAudit.map((a) => ({
          ...a,
          id: a.id,
          at: a.at || (a.created_at ? new Date(a.created_at) : new Date()),
          action: (a.action || 'ADMIN_ACTION').toUpperCase(),
          actor: a.actor || a.actor_email || 'Super Admin',
          model: a.model || a.target_model || 'System',
          obj: a.obj || a.target_id || '',
          ip: a.ip || a.ip_address || '127.0.0.1',
          user_agent: a.user_agent || '',
          before: a.before || a.old_values || {},
          after: a.after || a.new_values || {},
        }));
        setAudit(normAudit);
      } catch (err) {
        console.error('Error fetching admin data from backend:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAdminBackendData();
    return () => {
      isMounted = false;
    };
  }, []);

  const roleObj = ROLES.find((r) => r.id === role) || ROLES[0];
  const perms = useMemo(() => permsFor(role), [role]);

  const toast = (t) => {
    const id = uid();
    setToasts((ts) => [...ts.slice(-3), { id, ...t }]);
    if (!t.sticky) setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 4200);
    return id;
  };

  const updateToast = (id, patch) => setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const dismiss = (id) => setToasts((ts) => ts.filter((t) => t.id !== id));

  const addAudit = (action, model, obj, before, after) => {
    const entry = {
      id: 'a' + uid(),
      at: new Date(),
      action,
      actor: roleObj?.user || 'Super Admin',
      model,
      obj,
      ip: '127.0.0.1',
      before,
      after,
    };
    setAudit((a) => [entry, ...a]);
    adminClient.audit.log(action, model, obj, before, after).catch(() => {});
  };

  const updateGym = (id, patch) => {
    setGyms((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
    adminClient.gyms.update(id, patch).catch(() => {});
  };

  const openGym = async (id, shouldNavigate = true) => {
    setGymId(id);
    if (shouldNavigate && location.pathname !== `/admin/gyms/${id}`) {
      navigate(`/admin/gyms/${id}`);
    }
    try {
      const res = await adminClient.gyms.get(id);
      const detail = res?.data || res;
      if (detail && typeof detail === 'object') {
        const regCode = detail.registration_number || detail.reg_code || detail.code || 'GYM001';
        const vFlag = Boolean(detail.is_verified ?? detail.verified);
        setVerified(id, vFlag, false);
        if (regCode) setVerified(regCode, vFlag, false);
        if (id === 'ba0ece81-cc3e-42bd-b1a3-cb47d2817e8d' || regCode === 'GYM001') {
          setVerified('GYM001', vFlag, false);
        }
        setGyms((m) => {
          const actualRegCode = detail.registration_number || detail.reg_code || detail.code || m[id]?.registration_number || 'GYM001';
          return {
            ...m,
            [id]: {
              ...(m[id] || {}),
              ...detail,
              registration_number: regCode,
              reg_code: regCode,
              code: regCode,
              staff: Array.isArray(detail.staff) ? detail.staff : (m[id]?.staff || []),
              trainers: Array.isArray(detail.trainers) ? detail.trainers : (m[id]?.trainers || []),
              members: Array.isArray(detail.members) ? detail.members : (m[id]?.members || []),
              reviews: Array.isArray(detail.reviews) ? detail.reviews : (m[id]?.reviews || []),
              txns: Array.isArray(detail.txns) ? detail.txns : (m[id]?.txns || []),
              facilities: Array.isArray(detail.facilities) ? detail.facilities : (m[id]?.facilities || []),
              services: Array.isArray(detail.services) ? detail.services : (m[id]?.services || []),
              photos: Array.isArray(detail.photos) ? detail.photos : (m[id]?.photos || []),
              hours: Array.isArray(detail.hours) ? detail.hours : (m[id]?.hours || []),
            },
          };
        });
      }
    } catch (e) {
      console.warn('Could not load gym detail:', e);
    }
  };

  const updateMember = (id, patch) => {
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const recordScan = (m, dir, status) => {
    setFeed((f) => [{ id: uid(), name: m.name, branch: m.branch || 'main', dir, status, at: new Date() }, ...f].slice(0, 30));
  };

  const startExport = async (n, bf, done) => {
    const id = toast({
      title: 'Exporting members',
      desc: 'Preparing export payload…',
      progress: 20,
      sticky: true,
      done: false,
    });

    try {
      await adminClient.users.export({ branch: bf });
      updateToast(id, {
        title: 'Export ready',
        desc: n + ' rows exported.',
        progress: 100,
        done: true,
      });
      setTimeout(() => dismiss(id), 4200);
      addAudit('EXPORT', 'memberships.Membership', 'bulk-export', { rows: 0 }, { rows: n, branch: bf });
      if (done) done();
    } catch (e) {
      updateToast(id, {
        title: 'Export failed',
        desc: e.message,
        progress: 100,
        done: true,
      });
    }
  };

  useEffect(() => {
    try {
      window.scrollTo(0, 0);
    } catch (e) {
      /* scroll not available */
    }
  }, [section]);

  const ctx = {
    session: getSession(),
    section,
    setSection,
    role,
    setRole,
    roleObj,
    perms,
    branch,
    setBranch,
    members,
    updateMember,
    audit,
    addAudit,
    approvals,
    setApprovals,
    approvedN,
    setApprovedN,
    theme,
    dark,
    toggleTheme,
    gyms,
    gymId,
    updateGym,
    openGym,
    plans,
    setPlans,
    sessions,
    setSessions,
    staff,
    setStaff,
    alerts,
    setAlerts,
    broadcasts,
    setBroadcasts,
    toast,
    occ,
    scans,
    feed,
    recordScan,
    startExport,
    client: adminClient,
    adminClient,
    loading,
  };

  return (
    <AppCtx.Provider value={ctx}>
      <div className="flex min-h-screen w-full">
        <Sidebar
          section={section}
          setSection={setSection}
          open={nav}
          onClose={() => setNav(false)}
          collapsed={collapsed}
          onCollapse={() => setCollapsed((c) => !c)}
          onLogout={() => setLogoutAsk(true)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            onMenu={() => setNav(true)}
            onBell={() => setBell(true)}
            collapsed={collapsed}
            onCollapse={() => setCollapsed((c) => !c)}
          />
          <main className="flex-1 p-4 md:p-6">
            <Routes>
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/gyms" element={<GymManagement />} />
              <Route path="/admin/gym" element={<Navigate to="/admin/gyms" replace />} />
              <Route path="/admin/gyms/:gymId" element={<GymDetail />} />
              <Route path="/admin/gyms/:gymId/:subTab" element={<GymDetail />} />
              <Route path="/admin/plans" element={<SubscriptionPlans />} />
              <Route path="/admin/subscriptions" element={<Navigate to="/admin/plans" replace />} />
              <Route path="/admin/subscription-plans" element={<Navigate to="/admin/plans" replace />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/members" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/account" element={<Accounts />} />
              <Route path="/admin/accounts" element={<Navigate to="/admin/account" replace />} />
              <Route path="/admin/profile" element={<Navigate to="/admin/account" replace />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
      <Toasts toasts={toasts} dismiss={dismiss} list={toasts} onDismiss={dismiss} />
      {scanOpen && <ScannerModal onClose={() => setScanOpen(false)} />}
      {bell && <NotifDrawer onClose={() => setBell(false)} />}
      {logoutAsk && (
        <Modal
          open={true}
          onClose={() => setLogoutAsk(false)}
          size="sm"
          title="Sign out of Admin Panel?"
          sub="You will need to sign in again to access Fitaval Admin."
          footer={
            <>
              <Btn v="ghost" onClick={() => setLogoutAsk(false)}>
                Cancel
              </Btn>
              <Btn
                v="dark"
                onClick={() => {
                  setLogoutAsk(false);
                  logout();
                }}
              >
                Sign out
              </Btn>
            </>
          }
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Active sessions and sensitive tokens will be invalidated immediately.
          </p>
        </Modal>
      )}
    </AppCtx.Provider>
  );
}

export default function AdminApp() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AdminAppContent />
    </Router>
  );
}
