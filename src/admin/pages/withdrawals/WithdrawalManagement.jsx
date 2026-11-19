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
import { cx, iso } from '../../lib/utils';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Withdrawals' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'INITIATED', label: 'Initiated' },
  { id: 'SUCCESS', label: 'Success' },
  { id: 'FAILED', label: 'Failed' },
];

export function WithdrawalManagement() {
  const { toast } = useApp();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  
  // Override Modal
  const [overrideItem, setOverrideItem] = useState(null);
  const [overrideAction, setOverrideAction] = useState('MARK_SUCCESS'); // MARK_SUCCESS | REVERT_TO_WALLET
  const [overrideUtr, setOverrideUtr] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'ALL') params.status = activeTab;
      const res = await adminClient.withdrawals.list(params);
      const list = Array.isArray(res) ? res : res?.results || [];
      setWithdrawals(list);
    } catch (err) {
      console.error('Failed to load withdrawals', err);
      toast({
        title: 'Error loading withdrawals',
        desc: err.message || 'Could not fetch withdrawals list.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [activeTab]);

  const filtered = useMemo(() => {
    if (!search.trim()) return withdrawals;
    const q = search.toLowerCase();
    return withdrawals.filter(
      (w) =>
        (w.gym_name || '').toLowerCase().includes(q) ||
        (w.owner_name || '').toLowerCase().includes(q) ||
        (w.bank_utr || '').toLowerCase().includes(q) ||
        (w.account_number_masked || '').toLowerCase().includes(q) ||
        (w.id || '').toLowerCase().includes(q)
    );
  }, [withdrawals, search]);

  const stats = useMemo(() => {
    let totalAmt = 0;
    let successAmt = 0;
    let pendingAmt = 0;
    let failedAmt = 0;

    withdrawals.forEach((w) => {
      const val = parseFloat(w.amount || '0');
      totalAmt += val;
      if (w.status === 'SUCCESS') successAmt += val;
      else if (w.status === 'PROCESSING' || w.status === 'INITIATED') pendingAmt += val;
      else if (w.status === 'FAILED') failedAmt += val;
    });

    return { totalAmt, successAmt, pendingAmt, failedAmt };
  }, [withdrawals]);

  const handleOpenOverride = (item) => {
    setOverrideItem(item);
    setOverrideAction('MARK_SUCCESS');
    setOverrideUtr(item.bank_utr || '');
    setOverrideReason('');
  };

  const handleConfirmOverride = async () => {
    if (!overrideItem) return;
    if (overrideAction === 'MARK_SUCCESS' && !overrideUtr.trim()) {
      toast({
        title: 'Bank UTR Required',
        desc: 'Please provide the transaction UTR reference when marking as success.',
        variant: 'destructive',
      });
      return;
    }
    if (!overrideReason.trim()) {
      toast({
        title: 'Reason Required',
        desc: 'Please provide a mandatory reason for this manual override for the audit trail.',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingOverride(true);
    try {
      await adminClient.withdrawals.override(
        overrideItem.id,
        overrideAction,
        overrideUtr.trim(),
        overrideReason.trim()
      );
      toast({
        title: 'Withdrawal overridden',
        desc: `Withdrawal successfully updated via manual override (${overrideAction}).`,
      });
      setOverrideItem(null);
      fetchWithdrawals();
    } catch (err) {
      console.error('Failed to override withdrawal', err);
      toast({
        title: 'Override failed',
        desc: err.message || 'Could not complete manual override.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingOverride(false);
    }
  };

  const getStatusTone = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'green';
      case 'PROCESSING':
        return 'blue';
      case 'INITIATED':
        return 'amber';
      case 'FAILED':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHead
          title="Withdrawals Monitoring"
          sub="Monitor gym owner payout disbursements, Cashfree bank transfers, and manual ledger overrides."
        />
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon n="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by gym, UTR, account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cx(inputCls, 'pl-9 w-64')}
            />
          </div>
          <Btn v="outline" size="sm" onClick={fetchWithdrawals}>
            <Icon n="RefreshCw" size={14} className={loading ? 'animate-spin' : ''} />
          </Btn>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs text-zinc-500">Total Requested</p>
          <p className="mt-1 text-2xl font-bold font-mono text-zinc-950 dark:text-white">
            ₹{stats.totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">{withdrawals.length} transactions</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs text-zinc-500">Successfully Disbursed</p>
          <p className="mt-1 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            ₹{stats.successAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Cleared to bank accounts</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs text-zinc-500">Pending / In-Transit</p>
          <p className="mt-1 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            ₹{stats.pendingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Awaiting bank confirmation</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs text-zinc-500">Failed / Reverted</p>
          <p className="mt-1 text-2xl font-bold font-mono text-red-600 dark:text-red-400">
            ₹{stats.failedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Returned to wallet</p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cx(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              activeTab === tab.id
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Withdrawals Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="px-4 py-3">Date / ID</th>
                <th className="px-4 py-3">Gym & Owner</th>
                <th className="px-4 py-3 font-mono">Amount (₹)</th>
                <th className="px-4 py-3">Bank Details</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Bank Ref / UTR</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading && withdrawals.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-sm text-zinc-500">
                    <Icon n="Loader2" size={20} className="animate-spin inline mr-2 text-emerald-500" />
                    Loading withdrawal records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-sm text-zinc-500">
                    No withdrawals match the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-zinc-500 whitespace-nowrap">
                        {w.created_at ? new Date(w.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </p>
                      <p className="font-mono text-[11px] text-zinc-400">{w.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-zinc-950 dark:text-white">{w.gym_name || 'Gym'}</p>
                      <p className="text-xs text-zinc-500">{w.owner_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 font-bold font-mono text-zinc-950 dark:text-white whitespace-nowrap">
                      ₹{parseFloat(w.amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-mono text-xs text-zinc-800 dark:text-zinc-200">
                        {w.account_number_masked || '••••••••'}
                      </p>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        {w.ifsc_code} {w.bank_name ? `(${w.bank_name})` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Badge tone={getStatusTone(w.status)}>{w.status}</Badge>
                      {w.is_manual_override && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                          Admin Override
                        </p>
                      )}
                      {w.failure_reason && (
                        <p className="text-[11px] text-red-500 max-w-[180px] truncate mt-0.5" title={w.failure_reason}>
                          {w.failure_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {w.bank_utr ? (
                        <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px]">
                          {w.bank_utr}
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <Btn
                        size="sm"
                        v="outline"
                        onClick={() => handleOpenOverride(w)}
                        className="gap-1 text-xs"
                      >
                        <Icon n="SlidersHorizontal" size={12} />
                        Override
                      </Btn>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Override Dialog */}
      {overrideItem && (
        <Modal
          open={true}
          onClose={() => setOverrideItem(null)}
          title="Manual Withdrawal Override"
          sub={`Override status for withdrawal ₹${parseFloat(overrideItem.amount).toLocaleString('en-IN')} (${overrideItem.gym_name})`}
          size="md"
          footer={
            <>
              <Btn v="ghost" onClick={() => setOverrideItem(null)} disabled={submittingOverride}>
                Cancel
              </Btn>
              <Btn v="dark" onClick={handleConfirmOverride} disabled={submittingOverride}>
                {submittingOverride ? 'Saving Override...' : 'Confirm Override'}
              </Btn>
            </>
          }
        >
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Current Status:</span>
                <span className="font-semibold text-zinc-950 dark:text-white">{overrideItem.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Destination Account:</span>
                <span className="font-mono">{overrideItem.account_number_masked} ({overrideItem.ifsc_code})</span>
              </div>
              {overrideItem.failure_reason && (
                <div className="flex justify-between text-red-500">
                  <span>Recorded Failure:</span>
                  <span className="font-medium">{overrideItem.failure_reason}</span>
                </div>
              )}
            </div>

            <Field label="Override Action" id="ov-action">
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOverrideAction('MARK_SUCCESS')}
                  className={cx(
                    'p-3 rounded-xl border text-left text-xs transition-all',
                    overrideAction === 'MARK_SUCCESS'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon n="CheckCircle2" size={14} className="text-emerald-600" />
                    <span>Mark as SUCCESS</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-normal">
                    Disbursed manually or confirmed by bank. Keeps funds debited.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setOverrideAction('REVERT_TO_WALLET')}
                  className={cx(
                    'p-3 rounded-xl border text-left text-xs transition-all',
                    overrideAction === 'REVERT_TO_WALLET'
                      ? 'border-red-500 bg-red-50/60 dark:bg-red-950/30 text-red-900 dark:text-red-200 font-semibold'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon n="RotateCcw" size={14} className="text-red-600" />
                    <span>Revert to Wallet</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-normal">
                    Refunds amount back to gym's withdrawable balance via ledger.
                  </p>
                </button>
              </div>
            </Field>

            {overrideAction === 'MARK_SUCCESS' && (
              <Field label="Bank UTR / Transaction Reference" id="ov-utr" sub="Required for bank reconciliation">
                <input
                  id="ov-utr"
                  type="text"
                  placeholder="e.g. CMS123456789012"
                  value={overrideUtr}
                  onChange={(e) => setOverrideUtr(e.target.value)}
                  className={cx(inputCls, 'font-mono uppercase')}
                />
              </Field>
            )}

            <Field label="Override Reason" id="ov-reason" sub="Required for admin audit trail">
              <input
                id="ov-reason"
                type="text"
                placeholder="e.g. Cashfree webhook missed, verified via bank portal statement"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
export default WithdrawalManagement;
