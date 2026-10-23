import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createElderGuardMcpServer } from "./mcp/server.js";
import { analyzeSuspiciousMessage } from "./mcp/scamShieldTool.js";
import {
  getActiveSubscriptions,
  cancelSubscriptionAlert,
  getAllSubscriptions,
  resetSubscriptionsDatabase,
} from "./mcp/subTrackTool.js";
import { getBedrockStatus, isBedrockConfigured } from "./aws/bedrockScanner.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable CORS with MCP headers support
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "mcp-session-id",
      "x-accel-buffering",
      "Last-Event-ID",
    ],
    exposedHeaders: ["mcp-session-id", "Content-Type"],
  })
);

// In-memory session transport store for stateful MCP sessions
const activeSessions = new Map<string, StreamableHTTPServerTransport>();

// Parse JSON payloads (up to 10MB)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend dashboard
app.use(express.static(path.join(__dirname, "public")));

// Telemetry counters
let totalMcpRequests = 0;
let lastRequestTimestamp: string = "None";

// Ensure Streamable HTTP Accept header normalization
function normalizeMcpHeaders(req: Request, _res: Response, next: NextFunction) {
  if (req.path === "/mcp") {
    const currentAccept = req.headers.accept || "";
    if (!currentAccept.includes("text/event-stream")) {
      req.headers.accept = currentAccept
        ? `${currentAccept}, text/event-stream`
        : "application/json, text/event-stream";
    }
  }
  next();
}

app.use(normalizeMcpHeaders);

/**
 * Core Requirement 1: Streamable HTTP Transport mounted at POST /mcp
 * Conforms to Model Context Protocol specification 2025-11-25+.
 */
app.post("/mcp", async (req: Request, res: Response) => {
  totalMcpRequests++;
  lastRequestTimestamp = new Date().toISOString();

  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && activeSessions.has(sessionId)) {
      // Re-use established session transport
      transport = activeSessions.get(sessionId)!;
    } else {
      // Create new Streamable HTTP transport
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless per-request or ephemeral mode
      });

      const server = createElderGuardMcpServer();
      await server.connect(transport);

      if (sessionId) {
        activeSessions.set(sessionId, transport);
      }
    }

    // Delegate to the Streamable HTTP transport
    await transport.handleRequest(req, res, req.body);
  } catch (error: any) {
    console.error("[MCP Transport Error]", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: `Internal MCP Transport Error: ${error?.message || "Unknown"}`,
        },
        id: req.body?.id || null,
      });
    }
  }
});

/**
 * GET /mcp
 * Supports SSE connection or status discovery for streamable clients
 */
app.get("/mcp", (req: Request, res: Response) => {
  res.status(200).json({
    name: "subtrack-elderguard-mcp",
    protocolVersion: "2025-11-25",
    transport: "Streamable HTTP (POST /mcp)",
    status: "online",
    message: "MCP Server is active. Send JSON-RPC requests via POST /mcp.",
    documentation: "/README.md",
  });
});

/**
 * Health check endpoint
 */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    service: "subtrack-elderguard-mcp",
    spec: "2025-11-25",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    totalMcpRequests,
    lastRequestTimestamp,
    bedrock: getBedrockStatus(),
  });
});

/**
 * Web Simulator & Demo REST APIs
 */

// 1. List MCP Tool Definitions for Web Inspector
app.get("/api/tools", (_req: Request, res: Response) => {
  res.json({
    server: "subtrack-elderguard-mcp",
    specVersion: "2025-11-25",
    tools: [
      {
        name: "analyze_suspicious_message",
        description:
          "Analyzes incoming SMS, email, or transcribed voice messages for phishing, imposter scams, spoofed links, and elderly financial fraud using ScamShield heuristics and Amazon Bedrock.",
        inputSchema: {
          type: "object",
          properties: {
            messageText: {
              type: "string",
              description:
                "The SMS, email body, or voice transcript text from an unknown sender to analyze for scams, phishing, or financial threats.",
            },
          },
          required: ["messageText"],
        },
      },
      {
        name: "get_active_subscriptions",
        description:
          "Retrieves active household subscriptions, calculates total monthly spend, and detects expiring free trials that will auto-renew without warning.",
        inputSchema: {
          type: "object",
          properties: {
            timeframeDays: {
              type: "number",
              default: 7,
              description:
                "Number of days ahead to look for expiring free trials and auto-renewals (defaults to 7 days).",
            },
          },
        },
      },
      {
        name: "cancel_subscription_alert",
        description:
          "Flags and blocks auto-renewal for a specified subscription or trial to avoid unwanted recurring charges for elderly family members.",
        inputSchema: {
          type: "object",
          properties: {
            subscriptionId: {
              type: "string",
              description:
                "The unique ID or name of the subscription/trial to cancel or block auto-renewal for (e.g. 'sub-bg-101' or 'BrainGym Memory Pro').",
            },
          },
          required: ["subscriptionId"],
        },
      },
    ],
  });
});

