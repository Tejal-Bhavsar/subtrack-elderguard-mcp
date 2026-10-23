import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  analyzeSuspiciousMessage,
  ScamAnalysisReport,
} from "./scamShieldTool.js";
import {
  getActiveSubscriptions,
  cancelSubscriptionAlert,
  SubTrackReport,
  CancelAlertResult,
} from "./subTrackTool.js";

/**
 * Creates and registers tools on an McpServer instance conforming to MCP spec 2025-11-25+.
 * Name: "subtrack-elderguard-mcp"
 * Version: "1.0.0"
 */
export function createElderGuardMcpServer(): McpServer {
  const server = new McpServer({
    name: "subtrack-elderguard-mcp",
    version: "1.0.0",
  });

  // Tool 1: ScamShield - Message Phishing & Threat Analysis
  server.tool(
    "analyze_suspicious_message",
    "Analyzes incoming SMS, email, or transcribed voice messages for phishing, imposter scams, spoofed links, and elderly financial fraud using ScamShield heuristics and Amazon Bedrock.",
    {
      messageText: z
        .string()
        .min(1)
        .describe(
          "The SMS, email body, or voice transcript text from an unknown sender to analyze for scams, phishing, or financial threats."
        ),
    },
    async ({ messageText }) => {
      try {
        const report: ScamAnalysisReport = await analyzeSuspiciousMessage(
          messageText
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(report, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error analyzing message: ${err?.message || "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool 2: SubTrack - Subscription & Free Trial Monitor
  server.tool(
    "get_active_subscriptions",
    "Retrieves active household subscriptions, calculates total monthly spend, and detects expiring free trials that will auto-renew without warning.",
    {
      timeframeDays: z
        .number()
        .int()
        .positive()
        .optional()
        .default(7)
        .describe(
          "Number of days ahead to look for expiring free trials and auto-renewals (defaults to 7 days)."
        ),
    },
    async ({ timeframeDays = 7 }) => {
      try {
        const report: SubTrackReport = getActiveSubscriptions(timeframeDays);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(report, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error fetching subscriptions: ${err?.message || "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Tool 3: SubTrack - Cancel Auto-Renewal / Alert Block
  server.tool(
    "cancel_subscription_alert",
    "Flags and blocks auto-renewal for a specified subscription or trial to avoid unwanted recurring charges for elderly family members.",
    {
      subscriptionId: z
        .string()
        .min(1)
        .describe(
          "The unique ID or name of the subscription/trial to cancel or block auto-renewal for (e.g. 'sub-bg-101' or 'BrainGym Memory Pro')."
        ),
    },
    async ({ subscriptionId }) => {
      try {
        const result: CancelAlertResult = cancelSubscriptionAlert(subscriptionId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error cancelling subscription: ${err?.message || "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

export const mcpServerInstance = createElderGuardMcpServer();
