import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  HelpCircle,
  Star,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { PageHeader } from "@/components/ui-shared";
import { client } from "@/api/client";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/AuthContext";
import { getSession } from "../../portal/session";
import VerifiedTick from "../../shared/VerifiedTick";
import { useVerified, setVerified, isVerified, CRM_GYM_ID } from "../../shared/verified";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SETTINGS_MENU_ITEMS, THEME_OPTIONS } from "@/data";

const menuItems = SETTINGS_MENU_ITEMS;

export default function More() {
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user } = useAuth() || {};
  const session = getSession();
  const [profile, setProfile] = useState(null);

  const loadProfile = () => {
    client.entities.GymProfile.list("-created_date", 1)
      .then((list) => {
        if (list && list.length > 0) {
          const item = list[0];
          setProfile(item);
          const flag = Boolean(item.is_verified ?? item.verified);
          setVerified(item.id, flag, false);
          if (item.registration_number) setVerified(item.registration_number, flag, false);
          if (item.code) setVerified(item.code, flag, false);
          setVerified(CRM_GYM_ID, flag, false);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadProfile();

    const handleVerifiedChange = (e) => {
      const flag = e?.detail?.verified;
      if (typeof flag === "boolean") {
        setProfile((prev) => (prev ? { ...prev, is_verified: flag, verified: flag } : prev));
      }
    };

    const handleStorage = (e) => {
      if (e.key === "fitaval_verified_gyms") {
        const v = isVerified(CRM_GYM_ID);
        setProfile((prev) => (prev ? { ...prev, is_verified: v, verified: v } : prev));
      }
    };

    window.addEventListener("fitaval-verified-change", handleVerifiedChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("fitaval-verified-change", handleVerifiedChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const ownerName =
    user?.full_name ||
    user?.name ||
    session?.user?.owner_name ||
    session?.user?.full_name ||
    session?.user?.name ||
    session?.owner_name ||
    session?.name ||
    profile?.owner_name ||
    "Gym Owner";

  const ownerEmail =
    user?.email ||
    session?.user?.email ||
    session?.email ||
    profile?.email ||
    "owner@fitaval.com";

  const initials = (ownerName || "GY")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2) || "GY";

  const localVerified = useVerified(profile?.id || CRM_GYM_ID);
  const isVerified = profile != null
    ? Boolean(profile.is_verified ?? profile.verified)
    : localVerified;

  const handleLogout = () => {
    client.auth.logout("/login");
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Gym profile, plans, wallet & preferences" />

      {/* Profile summary card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-5 shadow-sm border border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-xl font-bold shadow-xs shrink-0 overflow-hidden">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt={ownerName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-lg text-white leading-tight">{ownerName}</p>
              {isVerified && <VerifiedTick size={18} />}
            </div>
            <p className="text-white/70 text-xs mt-0.5 truncate">{ownerEmail}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/10 w-fit px-2.5 py-0.5 rounded-full text-[11px] font-medium text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Gym Owner</span>
              </div>
              {(profile?.name || session?.user?.gym_name || session?.gym_name) && (
                <span className="text-[11px] text-white/60 truncate">
                  {profile?.name || session?.user?.gym_name || session?.gym_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Theme & Display Mode (Dark & White Mode) */}
      <div className="space-y-2.5">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground px-1">
          Appearance & Theme
        </p>
        <div className="rounded-2xl bg-card border border-border p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {resolvedTheme === "dark" ? (
                  <Moon className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">Theme Mode</p>
                <p className="text-xs text-muted-foreground">
                  Currently active: <span className="font-semibold text-primary capitalize">{resolvedTheme}</span> mode
                </p>
              </div>
            </div>
          </div>

          {/* Theme segmented control */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all touch-manipulation ${
                    isSelected
                      ? opt.id === "dark"
                        ? "bg-slate-900 text-white border-slate-700 shadow-xs ring-2 ring-emerald-500/40"
                        : "bg-primary text-white border-primary shadow-xs"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Primary Management Menu */}
      <div className="space-y-2.5">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground px-1">
          Gym Configuration
        </p>
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4 hover:border-primary/40 hover:shadow-xs transition-all active:scale-[0.99] touch-manipulation"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
              <item.icon className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>

      {/* Secondary Menu */}
      <div className="space-y-2.5 pt-1">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground px-1">
          Support & Feedback
        </p>
        <Link
          to="/rate-fitaval"
          className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4 hover:border-primary/40 hover:shadow-xs transition-all active:scale-[0.99] touch-manipulation"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Rate Fitaval</p>
            <p className="text-xs text-muted-foreground truncate">Share your feedback</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </Link>
        <Link
          to="/help-support"
          className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4 hover:border-primary/40 hover:shadow-xs transition-all active:scale-[0.99] touch-manipulation"
        >
          <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Help & Support</p>
            <p className="text-xs text-muted-foreground truncate">FAQs & operational assistance</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </Link>
      </div>

      {/* Session / Logout Action (Displayed on mobile; desktop uses sidebar logout) */}
      <div className="space-y-2.5 pt-2 lg:hidden">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground px-1">
          Session
        </p>
        <button
          type="button"
          onClick={() => setLogoutModalOpen(true)}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-card border border-red-200 dark:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/30 text-red-600 transition-colors shadow-xs active:scale-[0.99] touch-manipulation text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-sm text-red-600">Log Out</p>
              <p className="text-xs text-red-500/80">End your current session safely</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-red-400" />
        </button>
      </div>

      {/* Logout confirmation alert dialog */}
      <AlertDialog open={logoutModalOpen} onOpenChange={setLogoutModalOpen}>
        <AlertDialogContent className="rounded-3xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Log out of Fitaval CRM?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              You will need to enter your credentials to access gym records again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 mt-2">
            <AlertDialogCancel className="flex-1 rounded-xl h-11 text-xs font-semibold m-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="flex-1 rounded-xl h-11 text-xs font-bold bg-red-600 text-white hover:bg-red-700 m-0"
            >
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="text-center text-[11px] text-muted-foreground pt-3">
        Fitaval Gym CRM • Version 1.2.0
      </p>
    </div>
  );
}