import React, { useEffect, useState, useMemo, useCallback } from "react";
import { client } from "@/api/client";
import { 
  Wallet as WalletIcon, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Download, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  ShieldCheck,
  RefreshCw,
  Building
} from "lucide-react";
import { EmptyState, PageHeader, Badge } from "@/components/ui-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import ReversePennyDropWidget from "@/components/ReversePennyDropWidget";
import { format } from "date-fns";

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [bankAccount, setBankAccount] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Withdraw Modal State
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");

  const loadAllData = useCallback(async () => {
    try {
      const [walletRes, bankRes, withdrawalsRes] = await Promise.allSettled([
        client.wallet.get(),
        client.bankAccount.get(),
        client.wallet.withdrawals(),
      ]);

      if (walletRes.status === "fulfilled" && walletRes.value) {
        setWallet(walletRes.value);
      }
      if (bankRes.status === "fulfilled" && bankRes.value) {
        setBankAccount(bankRes.value);
      }
      if (withdrawalsRes.status === "fulfilled" && Array.isArray(withdrawalsRes.value)) {
        setWithdrawals(withdrawalsRes.value);
      }
    } catch (e) {
      console.error("Failed to load wallet dashboard data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const withdrawableBalance = useMemo(() => {
    return parseFloat(wallet?.withdrawable_balance || "0");
  }, [wallet]);

  const pendingBalance = useMemo(() => {
    return parseFloat(wallet?.pending_balance || "0");
  }, [wallet]);

  const totalBalance = useMemo(() => {
    return withdrawableBalance + pendingBalance;
  }, [withdrawableBalance, pendingBalance]);

  const totalWithdrawn = useMemo(() => {
    return withdrawals
      .filter((w) => w.status === "SUCCESS")
      .reduce((sum, w) => sum + parseFloat(w.amount || "0"), 0);
  }, [withdrawals]);

  const isBankVerified = bankAccount?.verification_status === "verified";
  const canWithdraw = isBankVerified && withdrawableBalance > 0;

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccess("");

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setWithdrawError("Please enter a valid amount greater than ₹0.");
      return;
    }
    if (amountNum > withdrawableBalance) {
      setWithdrawError(`Requested amount exceeds available balance (₹${withdrawableBalance.toLocaleString("en-IN")}).`);
      return;
    }

    setSubmittingWithdraw(true);
    try {
      const res = await client.wallet.withdraw(amountNum);
      setWithdrawSuccess("Withdrawal request initiated successfully!");
      setWithdrawAmount("");
      // Reload wallet & withdrawals
      await loadAllData();
      setTimeout(() => {
        setWithdrawOpen(false);
        setWithdrawSuccess("");
      }, 1500);
    } catch (err) {
      console.error("Withdrawal error", err);
      setWithdrawError(err.message || "Failed to process withdrawal request.");
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "SUCCESS":
        return <Badge variant="green">Success</Badge>;
      case "PROCESSING":
        return <Badge variant="blue">Processing</Badge>;
      case "INITIATED":
        return <Badge variant="amber">Initiated</Badge>;
      case "FAILED":
        return <Badge variant="red">Failed</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  if (loading && !wallet) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Fitaval Wallet"
        subtitle="Manage B2C revenues, settlements, payout account, and withdrawals"
        backTo="/settings"
      />

      {/* Primary Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Withdrawable Balance */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-6 relative overflow-hidden border border-slate-800/80 shadow-xl flex flex-col justify-between">
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                  <WalletIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white/50 text-[11px] uppercase tracking-widest font-semibold">Available Funds</p>
                  <p className="text-white/90 text-sm font-medium">Withdrawable Balance</p>
                </div>
              </div>
              <Badge variant="green">Cleared</Badge>
            </div>

            <p className="text-4xl font-extrabold tracking-tight leading-none tabular-nums text-emerald-400">
              ₹{withdrawableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-white/45 text-xs mt-2">
              Ready for immediate withdrawal to your verified bank account.
            </p>
          </div>

          <div className="relative pt-6">
            <div className="border-t border-white/10 pt-4">
              <Button
                disabled={!canWithdraw}
                onClick={() => setWithdrawOpen(true)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 font-semibold rounded-xl disabled:opacity-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Withdraw to Bank
              </Button>
              {!isBankVerified && (
                <p className="text-[11px] text-amber-400/90 text-center mt-2 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Verify payout bank account below to enable withdrawals
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Pending Balance */}
        <div className="rounded-3xl bg-card border border-border p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-widest font-semibold">In Clearance</p>
                  <p className="font-semibold text-foreground text-sm">Pending Balance (T+2)</p>
                </div>
              </div>
              <Badge variant="amber">T+2 Cycle</Badge>
            </div>

            <p className="text-4xl font-extrabold tracking-tight leading-none tabular-nums text-foreground">
              ₹{pendingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-muted-foreground text-xs mt-2 leading-relaxed">
              Requested withdrawals currently in processing / 2-day bank settlement window.
            </p>
          </div>

          <div className="pt-6 border-t border-border mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total Gym Balance:</span>
              <span className="font-bold text-foreground font-mono">
                ₹{totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reverse Penny Drop Widget for Bank Account Verification */}
      <ReversePennyDropWidget
        bankAccount={bankAccount}
        onAccountUpdated={(updatedAcc) => {
          setBankAccount(updatedAcc);
          loadAllData();
        }}
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-card border border-border p-5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-emerald-950/40 text-green-600 dark:text-emerald-400 flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-xs text-muted-foreground">Total Revenue Share</p>
          <p className="font-bold text-foreground text-lg tabular-nums mt-0.5">
            ₹{(totalBalance + totalWithdrawn).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-2">
            <Download className="w-5 h-5" />
          </div>
          <p className="text-xs text-muted-foreground">Total Withdrawn to Date</p>
          <p className="font-bold text-foreground text-lg tabular-nums mt-0.5">
            ₹{totalWithdrawn.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Withdrawal History Table */}
      <div className="rounded-2xl bg-card border border-border p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-foreground text-base">Withdrawal History</h3>
            <p className="text-xs text-muted-foreground">Track all payout requests and bank settlements</p>
          </div>
          <Button variant="ghost" size="sm" onClick={loadAllData} className="h-8 gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>

        {withdrawals.length === 0 ? (
          <EmptyState
            icon={Download}
            title="No withdrawals requested yet"
            description="When you withdraw funds to your bank account, they will appear here with real-time status."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Bank Account</th>
                  <th className="pb-3 font-semibold">Bank Reference / UTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {w.created_at ? format(new Date(w.created_at), "dd MMM yyyy, hh:mm a") : "—"}
                    </td>
                    <td className="py-3 font-bold text-foreground tabular-nums whitespace-nowrap">
                      ₹{parseFloat(w.amount || "0").toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      {getStatusBadge(w.status)}
                      {w.failure_reason && (
                        <p className="text-[11px] text-destructive mt-0.5 max-w-xs truncate" title={w.failure_reason}>
                          {w.failure_reason}
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {w.account_number_masked || bankAccount?.account_number_masked || "••••••••"}
                    </td>
                    <td className="py-3 text-xs text-foreground font-mono whitespace-nowrap">
                      {w.bank_utr ? (
                        <span className="bg-muted px-2 py-0.5 rounded">{w.bank_utr}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Pending bank UTR</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Withdraw Funds
            </DialogTitle>
            <DialogDescription>
              Transfer available balance directly to your verified bank account.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleWithdrawSubmit} className="space-y-4 pt-2">
            {/* Account Card */}
            <div className="bg-muted/50 rounded-xl p-3 border border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Building className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-foreground">{bankAccount?.bank_name || "Verified Bank"}</p>
                  <p className="font-mono text-muted-foreground">{bankAccount?.account_number_masked}</p>
                </div>
              </div>
              <Badge variant="green">Verified</Badge>
            </div>

            {/* Balance banner */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Available to withdraw:</span>
              <span className="font-bold text-foreground font-mono">
                ₹{withdrawableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <label htmlFor="withdraw-amt" className="text-xs font-semibold text-foreground">
                Amount (₹)
              </label>
              <Input
                id="withdraw-amt"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={submittingWithdraw}
                className="text-lg font-bold font-mono"
              />
              {/* Quick Chips */}
              <div className="flex gap-2 pt-1">
                {[500, 1000, 5000].map((val) => (
                  <Button
                    key={val}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs rounded-lg px-2.5"
                    disabled={val > withdrawableBalance}
                    onClick={() => setWithdrawAmount(val.toString())}
                  >
                    ₹{val}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs rounded-lg px-2.5 text-primary font-semibold"
                  onClick={() => setWithdrawAmount(withdrawableBalance.toString())}
                >
                  Max
                </Button>
              </div>
            </div>

            {withdrawError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            {withdrawSuccess && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{withdrawSuccess}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setWithdrawOpen(false)}
                disabled={submittingWithdraw}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingWithdraw || !withdrawAmount}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {submittingWithdraw ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Withdrawal"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
