import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Star, Send, CheckCircle2, Clock } from "lucide-react";
import { client } from "@/api/client";
import { useToast } from "@/components/ui/use-toast";

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

export default function RateFitaval() {
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get("topic");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTopics, setSelectedTopics] = useState(() =>
    initialTopic && FEEDBACK_TOPICS.includes(initialTopic) ? [initialTopic] : []
  );
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState([]);
  const { toast } = useToast();

  const loadHistory = () => {
    client.feedback
      .list()
      .then((res) => {
        setHistory(Array.isArray(res) ? res : []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const toggleTopic = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating && selectedTopics.length === 0 && !feedbackText.trim()) {
      toast({
        title: "Add a rating or message",
        description: "Please select a star rating, choose a topic, or write your feedback.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
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
      setSubmitted(true);
      setRating(0);
      setHoverRating(0);
      setSelectedTopics([]);
      setFeedbackText("");
      loadHistory();
    } catch (err) {
      toast({
        title: "Could not submit feedback",
        description: err?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
            Rate Fitaval
          </h1>
          <p className="text-xs text-muted-foreground">
            Share your experience or request a feature for your gym
          </p>
        </div>
      </div>

      {submitted && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Feedback submitted</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Thank you! Our team reviews every CRM rating and message in the Admin Panel.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Send another
          </button>
        </div>
      )}

      {/* Feedback Form Card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-card border border-border p-4 sm:p-6 shadow-xs space-y-5"
      >
        {/* Star Rating */}
        <div className="rounded-2xl bg-muted/40 border border-border p-5 text-center space-y-2.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            How would you rate Fitaval CRM?
          </p>
          <div className="flex items-center justify-center gap-2 sm:gap-3">
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
                  className="p-1.5 rounded-xl transition-transform hover:scale-110 active:scale-95 touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <Star
                    className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors ${
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
        <div className="space-y-2.5">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground">
            What is your feedback about?{" "}
            <span className="font-normal normal-case">(optional)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_TOPICS.map((topic) => {
              const selected = selectedTopics.includes(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold border transition-colors touch-manipulation active:scale-95 ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
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
        <div className="space-y-2">
          <label htmlFor="crm-feedback-text" className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Share your thoughts
          </label>
          <textarea
            id="crm-feedback-text"
            rows={5}
            maxLength={2000}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what's working well or what we can improve for your gym..."
            className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <p className="text-[11px] text-muted-foreground text-right tabular-nums">
            {feedbackText.length}/2000
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-60 transition-opacity active:scale-[0.99] touch-manipulation"
        >
          <Send className="w-4 h-4" />
          {submitting ? "Sending Feedback..." : "Submit Feedback"}
        </button>
      </form>

      {/* Previous Submissions */}
      {history.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            Your Recent Feedback
          </p>
          <div className="space-y-2.5">
            {history.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-card border border-border p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {item.rating ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-500">
                        {"★".repeat(item.rating)} {item.rating}/5
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">Feedback</span>
                    )}
                  </div>
                  {item.created_at && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                      <Clock className="w-3 h-3" />
                      {item.created_at.slice(0, 10)}
                    </span>
                  )}
                </div>
                {(item.selected_options || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.selected_options.map((opt) => (
                      <span
                        key={opt}
                        className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-medium"
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
                {item.text && (
                  <p className="text-xs text-foreground leading-relaxed">{item.text}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
