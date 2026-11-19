import { useState, useEffect } from 'react';
import { PageHead } from '../../components/ui/PageHead';
import { Tabs } from '../../components/ui/Tabs';
import { useApp } from '../../context/AppContext';
import { AuditTab } from './AuditTab';
import { SecurityTab } from './SecurityTab';
import { SessionsTab } from './SessionsTab';

const VALID_TABS = ['security', 'sessions', 'audit'];

export function Accounts() {
  const { perms } = useApp();

  const getInitialTab = () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const paramTab = searchParams.get('tab');
      if (paramTab && VALID_TABS.includes(paramTab)) return paramTab;

      const hash = window.location.hash.replace('#', '');
      if (hash && VALID_TABS.includes(hash)) return hash;
    } catch {
      /* ignore */
    }
    return 'security';
  };

  const [tab, setTab] = useState(getInitialTab);

  // Sync tab changes to URL search params so refresh preserves active tab
  const handleTabChange = (newTab) => {
    setTab(newTab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', newTab);
      window.history.replaceState(null, '', url.pathname + url.search);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const onPopState = () => {
      const current = getInitialTab();
      setTab(current);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const tabs = [
    { id: 'security', label: 'Profile and Security', icon: 'ShieldCheck' },
    { id: 'sessions', label: 'Active Sessions', icon: 'Laptop' },
    { id: 'audit', label: 'Audit Logs', icon: 'ScrollText', lock: !perms.audit },
  ];
  return (
    <div>
      <PageHead title="Profile and Accounts" sub="Security, device sessions, staff attendance and audit trail" />
      <div className="mb-5">
        <Tabs tabs={tabs} value={tab} onChange={handleTabChange} />
      </div>
      {tab === 'security' && <SecurityTab />}
      {tab === 'sessions' && <SessionsTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}
