import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Lock, 
  QrCode, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Smartphone,
  Building
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui-shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import QrCodeSvg from "@/components/QrCodeSvg";
import { client } from "@/api/client";
import { format } from "date-fns";

export default function ReversePennyDropWidget({ bankAccount, onAccountUpdated }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [rpdSession, setRpdSession] = useState(null); // { reference_id, qr_data, upi_intent, expires_in_seconds }
  const [timeLeft, setTimeLeft] = useState(300);
  const [pollError, setPollError] = useState("");
  const [verifyingStatus, setVerifyingStatus] = useState("idle"); // idle | polling | success | failed

  const pollIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Poll status while under admin review
  useEffect(() => {
    if (bankAccount?.verification_status === "needs_admin_review") {
      const reviewInterval = setInterval(async () => {
        try {
          const res = await client.bankAccount.get();
          if (res?.verification_status && res.verification_status !== "needs_admin_review") {
            clearInterval(reviewInterval);
            onAccountUpdated?.(res);
          }
        } catch (e) {
          console.warn("Background check review failed", e);
        }
      }, 5000);
      return () => clearInterval(reviewInterval);
    }
  }, [bankAccount?.verification_status, onAccountUpdated]);

  const handleStartRPD = async () => {
    setInitiating(true);
    setPollError("");
    setVerifyingStatus("polling");
    try {
      const data = await client.bankAccount.initiateRPD();
      setRpdSession(data);
      setTimeLeft(data.expires_in_seconds || 300);
      setDialogOpen(true);

      // Start 5-min countdown
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            clearInterval(pollIntervalRef.current);
            setVerifyingStatus("failed");
            setPollError("Verification session expired. Please try again.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start 3-second polling
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await client.bankAccount.rpdStatus();
          if (statusRes.status === "SUCCESS") {
            clearInterval(pollIntervalRef.current);
            clearInterval(timerIntervalRef.current);
            setVerifyingStatus("success");
            setTimeout(() => {
              setDialogOpen(false);
              onAccountUpdated?.(statusRes.bank_account);
            }, 1800);
          } else if (statusRes.status === "FAILED") {
            clearInterval(pollIntervalRef.current);
            clearInterval(timerIntervalRef.current);
            setVerifyingStatus("failed");
            setPollError(statusRes.bank_account?.failure_reason || "Verification payment failed or was declined.");
          }
        } catch (e) {
          console.warn("Error polling RPD status", e);
        }
      }, 3000);

    } catch (err) {
      console.error("Failed to initiate RPD", err);
      setPollError(err.message || "Failed to initiate UPI verification.");
    } finally {
      setInitiating(false);
    }
  };

  const handleCloseDialog = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setDialogOpen(false);
    setRpdSession(null);
    setVerifyingStatus("idle");
    setPollError("");
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // State 1: Loading
  if (!bankAccount) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs animate-pulse">
        <div className="h-6 w-1/3 bg-muted rounded mb-4" />
        <div className="h-4 w-2/3 bg-muted rounded" />
      </div>
    );
  }

  // State 2: KYC not verified
  if (bankAccount.kyc_status !== "verified") {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-5 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground text-sm">Payout Account Verification Locked</h3>
              <Badge variant="amber">KYC Pending</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Your gym onboarding and business documents are under verification by Fitaval Admin. 
              Bank account verification via UPI Reverse Penny Drop unlocks automatically as soon as your business KYC is approved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Verified & Locked
  if (bankAccount.verification_status === "verified") {
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-card p-6 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-sm">Verified Payout Account</h3>
                <Badge variant="green">Verified</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cashfree Reverse Penny Drop (RPD) Verified
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border border-border">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">Locked for Security</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Account Holder (at Bank)</span>
            <p className="font-semibold text-foreground">{bankAccount.name_at_bank || bankAccount.account_holder_name}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Account Number</span>
            <p className="font-mono font-bold text-foreground tracking-wide">
              {bankAccount.account_number_masked || "••••••••••••"}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">IFSC Code</span>
            <p className="font-mono font-semibold text-foreground">{bankAccount.ifsc_code || "—"}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Bank & Branch</span>
            <p className="font-medium text-foreground">
              {bankAccount.bank_name ? `${bankAccount.bank_name}${bankAccount.branch_name ? ` · ${bankAccount.branch_name}` : ""}` : "Verified Bank"}
            </p>
          </div>
          {bankAccount.upi_vpa && (
            <div className="space-y-1 md:col-span-2">
              <span className="text-xs text-muted-foreground">Verified UPI ID</span>
              <p className="font-mono text-xs text-foreground bg-muted/40 p-1.5 rounded border border-border inline-block">
                {bankAccount.upi_vpa}
              </p>
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground/80 mt-4 pt-3 border-t border-border flex items-center gap-1.5">
          <Lock className="w-3 h-3 shrink-0" />
          For your account security, verified payout bank details cannot be edited directly. To change your registered payout account, contact Fitaval Admin.
        </p>
      </div>
    );
  }

  // State 4: Needs Admin Review (Name partial match)
  if (bankAccount.verification_status === "needs_admin_review") {
    return (
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 p-5 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground text-sm">Payout Account Under Admin Review</h3>
              <Badge variant="blue">Under Review</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Your ₹1 UPI verification was received. The account name returned by your bank (
              <span className="font-semibold text-foreground">{bankAccount.name_at_bank || "Registered Name"}</span>
              ) is being reviewed against your business registration details by Fitaval Admin.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Withdrawals will become available automatically once approved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 5: Not initiated or Failed -> Show interactive Reverse Penny Drop initiation
  const isFailed = bankAccount.verification_status === "failed";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">Payout Bank Account</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instant ₹1 Reverse Penny Drop (RPD) via UPI
            </p>
          </div>
        </div>
        <Button 
          onClick={handleStartRPD} 
          disabled={initiating}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs h-10 px-4"
        >
          {initiating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 mr-2" />
              Verify Payout Account via UPI (₹1)
            </>
          )}
        </Button>
      </div>

      {isFailed && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 mb-4 flex items-center gap-3 text-xs text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Previous verification failed: {bankAccount.failure_reason || "Name mismatch or declined transaction."} Please try again.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
        <div className="flex items-start gap-2 bg-muted/40 p-3 rounded-xl border border-border">
          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
          <span>Click verify to generate a dynamic ₹1 UPI session</span>
        </div>
        <div className="flex items-start gap-2 bg-muted/40 p-3 rounded-xl border border-border">
          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
          <span>Pay ₹1 from your gym's official bank account app (GPay/PhonePe/Paytm)</span>
        </div>
        <div className="flex items-start gap-2 bg-muted/40 p-3 rounded-xl border border-border">
          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
          <span>Account verified instantly & ₹1 is refunded automatically</span>
        </div>
      </div>

      {/* RPD Interactive Modal */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Verify Bank via UPI (₹1)
            </DialogTitle>
            <DialogDescription>
              Pay ₹1 from your registered business bank account. Cashfree will capture your account details and automatically refund the ₹1.
            </DialogDescription>
          </DialogHeader>

          {verifyingStatus === "success" ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-lg text-foreground">Verification Successful!</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Your bank details have been verified and securely locked.
              </p>
            </div>
          ) : verifyingStatus === "failed" ? (
            <div className="py-6 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-base text-foreground">Verification Failed</h4>
              <p className="text-xs text-destructive mt-1 max-w-xs">{pollError}</p>
              <Button onClick={handleStartRPD} className="mt-4 rounded-xl text-xs">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-2 space-y-4">
              {/* QR Code Container */}
              {rpdSession?.qr_data ? (
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                  <QrCodeSvg value={rpdSession.qr_data} size={180} />
                </div>
              ) : (
                <div className="w-44 h-44 bg-muted animate-pulse rounded-2xl flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-muted-foreground" />
                </div>
              )}

              {/* Countdown and Status */}
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-primary">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Waiting for ₹1 UPI payment...</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Session expires in <span className="font-mono font-bold text-foreground">{formatTimer(timeLeft)}</span>
                </p>
              </div>

              {/* Direct UPI Intent Button (Mobile & Desktop) */}
              {rpdSession?.upi_intent && (
                <div className="w-full pt-2">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold h-11"
                  >
                    <a href={rpdSession.upi_intent} target="_blank" rel="noopener noreferrer">
                      <Smartphone className="w-4 h-4 mr-2" />
                      Pay ₹1 with installed UPI App
                    </a>
                  </Button>
                </div>
              )}

              <p className="text-[11px] text-center text-muted-foreground max-w-xs">
                Make sure you approve the ₹1 payment in your UPI app. The payment is refunded back to you after verification.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
