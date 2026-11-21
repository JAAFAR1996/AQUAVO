type LearningCandidate = {
  applied: boolean | null;
  rule?: string | null;
  correctedBehavior?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function isReviewedLearning(learning: LearningCandidate): boolean {
  return learning.applied === true && learning.metadata?.reviewStatus === "approved"
    && typeof learning.metadata.reviewedBy === "string" && learning.metadata.reviewedBy.length > 0
    && typeof learning.metadata.reviewedAt === "string" && learning.metadata.reviewedAt.length > 0;
}

/** Historical auto-applied records remain inert until an administrator reviews them. */
export function renderReviewedLearnings(learnings: LearningCandidate[]): string {
  const rules = learnings.filter(isReviewedLearning)
    .map(learning => (learning.rule || learning.correctedBehavior || "").trim().slice(0, 2000))
    .filter(Boolean).slice(0, 20);
  // Original customer messages never become instructions or cross-user context.
  return rules.length ? `\n\n[قواعد راجعها مسؤول المتجر]\n${rules.map(rule => `- ${rule}`).join("\n")}` : "";
}
