import { useState, useEffect, useMemo } from 'react';
import { Icon } from '../../components/Icon';
import { Badge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { PageHead } from '../../components/ui/PageHead';
import { inputCls } from '../../components/ui/styles';
import { useApp } from '../../context/AppContext';
import { adminClient } from '../../api/client';
import { cx } from '../../lib/utils';

export function CommissionManagement() {
  const { toast } = useApp();
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editGym, setEditGym] = useState(null);
  const [newRate, setNewRate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const res = await adminClient.commissions.list();
      const list = Array.isArray(res) ? res : res?.results || [];
      setGyms(list);
    } catch (err) {
      console.error('Failed to load gym commissions', err);
      toast({
        title: 'Error loading commissions',
        desc: err.message || 'Could not fetch commissions list.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  const filteredGyms = useMemo(() => {
    if (!search.trim()) return gyms;
    const q = search.toLowerCase();
    return gyms.filter(
      (g) =>
        (g.name || '').toLowerCase().includes(q) ||
        (g.owner_name || '').toLowerCase().includes(q) ||
        (g.city || '').toLowerCase().includes(q) ||
        (g.registration_number || '').toLowerCase().includes(q)
    );
  }, [gyms, search]);

  const handleOpenEdit = (gym) => {
    setEditGym(gym);
    setNewRate(gym.commission_percentage !== null ? String(gym.commission_percentage) : '10.0');
    setReason('');
  };

  const handleSaveCommission = async () => {
    if (!editGym) return;
    const rateNum = parseFloat(newRate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      toast({
        title: 'Invalid rate',
        desc: 'Commission percentage must be between 0% and 100%.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const updated = await adminClient.commissions.update(editGym.id, rateNum, reason);
      setGyms((prev) =>
        prev.map((g) => (g.id === editGym.id ? { ...g, commission_percentage: rateNum } : g))
      );
      toast({
        title: 'Commission updated',
        desc: `Updated commission for ${editGym.name} to ${rateNum}%.`,
      });
      setEditGym(null);
    } catch (err) {
      console.error('Failed to update commission', err);
      toast({
        title: 'Update failed',
        desc: err.message || 'Could not update commission percentage.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Preview split calculations for ₹1,000 example order
  const previewRate = parseFloat(newRate) || 0;
  const sampleOrderAmount = 1000;
  const fitavalCut = Math.round(((sampleOrderAmount * previewRate) / 100) * 100) / 100;
  const gymShare = Math.round((sampleOrderAmount - fitavalCut) * 100) / 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHead
          title="Commission Management"
          sub="Configure dynamic revenue share per gym. Commissions are deducted at transaction time."
        />
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon n="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search gyms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cx(inputCls, 'pl-9 w-64')}
            />
          </div>
          <Btn v="outline" size="sm" onClick={fetchCommissions}>
            <Icon n="RefreshCw" size={14} className={loading ? 'animate-spin' : ''} />
          </Btn>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Icon n="Percent" size={20} />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Configured Gyms</p>
              <p className="text-xl font-bold tabular-nums text-zinc-950 dark:text-white">
                {gyms.length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Icon n="Sliders" size={20} />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Average Rate</p>
              <p className="text-xl font-bold tabular-nums text-zinc-950 dark:text-white">
                {gyms.length > 0
                  ? (
                      gyms.reduce((sum, g) => sum + parseFloat(g.commission_percentage || 10), 0) /
                      gyms.length
                    ).toFixed(1) + '%'
                  : '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Icon n="ShieldCheck" size={20} />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Standard Baseline</p>
              <p className="text-xl font-bold tabular-nums text-zinc-950 dark:text-white">10.0%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gym Commissions Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="px-4 py-3">Gym</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3 text-center">Commission %</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading && gyms.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-sm text-zinc-500">
                    <Icon n="Loader2" size={20} className="animate-spin inline mr-2 text-emerald-500" />
                    Loading commission settings...
                  </td>
                </tr>
              ) : filteredGyms.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-sm text-zinc-500">
                    No matching gyms found.
                  </td>
                </tr>
              ) : (
                filteredGyms.map((gym) => (
                  <tr key={gym.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-semibold text-zinc-950 dark:text-white">{gym.name}</p>
                        <p className="text-xs font-mono text-zinc-400">
                          {gym.registration_number || gym.reg_code || gym.id.slice(0, 8)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {gym.city || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">
                        {gym.owner_name || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold font-mono text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {gym.commission_percentage !== null ? `${gym.commission_percentage}%` : '10.0%'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={gym.status === 'approved' ? 'green' : 'amber'}>
                        {gym.status || 'Active'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Btn
                        size="sm"
                        v="outline"
                        onClick={() => handleOpenEdit(gym)}
                        className="gap-1.5"
                      >
                        <Icon n="Edit" size={13} />
                        Configure
                      </Btn>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Commission Modal */}
      {editGym && (
        <Modal
          open={true}
          onClose={() => setEditGym(null)}
          title={`Set Commission: ${editGym.name}`}
          sub="Update dynamic commission percentage for this gym partner."
          size="md"
          footer={
            <>
              <Btn v="ghost" onClick={() => setEditGym(null)} disabled={saving}>
                Cancel
              </Btn>
              <Btn v="dark" onClick={handleSaveCommission} disabled={saving}>
                {saving ? 'Saving...' : 'Save Commission Rate'}
              </Btn>
            </>
          }
        >
          <div className="space-y-4 pt-2">
            <Field label="Commission Percentage (%)" id="comm-pct" sub="Value between 0% and 100%">
              <div className="relative">
                <input
                  id="comm-pct"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className={cx(inputCls, 'pr-8 font-mono font-bold text-base')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                  %
                </span>
              </div>
            </Field>

            {/* Live Split Calculation Simulation */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Live Split Preview (on ₹1,000 Customer Order)
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-white p-3 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500">Fitaval Commission</span>
                  <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    ₹{fitavalCut.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{previewRate}% platform fee</p>
                </div>
                <div className="rounded-lg bg-white p-3 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500">Gym Partner Share</span>
                  <p className="text-lg font-bold font-mono text-zinc-950 dark:text-white">
                    ₹{gymShare.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{(100 - previewRate).toFixed(1)}% to wallet</p>
                </div>
              </div>
            </div>

            <Field label="Reason / Contract Reference" id="comm-reason" sub="Mandatory for audit trail">
              <input
                id="comm-reason"
                type="text"
                placeholder="e.g. MOU renewal dated 2026-11, negotiated introductory 5%"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
export default CommissionManagement;
