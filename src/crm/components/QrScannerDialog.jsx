import React, { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Camera, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { client } from "@/api/client";
import { normalizeQr } from "@/lib/qr";

const RESCAN_LOCK_MS = 2500;

/** Camera-only QR check-in scanner verified server-side against /crm/checkins/. */
export default function QrScannerDialog({ open, onOpenChange, members, onCheckedIn }) {
  const videoRef = useRef(null);
  const lockRef = useRef(0);
  const [camState, setCamState] = useState("idle"); // idle | starting | live | error
  const [camError, setCamError] = useState("");
  const [result, setResult] = useState(null); // { kind, member?, code, time?, message? }

  const handleCode = useCallback(
    async (raw) => {
      const code = normalizeQr(raw);
      if (!code || Date.now() < lockRef.current) return;
      lockRef.current = Date.now() + RESCAN_LOCK_MS;

      try {
        const res = await client.entities.MemberCheckin.create({ qr_token: code });
        const matched =
          members?.find((m) => String(m.id) === String(res.member_id)) || {
            id: res.member_id,
            name: res.member_name || "Member",
            plan_name: res.plan_name || "Active Plan",
          };

        setResult({
          kind: "ok",
          member: {
            ...matched,
            name: res.member_name || matched.name,
            plan_name: res.plan_name || matched.plan_name,
          },
          code,
          time: res.time || format(new Date(), "hh:mm a"),
        });
        onCheckedIn?.(matched);
      } catch (err) {
        const payload = err?.data || err?.response?.data || {};
        const errorCode = payload.error || "";
        const memberName = payload.member_name;
        const planName = payload.plan_name;
        const member = memberName
          ? { name: memberName, plan_name: planName || "", expiry_date: payload.end_date }
          : null;

        if (errorCode === "already_checked_in") {
          setResult({
            kind: "duplicate",
            member,
            code,
            time: payload.time || "",
            message: payload.message,
          });
          return;
        }
        if (errorCode === "subscription_finished" || errorCode === "membership_expired") {
          setResult({
            kind: "expired",
            member,
            code,
            message: payload.message || "Subscription finished. QR expired.",
          });
          return;
        }
        if (errorCode === "not_started") {
          setResult({
            kind: "not_started",
            member,
            code,
            message: payload.message || "Subscription has not started yet.",
          });
          return;
        }
        if (errorCode === "wrong_gym") {
          setResult({
            kind: "wrong_gym",
            code,
            message: payload.message || "This pass belongs to another gym.",
          });
          return;
        }

        setResult({
          kind: "unknown",
          code,
          message: payload.message || "QR code not recognised.",
        });
      }
    },
    [members, onCheckedIn]
  );

  // Camera lifecycle
  useEffect(() => {
    if (!open) return undefined;
    let stream = null;
    let raf = 0;
    let zxingControls = null;
    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamState("error");
        setCamError("Camera isn't available here (it needs HTTPS or localhost). Please try again.");
        return;
      }
      setCamState("starting");
      setCamError("");
      try {
        if ("BarcodeDetector" in window) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
          if (cancelled) return stream.getTracks().forEach((t) => t.stop());
          const video = videoRef.current;
          video.srcObject = stream;
          await video.play();
          setCamState("live");
          const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
          const tick = async () => {
            if (cancelled) return;
            try {
              const found = await detector.detect(video);
              if (found[0]?.rawValue) handleCode(found[0].rawValue);
            } catch {
              /* frame not ready */
            }
            raf = requestAnimationFrame(tick);
          };
          tick();
        } else {
          const { BrowserQRCodeReader } = await import("@zxing/browser");
          const reader = new BrowserQRCodeReader();
          zxingControls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: "environment" } }, audio: false },
            videoRef.current,
            (res) => res && handleCode(res.getText())
          );
          if (cancelled) zxingControls.stop();
          else setCamState("live");
        }
      } catch (e) {
        if (cancelled) return;
        setCamState("error");
        setCamError(
          e?.name === "NotAllowedError"
            ? "Camera permission was blocked. Allow it in the browser."
            : "Couldn't start the camera. Please try again."
        );
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
      setCamState("idle");
    };
  }, [open, handleCode]);

  useEffect(() => {
    if (!open) {
      setResult(null);
      lockRef.current = 0;
    }
  }, [open]);

  const tone = {
    ok: { Icon: CheckCircle2, box: "border-emerald-500/30 bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", title: "Checked in" },
    duplicate: { Icon: AlertTriangle, box: "border-amber-500/30 bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", title: "Already checked in today" },
    expired: { Icon: XCircle, box: "border-red-500/30 bg-red-500/10", text: "text-red-600 dark:text-red-400", title: "Subscription finished" },
    not_started: { Icon: AlertTriangle, box: "border-amber-500/30 bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", title: "Subscription not active yet" },
    wrong_gym: { Icon: XCircle, box: "border-red-500/30 bg-red-500/10", text: "text-red-600 dark:text-red-400", title: "Not valid at this gym" },
    unknown: { Icon: XCircle, box: "border-red-500/30 bg-red-500/10", text: "text-red-600 dark:text-red-400", title: "QR code not recognised" },
  }[result?.kind || "unknown"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan check-in QR code</DialogTitle>
          <DialogDescription>Point the camera at a member's active booking QR code.</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-950">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {camState === "live" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative aspect-square h-[70%] rounded-lg border-2 border-emerald-400/80">
                <div className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-emerald-400" />
              </div>
            </div>
          )}
          {camState !== "live" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white/70">
              <Camera className="h-8 w-8" />
              <p className="text-xs">{camState === "error" ? camError : "Starting camera…"}</p>
            </div>
          )}
        </div>

        {result && (
          <div className={`rounded-xl border p-3.5 ${tone.box}`} role="status">
            <div className={`flex items-center gap-2 text-sm font-bold ${tone.text}`}>
              <tone.Icon className="h-4 w-4" /> {tone.title}
            </div>
            {result.member ? (
              <div className="mt-1.5 text-sm text-foreground">
                <p className="font-semibold">{result.member.name}</p>
                <p className="text-xs text-muted-foreground">
                  {result.member.plan_name || "No plan"}
                  {result.kind === "ok" && result.time && ` · ${result.time}`}
                  {result.kind === "duplicate" && result.time && ` · first scan ${result.time}`}
                  {result.kind === "expired" && result.member.expiry_date &&
                    ` · finished ${format(new Date(result.member.expiry_date), "dd MMM yyyy")}`}
                </p>
                {result.message && result.kind !== "ok" && (
                  <p className="mt-1 text-xs text-muted-foreground">{result.message}</p>
                )}
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {result.message || result.code}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
