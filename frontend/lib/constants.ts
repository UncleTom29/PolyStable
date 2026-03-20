export const MIN_COLLATERAL_RATIO   = 150;
export const SAFE_COLLATERAL_RATIO  = 175;
export const LIQUIDATION_WARNING_RATIO = 125;
export const MAX_RATIO_DISPLAY      = 250;
export const LIQUIDATION_REFRESH_MS = 15_000;

export type ProposalTone = "neutral" | "success" | "warning" | "danger" | "info";

export const PROPOSAL_STATE_LABELS: Record<number, string> = {
  0: "Pending",  1: "Active",   2: "Canceled",
  3: "Defeated", 4: "Succeeded", 5: "Queued",
  6: "Expired",  7: "Executed",
};

export const PROPOSAL_STATE_TONES: Record<number, ProposalTone> = {
  0: "neutral", 1: "success", 2: "neutral",
  3: "danger",  4: "info",    5: "warning",
  6: "neutral", 7: "success",
};