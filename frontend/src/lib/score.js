export const scoreTier = (score) => {
  if (score >= 70) return "healthy";
  if (score >= 40) return "moderate";
  return "critical";
};

export const scoreColor = (score) => {
  const s = scoreTier(score);
  if (s === "healthy") return "#10B981";
  if (s === "moderate") return "#F59E0B";
  return "#EF4444";
};

export const scoreLabel = (score) => {
  const s = scoreTier(score);
  if (s === "healthy") return "Healthy";
  if (s === "moderate") return "At Risk";
  return "Critical";
};

export const tierStyles = {
  healthy: { text: "#6EE7B7", bg: "#064E3B", border: "#047857" },
  moderate: { text: "#FDE047", bg: "#422006", border: "#854D0E" },
  critical: { text: "#FCA5A5", bg: "#450A0A", border: "#991B1B" },
};
