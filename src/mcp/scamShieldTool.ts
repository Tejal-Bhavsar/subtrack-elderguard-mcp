import { analyzeMessageWithBedrock, BedrockAnalysisResult } from "../aws/bedrockScanner.js";

export interface ScamSignal {
  category: "URL_SPOOF" | "URGENCY" | "FINANCIAL_DEMAND" | "IMPERSONATION" | "SENIOR_EXPLOIT";
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  matchedText?: string;
}

export interface ScamAnalysisReport {
  messageText: string;
  verdict: "DANGEROUS_SCAM" | "SUSPICIOUS_MESSAGE" | "LIKELY_SAFE";
  threatRiskScore: number; // 0 to 100
  threatCategory: string;
  signals: ScamSignal[];
  extractedUrls: string[];
  alexaVoiceSummary: string;
  actionRecommendations: string[];
  bedrockTelemetry: {
    provider: string;
    modelId: string;
    latencyMs: number;
  };
  analyzedAt: string;
}

// Known malicious or high-risk domain patterns
const SUSPICIOUS_DOMAIN_PATTERNS = [
  /chase.*-(verify|secure|alert|auth|update)/i,
  /wellsfargo.*-(online|auth|secure|update)/i,
  /bankofamerica.*-(login|secure|alert)/i,
  /amazon.*-(security|order|claim|support|refund)/i,
  /apple.*-(id|verify|cloud|security)/i,
  /usps.*-(track|redelivery|fee|parcel|hub)/i,
  /fedex.*-(claim|delivery|package)/i,
  /irs.*-(gov|refund|tax|claim)/i,
  /netflix.*-(billing|update|hold)/i,
  /paypal.*-(resolution|case|suspended)/i,
  /\b(bit\.ly|tinyurl\.com|t\.co|is\.gd|ow\.ly|rb\.gy|cutt\.ly|shorturl\.at)\b/i,
  /\.(xyz|top|cc|tk|ml|ga|cf|gq|work|click|country|kim|stream|bid|vip|date)\b/i,
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // Raw IP addresses
];

// Homoglyphs and typo-squatting checks
const TYPO_PATTERNS = [
  { regex: /amaz0n|arnazon|amzon/i, name: "Amazon spoofing" },
  { regex: /chase0nline|chasee|chasse/i, name: "Chase Bank spoofing" },
  { regex: /wellsfarg0|wells-farg0/i, name: "Wells Fargo spoofing" },
  { regex: /paypa1|pay-pal/i, name: "PayPal spoofing" },
  { regex: /app1e|appie/i, name: "Apple spoofing" },
  { regex: /netf1ix|netfiix/i, name: "Netflix spoofing" },
];

// Urgency triggers
const URGENCY_TRIGGERS = [
  "within 24 hours",
  "immediate action required",
  "account will be closed",
  "account suspended",
  "arrest warrant",
  "legal action",
  "final notice",
  "unauthorized charge",
  "security breach",
  "click immediately",
  "confirm within 1 hour",
  "avoid prosecution",
];

// Financial extortion or unusual payment indicators
const FINANCIAL_DEMANDS = [
  "wire transfer",
  "apple gift card",
  "target gift card",
  "google play card",
  "bitcoin",
  "crypto",
  "cryptocurrency",
  "atm deposit",
  "western union",
  "moneygram",
  "zelle transfer",
  "send cash",
  "overpaid you",
  "refund fee",
];

// Senior-specific targeting traps
const SENIOR_TARGETING_PATTERNS = [
  {
    pattern: /(grandma|grandpa|grandson|granddaughter).*(jail|accident|arrested|bail|trouble)/i,
    label: "Grandparent Imposter Bail Scam",
  },
  {
    pattern: /(geek squad|norton|mcafee).*(auto-renew|charge|refund|\$399|\$499|\$299)/i,
    label: "Tech Support / Antivirus Renewal Trap",
  },
  {
    pattern: /(medicare|social security|ssn).*(suspended|updated card|new chip|verify number)/i,
    label: "Medicare / Social Security Card Identity Trap",
  },
  {
    pattern: /(publishers clearing house|lottery|sweepstakes|won).*(fee|tax before release)/i,
    label: "Lottery / Sweepstakes Advance Fee Scam",
  },
  {
    pattern: /(usps|package|parcel).*(address incomplete|customs fee|\$1\.99|\$2\.15|redelivery)/i,
    label: "USPS / Smishing Package Reschedule Trap",
  },
];

/**
 * Core ScamShield Heuristic Engine combined with Bedrock AI validation
 */
