export interface SubscriptionItem {
  id: string;
  name: string;
  category: "HEALTH" | "BRAIN_TRAINING" | "FAMILY" | "ENTERTAINMENT" | "NEWS_PUZZLES";
  monthlyPrice: number;
  currency: string;
  isTrial: boolean;
  trialExpiresInDays: number | null; // null if not trial
  trialEndDate: string | null;
  renewalDate: string;
  status: "ACTIVE" | "EXPIRING_TRIAL" | "CANCELLED" | "AUTO_RENEW_BLOCKED";
  billingProvider: string;
  cancellationUrl?: string;
  cancellationPhone?: string;
  notes: string;
}

export interface SubTrackReport {
  activeSubscriptionsCount: number;
  expiringTrialsCount: number;
  totalMonthlySpend: number;
  potentialMonthlySavings: number;
  timeframeDaysChecked: number;
  subscriptions: SubscriptionItem[];
  expiringTrials: SubscriptionItem[];
  alexaVoiceSummary: string;
  actionRecommendations: string[];
  queriedAt: string;
}

export interface CancelAlertResult {
  success: boolean;
  subscriptionId: string;
  subscriptionName: string;
  monthlyAmountSaved: number;
  status: "CANCELLED" | "AUTO_RENEW_BLOCKED";
  effectiveDate: string;
  alexaVoiceConfirmation: string;
  instructions: string;
}

// Default realistic sample database reflecting common elder-targeted subscriptions & free-trial traps
const INITIAL_SUBSCRIPTIONS: SubscriptionItem[] = [
  {
    id: "sub-bg-101",
    name: "BrainGym Memory Pro",
    category: "BRAIN_TRAINING",
    monthlyPrice: 29.99,
    currency: "USD",
    isTrial: true,
    trialExpiresInDays: 2,
    trialEndDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
    renewalDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
    status: "EXPIRING_TRIAL",
    billingProvider: "Apple App Store",
    cancellationUrl: "https://support.apple.com/subscriptions",
    notes: "High-cost 7-day memory app trial frequently forgotten by seniors.",
  },
  {
    id: "sub-anc-102",
    name: "Ancestry Heritage Tree Weekly Trial",
    category: "FAMILY",
    monthlyPrice: 39.99,
    currency: "USD",
    isTrial: true,
    trialExpiresInDays: 4,
    trialEndDate: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
    renewalDate: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
    status: "EXPIRING_TRIAL",
    billingProvider: "Credit Card ending in 4118",
    cancellationPhone: "1-800-262-3787",
    notes: "Free trial auto-converts to $39.99 weekly renewal tier.",
  },
  {
    id: "sub-aarp-201",
    name: "AARP Health Alert Plus",
    category: "HEALTH",
    monthlyPrice: 19.99,
    currency: "USD",
    isTrial: false,
    trialExpiresInDays: null,
    trialEndDate: null,
    renewalDate: new Date(Date.now() + 18 * 86400000).toISOString().split("T")[0],
    status: "ACTIVE",
    billingProvider: "AARP Direct Billing",
    notes: "Medical alert monitoring subscription.",
  },
  {
    id: "sub-pill-202",
    name: "GrandCare Smart Pill Dispenser Cloud",
    category: "HEALTH",
    monthlyPrice: 14.99,
    currency: "USD",
    isTrial: false,
    trialExpiresInDays: null,
    trialEndDate: null,
    renewalDate: new Date(Date.now() + 22 * 86400000).toISOString().split("T")[0],
    status: "ACTIVE",
    billingProvider: "Visa ending in 8832",
    notes: "Medication adherence telemetry service.",
  },
  {
    id: "sub-silv-203",
    name: "SilverSneakers Fitness Stream",
    category: "HEALTH",
    monthlyPrice: 9.99,
    currency: "USD",
    isTrial: false,
    trialExpiresInDays: null,
    trialEndDate: null,
    renewalDate: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0],
    status: "ACTIVE",
    billingProvider: "Mastercard ending in 1092",
    notes: "Low-impact online elder workout videos.",
  },
  {
    id: "sub-stream-204",
    name: "Family Stream Gold 4K",
    category: "ENTERTAINMENT",
    monthlyPrice: 18.99,
    currency: "USD",
    isTrial: false,
    trialExpiresInDays: null,
    trialEndDate: null,
    renewalDate: new Date(Date.now() + 8 * 86400000).toISOString().split("T")[0],
    status: "ACTIVE",
    billingProvider: "Amazon Prime Channels",
    notes: "Family television channel bundle.",
  },
  {
    id: "sub-cw-301",
    name: "Magazinia Large Print Crosswords",
    category: "NEWS_PUZZLES",
    monthlyPrice: 12.00,
    currency: "USD",
    isTrial: true,
    trialExpiresInDays: 6,
    trialEndDate: new Date(Date.now() + 6 * 86400000).toISOString().split("T")[0],
    renewalDate: new Date(Date.now() + 6 * 86400000).toISOString().split("T")[0],
    status: "EXPIRING_TRIAL",
    billingProvider: "PayPal Direct Debit",
    notes: "Monthly digital crossword digest with 30-day intro trial.",
  },
];