// 2. Direct ScamShield Endpoint for Web UI
app.post("/api/scam/analyze", async (req: Request, res: Response) => {
  const { messageText } = req.body;
  if (!messageText) {
    res.status(400).json({ error: "Missing messageText parameter" });
    return;
  }
  const result = await analyzeSuspiciousMessage(messageText);
  res.json(result);
});

// 3. Subscriptions Endpoint
app.get("/api/subscriptions", (req: Request, res: Response) => {
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
  const report = getActiveSubscriptions(days);
  const all = getAllSubscriptions();
  res.json({
    report,
    all,
  });
});

// 4. Cancel Subscription Endpoint
app.post("/api/subscriptions/cancel", (req: Request, res: Response) => {
  const { subscriptionId } = req.body;
  if (!subscriptionId) {
    res.status(400).json({ error: "Missing subscriptionId parameter" });
    return;
  }
  const result = cancelSubscriptionAlert(subscriptionId);
  res.json(result);
});

// 5. Reset Subscriptions Database
app.post("/api/subscriptions/reset", (_req: Request, res: Response) => {
  const resetList = resetSubscriptionsDatabase();
  res.json({ success: true, count: resetList.length, subscriptions: resetList });
});

// 6. Bedrock Status
app.get("/api/bedrock/status", (_req: Request, res: Response) => {
  res.json(getBedrockStatus());
});

// 7. Interactive Alexa Voice Prompt Simulator
// Converts user voice / text prompt into simulated Alexa+ agent tool invocation over MCP
app.post("/api/simulate/voice-prompt", async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt) {
    res.status(400).json({ error: "Missing prompt parameter" });
    return;
  }

  const lower = prompt.toLowerCase();
  const startTime = Date.now();

  try {
    let toolInvoked = "";
    let toolArgs: any = {};
    let toolResult: any = null;

    if (
      lower.includes("scam") ||
      lower.includes("phish") ||
      lower.includes("suspicious") ||
      lower.includes("check text") ||
      lower.includes("check message") ||
      lower.includes("is this legitimate") ||
      lower.includes("wire") ||
      lower.includes("gift card")
    ) {
      toolInvoked = "analyze_suspicious_message";
      // Extract the text to check or use the prompt directly
      let cleanText = prompt
        .replace(/^alexa,?\s*/i, "")
        .replace(/^check (if )?(this )?(text|message)( is a scam)?:?/i, "")
        .replace(/^is (this )?(text|message) a scam:?/i, "")
        .trim();
      if (!cleanText || cleanText.length < 5) {
        cleanText = prompt;
      }
      toolArgs = { messageText: cleanText };
      toolResult = await analyzeSuspiciousMessage(cleanText);
    } else if (
      lower.includes("cancel") ||
      lower.includes("stop renewal") ||
      lower.includes("block charge")
    ) {
      toolInvoked = "cancel_subscription_alert";
      let targetSub = "BrainGym Memory Pro";
      if (lower.includes("ancestry")) targetSub = "Ancestry Heritage Tree Weekly Trial";
      if (lower.includes("braingym") || lower.includes("memory")) targetSub = "BrainGym Memory Pro";
      if (lower.includes("crossword")) targetSub = "Magazinia Large Print Crosswords";
      if (lower.includes("aarp")) targetSub = "AARP Health Alert Plus";
      toolArgs = { subscriptionId: targetSub };
      toolResult = cancelSubscriptionAlert(targetSub);
    } else {
      // Default to get_active_subscriptions
      toolInvoked = "get_active_subscriptions";
      toolArgs = { timeframeDays: 7 };
      toolResult = getActiveSubscriptions(7);
    }

    const elapsed = Date.now() - startTime;

    res.json({
      alexaPrompt: prompt,
      mcpToolInvoked: toolInvoked,
      mcpToolArguments: toolArgs,
      mcpToolResult: toolResult,
      alexaSpokenResponse:
        toolResult.alexaVoiceSummary || toolResult.alexaVoiceConfirmation,
      executionLatencyMs: elapsed,
      protocol: "Streamable HTTP (MCP 2025-11-25+)",
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to simulate Alexa prompt" });
  }
});

// Start listening
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║         🛡️  SUBTRACK & ELDERGUARD MCP SERVER IS RUNNING  🛡️                ║
║                                                                            ║
║   • Web Simulator:      http://localhost:${PORT}                              ║
║   • Streamable HTTP:    http://localhost:${PORT}/mcp                          ║
║   • Health Endpoint:    http://localhost:${PORT}/health                       ║
║   • Protocol Spec:      Model Context Protocol (MCP 2025-11-25+)           ║
║   • AWS Bedrock:        ${isBedrockConfigured() ? "Connected (Cloud Active)       " : "Active (Local Heuristic Engine)   "}║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Shutting down SubTrack & ElderGuard MCP Server...");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("Interrupt received, exiting cleanly...");
  server.close(() => process.exit(0));
});
