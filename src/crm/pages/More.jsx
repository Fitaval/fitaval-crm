import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Star,
  LogOut,
  Sun,
  Moon,
  Send,
  Search,
  Mail,
  Copy,
  Check,
  MessageSquare,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { SETTINGS_MENU_ITEMS, THEME_OPTIONS } from "@/data";

const menuItems = SETTINGS_MENU_ITEMS;

const RATING_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Excellent",
};

const FEEDBACK_TOPICS = [
  "Dashboard & Analytics",
  "Member Management",
  "Plans & Subscriptions",
  "Check-ins & Attendance",
  "Wallet & Payouts",
  "Staff & Trainers",
  "Feature Request",
  "Operational Support",
  "Bug Report",
];

const SUPPORT_FAQS = [
  {
    q: "How do I add or renew a member's subscription?",
    a: "Go to the Members tab, tap 'Add Member' to register a new member with a plan, or open an existing member's profile to renew or upgrade their active plan.",
  },
  {
    q: "How do member check-ins and attendance tracking work?",
    a: "Members can check in via the Fitaval mobile app QR scanner, or you can record manual check-ins directly from the Dashboard or Members view.",
  },
  {
    q: "How do wallet payouts and bank verification (RPD) work?",
    a: "Open Wallet from Settings or the sidebar to view your settled balance. Complete Reverse Penny Drop (RPD) bank verification once, then request withdrawals anytime to your verified bank account.",
  },
  {
    q: "How do I get the Fitaval Verified badge for my gym?",
    a: "Complete your Gym Profile details, upload your gym photos and KYC documents, and our Super Admin team will verify your gym. Once approved, the verified badge appears automatically.",
  },
  {
    q: "How do I manage trainers, front-desk staff, and branches?",
    a: "Navigate to Staff & Trainers in Settings to add trainers or staff members, assign specializations, and track their attendance.",
  },
  {
    q: "Where can I view platform commissions on member bookings?",
    a: "Visit Finance or Wallet to see the gross booking amount, platform commission breakdown, and net credit added to your gym wallet.",
  },
];

export default function More() {
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [faqQuery, setFaqQuery] = useState("");
  const [openFaqIdx, setOpenFaqIdx] = useState(0);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const { toast } = useToast();
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

  const toggleTopic = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const openFeedbackModal = (presetTopics = []) => {
    setRating(0);
    setHoverRating(0);
    setSelectedTopics(presetTopics);
    setFeedbackText("");
    setFeedbackOpen(true);
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!rating && selectedTopics.length === 0 && !feedbackText.trim()) {
      toast({
        title: "Add a rating or message",
        description: "Please select a star rating, choose a topic, or write your feedback.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingFeedback(true);
    try {
      await client.feedback.submit({
        rating: rating || null,
        selected_options: selectedTopics,
        text: feedbackText.trim(),
      });
      toast({
        title: "Thank you for your feedback!",
        description: "Your response has been shared with the Fitaval team.",
      });
      setFeedbackOpen(false);
      setRating(0);
      setSelectedTopics([]);
      setFeedbackText("");
    } catch (err) {
      toast({
        title: "Could not submit feedback",
        description: err?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleCopySupportEmail = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText("support@fitaval.com").catch(() => {});
    }
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
    toast({
      title: "Support email copied",
      description: "support@fitaval.com copied to clipboard.",
    });
  };

  const filteredFaqs = SUPPORT_FAQS.filter((item) => {
    const q = faqQuery.trim().toLowerCase();
    if (!q) return true;
    return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
  });

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
        <button
          type="button"
          onClick={() => openFeedbackModal()}
          className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border p-4 hover:border-primary/40 hover:shadow-xs transition-all active:scale-[0.99] touch-manipulation text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">Rate Fitaval</p>
            <p className="text-xs text-muted-foreground">Share your feedback</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>
        <button
          type="button"
          onClick={() => setSupportOpen(true)}
          className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border p-4 hover:border-primary/40 hover:shadow-xs transition-all active:scale-[0.99] touch-manipulation text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">Help & Support</p>
            <p className="text-xs text-muted-foreground">FAQs & operational assistance</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>
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

      {/* Rate Fitaval & Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="rounded-3xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Rate Fitaval CRM
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tell us how your experience has been. Your feedback goes directly to the Fitaval team.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitFeedback} className="space-y-4 pt-1">
            {/* Star Rating */}
            <div className="rounded-2xl bg-muted/40 border border-border p-4 text-center space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                How would you rate Fitaval CRM?
              </p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`Rate ${star} out of 5 stars`}
                      className="p-1.5 rounded-xl transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          active
                            ? "text-amber-500 fill-amber-500"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 min-h-[16px]">
                {(hoverRating || rating) ? RATING_LABELS[hoverRating || rating] : "Tap a star to rate"}
              </p>
            </div>

            {/* Topic Chips */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">
                What is your feedback about? <span className="text-muted-foreground font-normal">(optional)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {FEEDBACK_TOPICS.map((topic) => {
                  const selected = selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Written Note */}
            <div className="space-y-1.5">
              <label htmlFor="crm-feedback-text" className="text-xs font-semibold text-foreground block">
                Share your thoughts
              </label>
              <textarea
                id="crm-feedback-text"
                rows={4}
                maxLength={2000}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What's working well or what can we improve for your gym?"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFeedbackOpen(false)}
                className="flex-1 h-11 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingFeedback}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-60 transition-opacity"
              >
                <Send className="w-3.5 h-3.5" />
                {submittingFeedback ? "Sending..." : "Submit Feedback"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Help & Support Dialog */}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Help & Support
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Browse quick answers or reach out to Fitaval operational support.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Search FAQs */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={faqQuery}
                onChange={(e) => setFaqQuery(e.target.value)}
                placeholder="Search FAQs (e.g. payout, check-in, verified)..."
                className="w-full h-10 rounded-xl border border-border bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* FAQ Accordion */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Frequently Asked Questions
              </p>
              {filteredFaqs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
                  No matching FAQs found. Try sending a support request below.
                </p>
              ) : (
                filteredFaqs.map((item, idx) => {
                  const isOpen = openFaqIdx === idx;
                  return (
                    <div
                      key={item.q}
                      className="rounded-xl border border-border bg-card overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                        className="w-full flex items-center justify-between gap-3 p-3 text-left text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors"
                      >
                        <span>{item.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-3 pt-0.5 text-xs text-muted-foreground leading-relaxed border-t border-border/60">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Operational Assistance Card */}
            <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-3">
              <div>
                <p className="text-xs font-bold text-foreground">Need Operational Assistance?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Contact our partner support team or send a message directly from the CRM.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="mailto:support@fitaval.com?subject=Fitaval%20CRM%20Support%20Request"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  support@fitaval.com
                </a>
                <button
                  type="button"
                  onClick={handleCopySupportEmail}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  {copiedEmail ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  {copiedEmail ? "Copied" : "Copy Email"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSupportOpen(false);
                  openFeedbackModal(["Operational Support"]);
                }}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Send Support Request to Fitaval Team
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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