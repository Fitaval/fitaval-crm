import { Icon } from '../../../components/Icon';
import { Card } from '../../../components/ui/Card';
import { Locked } from '../../../components/ui/PageHead';
import { useApp } from '../../../context/AppContext';
import { cx, inr, fmtDate } from '../../../lib/utils';

export function GymWalletTab({ g }) {
  const { perms } = useApp();

  if (!perms.revenue)
    return (
      <Locked
        title="Wallet is restricted"
        text="Wallet balance and settlements are visible to Branch Managers and Super Admins. Switch the role preview to continue."
      />
    );

  const w = g.wallet || {};
  const withdrawableBalance = Number(w.withdrawable_balance ?? g.wallet_balance ?? 0);
  const pendingBalance = Number(w.pending_balance ?? 0);
  const totalBalance = withdrawableBalance + pendingBalance;
  const totalWithdrawn = Number(w.total_withdrawn ?? 0);
  const totalEarned = Number(w.total_earned ?? totalBalance + totalWithdrawn);
  const bank = w.bank_account || null;
  const withdrawals = Array.isArray(w.withdrawals) ? w.withdrawals : [];
  const walletTxns = Array.isArray(w.txns) ? w.txns : [];

  const isBankVerified = bank?.verification_status === 'verified';

  const statusTone = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'SUCCESS') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (s === 'FAILED') return 'bg-red-500/15 text-red-400 border-red-500/30';
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  };

  return (
    <div className="space-y-4">
      {/* Top 2 Balance Cards (matching Gym CRM Wallet) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Card 1: Withdrawable Balance */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 p-6 text-white shadow-xl border border-white/10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/15 text-white">
                  <Icon n="Wallet" size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
                    Available Funds
                  </p>
                  <p className="text-sm font-semibold text-white">Withdrawable Balance</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                Cleared
              </span>
            </div>

            <p className="mt-5 text-4xl font-extrabold tabular-nums tracking-tight text-white leading-none">
              {inr(withdrawableBalance)}
            </p>
            <p className="mt-2 text-xs text-white/60 leading-relaxed">
              Ready for immediate withdrawal to {g.name}&apos;s verified bank account.
            </p>
          </div>
        </div>

        {/* Card 2: Pending Balance (T+2) */}
        <Card className="rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Icon n="Clock" size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                    In Clearance
                  </p>
                  <p className="text-sm font-semibold">Pending Balance (T+2)</p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-400">
                T+2 Cycle
              </span>
            </div>

            <p className="text-4xl font-extrabold tabular-nums tracking-tight leading-none">
              {inr(pendingBalance)}
            </p>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Requested withdrawals currently in processing / 2-day bank settlement window.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
            <span>Total Gym Balance:</span>
            <span className="font-bold font-mono text-white">{inr(totalBalance)}</span>
          </div>
        </Card>
      </div>

      {/* Payout Bank Account Status */}
      <Card className="rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Icon n="Building" size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold">Payout Bank Account</p>
              <p className="text-xs text-zinc-400">
                {bank && bank.account_number_masked
                  ? `${bank.bank_name || 'Bank'} · ${bank.account_number_masked} · ${bank.ifsc_code || ''}`
                  : 'No verified bank account linked yet'}
              </p>
            </div>
          </div>
          <span
            className={cx(
              'rounded-full border px-3 py-1 text-xs font-semibold',
              isBankVerified
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            )}
          >
            {isBankVerified ? 'Verified & Locked' : (bank?.verification_status || 'Not Initiated').replace(/_/g, ' ')}
          </span>
        </div>
      </Card>

      {/* Stats Summary (matching Gym CRM Wallet) */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Icon n="TrendingUp" size={18} />
            </span>
            <span className="text-[11px] font-medium text-zinc-400">All-time net share</span>
          </div>
          <p className="mt-3 text-xs text-zinc-400">Total Revenue Share</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums">{inr(totalEarned)}</p>
        </Card>

        <Card className="rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
              <Icon n="Download" size={18} />
            </span>
            <span className="text-[11px] font-medium text-zinc-400">
              {withdrawals.filter((x) => x.status === 'SUCCESS').length} payouts
            </span>
          </div>
          <p className="mt-3 text-xs text-zinc-400">Total Withdrawn to Date</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums">{inr(totalWithdrawn)}</p>
        </Card>
      </div>

      {/* Withdrawal History */}
      <Card className="rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Withdrawal History</h2>
          <span className="text-xs text-zinc-400 tabular-nums">{withdrawals.length} requests</span>
        </div>
        <ul className="mt-4 divide-y divide-white/10">
          {withdrawals.map((req) => (
            <li key={req.id} className="flex items-center justify-between gap-4 py-3.5">
              <div>
                <p className="text-sm font-medium">{inr(req.amount)}</p>
                <p className="mt-0.5 text-xs text-zinc-400 tabular-nums">
                  {fmtDate(req.date)} {req.bank_utr ? `· UTR: ${req.bank_utr}` : ''}
                </p>
              </div>
              <span className={cx('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', statusTone(req.status))}>
                {req.status}
              </span>
            </li>
          ))}
          {!withdrawals.length && (
            <li className="py-6 text-center text-sm text-zinc-500">No withdrawal requests yet.</li>
          )}
        </ul>
      </Card>

      {/* Wallet Transactions */}
      <Card className="rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Transaction History</h2>
          <span className="text-xs text-zinc-400 tabular-nums">{walletTxns.length} records</span>
        </div>
        <ul className="mt-4 divide-y divide-white/10">
          {walletTxns.map((t) => {
            const cr = t.type === 'credit';
            return (
              <li key={t.id} className="flex items-center gap-4 py-3.5">
                <span
                  className={cx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    cr ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                  )}
                >
                  <Icon n={cr ? 'ArrowDownLeft' : 'ArrowUpRight'} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t.description}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-zinc-400">{fmtDate(t.date)}</p>
                </div>
                <p className={cx('shrink-0 text-sm font-semibold tabular-nums', cr ? 'text-emerald-400' : 'text-red-400')}>
                  {cr ? '+' : '-'}
                  {inr(t.amount)}
                </p>
              </li>
            );
          })}
          {!walletTxns.length && (
            <li className="py-6 text-center text-sm text-zinc-500">No wallet transactions yet.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