// In-Memory Database store
let activeDatabase: SubscriptionItem[] = JSON.parse(JSON.stringify(INITIAL_SUBSCRIPTIONS));

/**
 * Reset database to default seed state
 */
export function resetSubscriptionsDatabase(): SubscriptionItem[] {
  activeDatabase = JSON.parse(JSON.stringify(INITIAL_SUBSCRIPTIONS));
  return activeDatabase;
}

/**
 * Fetch all raw subscriptions
 */
export function getAllSubscriptions(): SubscriptionItem[] {
  return [...activeDatabase];
}

/**
 * Core SubTrack tool: Get active subscriptions, expiring trials, and monthly spend totals.
 */
export function getActiveSubscriptions(timeframeDays: number = 7): SubTrackReport {
  const activeSubs = activeDatabase.filter(
    (s) => s.status === "ACTIVE" || s.status === "EXPIRING_TRIAL"
  );

  const expiringTrials = activeSubs.filter(
    (s) =>
      s.isTrial &&
      s.trialExpiresInDays !== null &&
      s.trialExpiresInDays <= timeframeDays
  );

  const totalMonthlySpend = activeSubs.reduce(
    (acc, curr) => acc + (curr.monthlyPrice || 0),
    0
  );

  const potentialMonthlySavings = expiringTrials.reduce(
    (acc, curr) => acc + (curr.monthlyPrice || 0),
    0
  );

  // Spoken voice summary for Alexa+
  let voiceSummary = "";
  if (expiringTrials.length > 0) {
    const primaryTrial = expiringTrials[0];
    voiceSummary = `You currently have ${activeSubs.length} subscriptions totaling $${totalMonthlySpend.toFixed(
      2
    )} per month. Important alert: Your free trial for ${primaryTrial.name} ends in ${
      primaryTrial.trialExpiresInDays === 1 ? "1 day" : `${primaryTrial.trialExpiresInDays} days`
    } and will auto-charge $${primaryTrial.monthlyPrice.toFixed(
      2
    )}. Would you like me to cancel this renewal for you?`;
  } else {
    voiceSummary = `You have ${activeSubs.length} active subscriptions totaling $${totalMonthlySpend.toFixed(
      2
    )} per month. Good news: You have no free trials expiring in the next ${timeframeDays} days.`;
  }

  const actionRecommendations: string[] = [];
  if (expiringTrials.length > 0) {
    actionRecommendations.push(
      `Review and cancel ${expiringTrials.length} expiring trial(s) to save $${potentialMonthlySavings.toFixed(
        2
      )} every month.`
    );
    expiringTrials.forEach((trial) => {
      actionRecommendations.push(
        `Say: "Alexa, cancel auto-renewal for ${trial.name}"`
      );
    });
  } else {
    actionRecommendations.push("All subscriptions are in regular active billing cycles.");
  }

  return {
    activeSubscriptionsCount: activeSubs.length,
    expiringTrialsCount: expiringTrials.length,
    totalMonthlySpend: Number(totalMonthlySpend.toFixed(2)),
    potentialMonthlySavings: Number(potentialMonthlySavings.toFixed(2)),
    timeframeDaysChecked: timeframeDays,
    subscriptions: activeSubs,
    expiringTrials,
    alexaVoiceSummary: voiceSummary,
    actionRecommendations,
    queriedAt: new Date().toISOString(),
  };
}

/**
 * Core SubTrack tool: Cancel or block auto-renewal for an alert subscription.
 */
export function cancelSubscriptionAlert(subscriptionId: string): CancelAlertResult {
  const target = activeDatabase.find(
    (s) => s.id.toLowerCase() === subscriptionId.toLowerCase() || s.name.toLowerCase().includes(subscriptionId.toLowerCase())
  );

  if (!target) {
    return {
      success: false,
      subscriptionId,
      subscriptionName: "Unknown Subscription",
      monthlyAmountSaved: 0,
      status: "CANCELLED",
      effectiveDate: new Date().toISOString().split("T")[0],
      alexaVoiceConfirmation: `I couldn't find an active subscription matching "${subscriptionId}". Please check the subscription name and try again.`,
      instructions: "No matching record found in SubTrack registry.",
    };
  }

  // Update status in the database
  target.status = "AUTO_RENEW_BLOCKED";
  const savedAmount = target.monthlyPrice;

  const alexaVoiceConfirmation = `I have successfully blocked the auto-renewal for ${target.name}. You will not be charged $${savedAmount.toFixed(
    2
    )} when the trial period ends. Your current access remains active until ${target.renewalDate}.`;

  return {
    success: true,
    subscriptionId: target.id,
    subscriptionName: target.name,
    monthlyAmountSaved: savedAmount,
    status: "AUTO_RENEW_BLOCKED",
    effectiveDate: target.renewalDate,
    alexaVoiceConfirmation,
    instructions: `Auto-renewal block registered with ${target.billingProvider}. Digital cancellation token generated.`,
  };
}
