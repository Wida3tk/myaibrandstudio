export interface UsageSummary {
  tokensUsedToday: number;
}

export interface BudgetConfig {
  dailyTokenLimit: number;
}

// Deliberately simple for v1: one daily token ceiling per org. The caller (index.ts) computes
// UsageSummary by summing today's /usage/{orgId}/{yyyymm} records via the Admin SDK — this
// function only decides, given that total, whether another generation call is allowed.
export function isWithinBudget(
  usage: UsageSummary,
  config: BudgetConfig,
): boolean {
  return usage.tokensUsedToday < config.dailyTokenLimit;
}
