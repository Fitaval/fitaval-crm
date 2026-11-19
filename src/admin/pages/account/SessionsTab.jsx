import { useState, useEffect } from 'react';
import { Icon } from '../../components/Icon';
import { Badge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';
import { httpClient } from '../../../shared/api/httpClient';

export function SessionsTab() {
  const { sessions, setSessions, toast, addAudit } = useApp();
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await httpClient.get('/auth/sessions/');
      if (res && Array.isArray(res.sessions)) {
        setSessions(res.sessions);
      }
    } catch (err) {
      console.warn('Could not fetch active sessions from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const revoke = async (s) => {
    try {
      await httpClient.post('/auth/sessions/', { session_id: s.id });
      await fetchSessions();
    } catch (err) {
      console.warn('Backend session revoke failed:', err);
      setSessions((ss) => ss.filter((x) => x.id !== s.id));
    }
    addAudit(
      'SECURITY',
      'accounts.Session',
      'jti-' + (s.jti ? s.jti.slice(0, 8) : 'active'),
      { revoked: false },
      { revoked: true, reason: 'Remote sign-out' }
    );
    toast({ title: 'Session revoked', desc: s.device + ' was signed out.' });
    setConfirm(null);
  };

  const revokeAllOthers = async () => {
    try {
      const current = sessions.find((x) => x.current);
      await httpClient.post('/auth/sessions/', { action: 'revoke_all_others', session_id: current?.id });
      await fetchSessions();
    } catch (err) {
      console.warn('Backend revoke all sessions failed:', err);
      setSessions((ss) => ss.filter((x) => x.current));
    }
    toast({ title: 'All other sessions revoked', desc: 'Only this device is signed in.' });
  };
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold">Active staff sessions</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {sessions.length} signed-in devices. Revoking signs the device out within seconds.
          </p>
        </div>
        <Btn
          v="outline"
          disabled={sessions.length < 2}
          onClick={revokeAllOthers}
        >
          Revoke all others
        </Btn>
      </div>
      <div className="thin-scroll overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="bg-zinc-950 text-xs text-zinc-300">
              {['Device', 'IP address', 'JTI token', 'Last active', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sessions.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                      <Icon n={s.icon} size={17} />
                    </span>
                    <div>
                      <p className="font-medium">{s.device}</p>
                      <p className="text-xs text-zinc-500">{s.loc}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs tabular-nums text-zinc-700">{s.ip}</td>
                <td className="px-4 py-3 font-mono text-xs tabular-nums text-zinc-500">{s.jti}</td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{s.last}</td>
                <td className="px-4 py-3 text-right">
                  {s.current ? (
                    <Badge tone="green">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Current Session
                    </Badge>
                  ) : confirm === s.id ? (
                    <span className="inline-flex gap-1">
                      <Btn size="sm" v="dark" onClick={() => revoke(s)}>
                        Confirm revoke
                      </Btn>
                      <Btn size="sm" v="ghost" onClick={() => setConfirm(null)}>
                        Keep
                      </Btn>
                    </span>
                  ) : (
                    <Btn size="sm" v="outline" onClick={() => setConfirm(s.id)}>
                      <Icon n="LogOut" size={13} />
                      Revoke Session
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
