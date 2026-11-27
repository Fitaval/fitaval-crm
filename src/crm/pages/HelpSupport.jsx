import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  Mail,
  Copy,
  Check,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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

export default function HelpSupport() {
  const [faqQuery, setFaqQuery] = useState("");
  const [openFaqIdx, setOpenFaqIdx] = useState(0);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const { toast } = useToast();

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
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* App-style Top Back Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/settings"
          className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors shrink-0 active:scale-95 touch-manipulation"
          aria-label="Back to Settings"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
            Help & Support
          </h1>
          <p className="text-xs text-muted-foreground">
            FAQs & operational assistance for your gym
          </p>
        </div>
      </div>

      {/* Search FAQs */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={faqQuery}
          onChange={(e) => setFaqQuery(e.target.value)}
          placeholder="Search FAQs (e.g. payout, check-in, verified)..."
          className="w-full h-11 rounded-2xl border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
        />
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
          Frequently Asked Questions
        </p>

        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center space-y-2">
            <HelpCircle className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No matching FAQs found</p>
            <p className="text-xs text-muted-foreground">
              Try a different keyword or send a direct support request below.
            </p>
          </div>
        ) : (
          filteredFaqs.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={item.q}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors touch-manipulation"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/60">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Operational Assistance Card */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div>
          <p className="text-sm font-bold text-foreground">Need Operational Assistance?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Contact our partner support team or send a message directly from the CRM.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="mailto:support@fitaval.com?subject=Fitaval%20CRM%20Support%20Request"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors touch-manipulation"
          >
            <Mail className="w-4 h-4 text-primary" />
            support@fitaval.com
          </a>
          <button
            type="button"
            onClick={handleCopySupportEmail}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors touch-manipulation"
          >
            {copiedEmail ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
            {copiedEmail ? "Copied" : "Copy Email"}
          </button>
        </div>
        <Link
          to="/rate-fitaval?topic=Operational+Support"
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity active:scale-[0.99] touch-manipulation"
        >
          <MessageSquare className="w-4 h-4" />
          Send Support Request to Fitaval Team
        </Link>
      </div>
    </div>
  );
}
