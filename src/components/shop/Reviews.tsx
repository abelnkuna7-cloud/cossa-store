import { MessageCircle, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SITE, whatsappLink } from "@/config/site";
import {
  reviewsForCategory,
  reviewsForSku,
  summarise,
  type ProductReview,
} from "@/data/reviews";
import { trackEvent } from "@/lib/analytics";

export function RatingStars({
  value,
  size = "sm",
  className = "",
}: {
  value: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const dimension = size === "md" ? "h-4.5 w-4.5" : "h-3.5 w-3.5";
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${dimension} ${
            i <= Math.round(value) ? "fill-primary text-primary" : "text-muted-foreground/40"
          }`}
        />
      ))}
    </span>
  );
}

/** Compact inline rating used on product cards and listings. */
export function RatingInline({ sku }: { sku: string }) {
  const summary = summarise(reviewsForSku(sku));
  if (summary.count === 0) {
    return <span className="text-[11px] text-muted-foreground">No reviews yet</span>;
  }
  return (
    <span className="flex items-center gap-1.5">
      <RatingStars value={summary.average} />
      <span className="text-[11px] text-muted-foreground">
        {summary.average.toFixed(1)} ({summary.count})
      </span>
    </span>
  );
}

function ReviewCard({ review }: { review: ProductReview }) {
  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <RatingStars value={review.rating} />
        <time className="text-[11px] text-muted-foreground" dateTime={review.date}>
          {new Date(review.date).toLocaleDateString("en-ZA", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </time>
      </div>
      <h4 className="mt-3 text-sm font-semibold">{review.title}</h4>
      <p className="mt-1.5 text-sm text-muted-foreground">{review.body}</p>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {review.author}
        {review.location ? ` · ${review.location}` : ""}
        {review.verified_purchase ? " · Verified purchase" : ""}
      </p>
    </article>
  );
}

function ReviewsShell({
  heading,
  reviews,
  subject,
}: {
  heading: string;
  reviews: ProductReview[];
  subject: string;
}) {
  const summary = summarise(reviews);

  return (
    <section className="mt-12 border-t border-border pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold sm:text-2xl">{heading}</h2>
          {summary.count > 0 ? (
            <div className="mt-2 flex items-center gap-2">
              <RatingStars value={summary.average} size="md" />
              <span className="text-sm font-medium">{summary.average.toFixed(1)} out of 5</span>
              <span className="text-sm text-muted-foreground">
                · {summary.count} review{summary.count === 1 ? "" : "s"}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Reviews are published exactly as customers write them. We do not post reviews we
              cannot verify, so this section stays empty until real feedback comes in.
            </p>
          )}
        </div>
        <Button asChild variant="outline" size="sm">
          <a
            href={whatsappLink(`Hello Cossa Store, I would like to leave a review for ${subject}.`)}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent("whatsapp_opened", { trigger: "review_submit" })}
          >
            <MessageCircle className="mr-2 h-4 w-4" /> Leave a review
          </a>
        </Button>
      </div>

      {summary.count > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-[240px_1fr]">
          <div className="h-fit rounded-lg border border-border bg-card p-5">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.distribution[star as 1 | 2 | 3 | 4 | 5];
              const pct = summary.count ? (n / summary.count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 py-1 text-xs">
                  <span className="w-8 text-muted-foreground">{star}★</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-6 text-right text-muted-foreground">{n}</span>
                </div>
              );
            })}
          </div>
          <div className="grid gap-4">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
          <Star className="mx-auto h-6 w-6 text-primary" aria-hidden />
          <h3 className="mt-3 text-sm font-semibold">No verified reviews yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Bought this already? Send your honest feedback on WhatsApp to {SITE.phoneDisplay} and we
            will publish it here — good or bad, unedited.
          </p>
        </div>
      )}
    </section>
  );
}

export function ProductReviews({ sku, name }: { sku: string; name: string }) {
  return (
    <ReviewsShell heading="Customer reviews" reviews={reviewsForSku(sku)} subject={name} />
  );
}

export function CategoryReviews({ category, name }: { category: string; name: string }) {
  return (
    <ReviewsShell
      heading={`What customers say about ${name}`}
      reviews={reviewsForCategory(category)}
      subject={name}
    />
  );
}