export async function analyzeSuspiciousMessage(messageText: string): Promise<ScamAnalysisReport> {
  const signals: ScamSignal[] = [];
  let heuristicScore = 0;
  const lower = messageText.toLowerCase();

  // 1. URL Extraction & Domain Analysis
  const urlRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/[^\s]*)/gi;
  const extractedUrls = messageText.match(urlRegex) || [];

  for (const url of extractedUrls) {
    for (const pattern of SUSPICIOUS_DOMAIN_PATTERNS) {
      if (pattern.test(url)) {
        heuristicScore += 35;
        signals.push({
          category: "URL_SPOOF",
          severity: "HIGH",
          description: `Suspicious destination URL detected matching phishing heuristics: "${url}"`,
          matchedText: url,
        });
        break;
      }
    }
  }

  // 2. Homoglyph / Typo Spoofing
  for (const typo of TYPO_PATTERNS) {
    if (typo.regex.test(messageText)) {
      heuristicScore += 40;
      signals.push({
        category: "URL_SPOOF",
        severity: "HIGH",
        description: `Homoglyph or brand typosquatting detected (${typo.name})`,
      });
    }
  }

  // 3. Urgency Triggers
  for (const trigger of URGENCY_TRIGGERS) {
    if (lower.includes(trigger)) {
      heuristicScore += 25;
      signals.push({
        category: "URGENCY",
        severity: "MEDIUM",
        description: `Manufactured high-pressure urgency trigger: "${trigger}"`,
        matchedText: trigger,
      });
    }
  }

  // 4. Financial Demands
  for (const demand of FINANCIAL_DEMANDS) {
    if (lower.includes(demand)) {
      heuristicScore += 35;
      signals.push({
        category: "FINANCIAL_DEMAND",
        severity: "HIGH",
        description: `Untraceable or non-standard payment method demand: "${demand}"`,
        matchedText: demand,
      });
    }
  }

  // 5. Senior-Specific Exploitation Patterns
  let primaryThreatCategory = "General Phishing";
  for (const seniorTrap of SENIOR_TARGETING_PATTERNS) {
    if (seniorTrap.pattern.test(messageText)) {
      heuristicScore += 45;
      primaryThreatCategory = seniorTrap.label;
      signals.push({
        category: "SENIOR_EXPLOIT",
        severity: "HIGH",
        description: `High-risk senior fraud pattern identified: ${seniorTrap.label}`,
      });
    }
  }

  // 6. Consult Bedrock Scanner for Secondary AI Reasoning
  const bedrockResult: BedrockAnalysisResult = await analyzeMessageWithBedrock(messageText);

  // Combine Heuristic and Bedrock Scores (weighted hybrid)
  const combinedScore = Math.min(
    Math.round(heuristicScore * 0.55 + bedrockResult.confidenceScore * 0.45),
    100
  );

  // Determine Final Verdict
  let verdict: "DANGEROUS_SCAM" | "SUSPICIOUS_MESSAGE" | "LIKELY_SAFE";
  if (combinedScore >= 60 || signals.some((s) => s.severity === "HIGH")) {
    verdict = "DANGEROUS_SCAM";
  } else if (combinedScore >= 30 || signals.length > 0) {
    verdict = "SUSPICIOUS_MESSAGE";
  } else {
    verdict = "LIKELY_SAFE";
  }

  // Tailor empathetic Alexa voice response for elderly users
  let alexaVoiceSummary = "";
  const actionRecommendations: string[] = [];

  if (verdict === "DANGEROUS_SCAM") {
    alexaVoiceSummary = `Warning. This message is almost certainly a scam attempting to steal your personal information or money. Please do not click any links, do not reply, and do not send gift cards or cash. I have flagged this sender for safety.`;
    actionRecommendations.push("Do not click any links or download attachments.");
    actionRecommendations.push("Do not reply with passwords, 2FA codes, or card details.");
    actionRecommendations.push("If this claims to be your bank or USPS, call their official number listed on your physical card or official website.");
    actionRecommendations.push("Delete and block the message sender.");
  } else if (verdict === "SUSPICIOUS_MESSAGE") {
    alexaVoiceSummary = `This message looks suspicious because it uses urgent wording and an unverified link. Before taking any action, check directly with the company using a known phone number.`;
    actionRecommendations.push("Verify the sender independently before clicking.");
    actionRecommendations.push("Never provide sensitive credentials over SMS.");
  } else {
    alexaVoiceSummary = `I analyzed this text and found no obvious scam indicators or phishing links. However, always remember that trusted companies will never ask you to text your password.`;
    actionRecommendations.push("Message appears normal, but maintain healthy caution.");
  }

  return {
    messageText,
    verdict,
    threatRiskScore: combinedScore,
    threatCategory: primaryThreatCategory,
    signals,
    extractedUrls,
    alexaVoiceSummary,
    actionRecommendations,
    bedrockTelemetry: {
      provider: bedrockResult.provider,
      modelId: bedrockResult.modelId,
      latencyMs: bedrockResult.latencyMs,
    },
    analyzedAt: new Date().toISOString(),
  };
}
