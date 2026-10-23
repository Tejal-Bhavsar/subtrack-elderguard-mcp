# 📝 Engineering Friction Log: SubTrack & ElderGuard MCP Server

> **Purpose:** Document real-world developer frictions encountered while building on the Model Context Protocol (MCP 2025-11-25+ spec) and Amazon Bedrock for the Alexa+ Track, targeting the **10% Judging Bonus**.

---

## 📌 Entry 1: Streamable HTTP Transport Headers, Strict Accept Validation & CORS

### 1. Task Attempted
Implement the official **MCP Streamable HTTP transport** (`StreamableHTTPServerTransport`) on the `POST /mcp` endpoint inside an Express server to receive agent tool invocations from Alexa+ and external MCP clients.

### 2. Steps Taken
1. Initialized `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js`.
2. Connected `McpServer` to the transport using `await server.connect(transport)`.
3. Routed Express requests from `app.post("/mcp", ...)` to `transport.handleRequest(req, res, req.body)`.
4. Dispatched initial test requests via standard HTTP clients (Postman, `curl`, and browser `fetch()`) with standard JSON headers:
   ```http
   POST /mcp HTTP/1.1
   Content-Type: application/json
   Accept: application/json
   ```

### 3. Expected vs. Actual Outcome
- **Expected Outcome:** The transport parses the JSON-RPC `initialize` request and either returns a direct JSON response (`Content-Type: application/json`) or initiates a Server-Sent Events (SSE) stream.
- **Actual Outcome:** The server immediately terminated the connection and responded with HTTP `406 Not Acceptable`:
  ```json
  {
    "jsonrpc": "2.0",
    "error": {
      "code": -32000,
      "message": "Not Acceptable: Client must accept both application/json and text/event-stream"
    },
    "id": null
  }
  ```
  Furthermore, in browser-based test environments, pre-flight `OPTIONS` requests failed because the SDK requires custom headers (`mcp-session-id`, `x-accel-buffering`, `Last-Event-ID`) that standard CORS policies block by default.

### 4. Severity Rating
**High** — Any client or testing tool that does not know to send the composite `Accept: application/json, text/event-stream` header is rejected immediately with a cryptic 406 error, breaking standard REST/HTTP testing tools and webhook proxies.

### 5. Workaround Used
1. Added an Express pre-processing middleware that dynamically normalizes the `Accept` header before `handleRequest` receives it:
   ```typescript
   app.use((req, res, next) => {
     if (req.path === "/mcp") {
       const accept = req.headers.accept || "";
       if (!accept.includes("text/event-stream")) {
         req.headers.accept = accept ? `${accept}, text/event-stream` : "application/json, text/event-stream";
       }
     }
     next();
   });
   ```
2. Explicitly configured Express `cors` middleware with all required MCP transport headers:
   ```typescript
   app.use(cors({
     origin: "*",
     methods: ["GET", "POST", "OPTIONS", "HEAD"],
     allowedHeaders: ["Content-Type", "Authorization", "Accept", "mcp-session-id", "x-accel-buffering", "Last-Event-ID"],
     exposedHeaders: ["mcp-session-id", "Content-Type"]
   }));
   ```

### 6. Actionable Suggestion for Amazon / MCP Team
- **Graceful Fallback:** Update `StreamableHTTPServerTransport` to default to standard `application/json` when the client only sends `Accept: application/json`, and reserve `text/event-stream` for clients that explicitly demand streaming.
- **Improved Documentation:** Prominently highlight in the MCP Streamable HTTP specification and quickstart examples that `Accept: application/json, text/event-stream` is a mandatory prerequisite header.

---

## 📌 Entry 2: Tool Schema Registration with Zod vs. Raw JSON Schema in `McpServer`

### 1. Task Attempted
Define and register the three core Agent Skills (`analyze_suspicious_message`, `get_active_subscriptions`, `cancel_subscription_alert`) using the high-level `McpServer.tool()` API with descriptive schemas for Alexa's tool-selection model.

### 2. Steps Taken
1. Attempted to register tools using a standard top-level `z.object({...})` as demonstrated in several online examples:
   ```typescript
   server.tool(
     "analyze_suspicious_message",
     "Tool description",
     z.object({
       messageText: z.string().describe("The message to analyze")
     }),
     async ({ messageText }) => { ... }
   );
   ```
2. Attempted to supply optional parameters with `.default(...)` values.

### 3. Expected vs. Actual Outcome
- **Expected Outcome:** `McpServer` accepts either a `z.object()` or a plain object schema dictionary (`ZodRawShapeCompat`) seamlessly and extracts property metadata for `tools/list`.
- **Actual Outcome:** TypeScript threw an overload resolution error:
  `Argument of type 'ZodObject<{ messageText: ZodString; }>' is not assignable to parameter of type 'ZodRawShapeCompat'.`
  In `@modelcontextprotocol/sdk/server/mcp.js`, `server.tool` expects a raw shape (`{ [key: string]: ZodTypeAny }`) rather than a root `z.object(...)`. Furthermore, nested object schemas and union types often lose their `.describe()` annotations when serialized into JSON Schema for tool exposure.

### 4. Severity Rating
**Medium** — Causes substantial confusion for developers migrating between the low-level `Server` API (which uses raw JSON Schema) and `McpServer` (which enforces `ZodRawShapeCompat`), leading to build-breaking type errors.

### 5. Workaround Used
Passed the raw property shape object directly into the `tool()` method rather than wrapping it in `z.object()`:
```typescript
server.tool(
  "analyze_suspicious_message",
  "Analyzes incoming SMS, email, or voice messages...",
  {
    messageText: z
      .string()
      .min(1)
      .describe("The SMS, email body, or voice transcript text from an unknown sender.")
  },
  async ({ messageText }) => {
    // Implementation
  }
);
```

### 6. Actionable Suggestion for Amazon / MCP Team
- Support polymorphic schema input in `McpServer.tool()`: allow both `z.object()` and raw shapes (`ZodRawShape`) via TypeScript function overloads.
- Add an automated schema validator to the SDK that verifies descriptions are properly preserved when converting Zod schemas to JSON-RPC `inputSchema` definitions for voice assistant LLM engines.

---

## 📌 Entry 3: AWS Bedrock SDK Response Latency & Conversational Voice Constraints

### 1. Task Attempted
Integrate Amazon Bedrock Claude 3 Haiku via `@aws-sdk/client-bedrock-runtime` to perform secondary deep semantic threat analysis on suspicious messages during conversational voice turns with Alexa+.

### 2. Steps Taken
1. Instantiated `BedrockRuntimeClient` configured with AWS credentials.
2. Built a structured prompt instructing Claude 3 to return a strict JSON payload with threat classification, confidence scores, and an empathetic voice response for seniors.
3. Executed `InvokeModelCommand` and parsed the JSON payload to return to the Alexa voice agent.

### 3. Expected vs. Actual Outcome
- **Expected Outcome:** Total round-trip latency under 800 milliseconds to maintain fluid, natural voice conversation pacing on Amazon Echo devices.
- **Actual Outcome:** Cold-start cloud invocations to Bedrock took between **1,400ms and 2,600ms**. In voice contexts, a 2.5-second silence creates an awkward conversational pause that makes elderly users think the device disconnected or didn't hear them. Additionally, if AWS credentials were not loaded in a reviewer's local environment, the entire tool call would throw an unhandled exception and crash the MCP response.

### 4. Severity Rating
**High** — Voice interfaces require sub-second response times; a multi-second delay degrades user trust, and cloud auth failures break local evaluation.

### 5. Workaround Used
1. **Hybrid Architecture:** Implemented a two-tier analysis engine:
   - Tier 1: Instant zero-latency heuristic scanner (URL homoglyphs, urgency patterns, known fraud signatures) that computes an immediate baseline risk score in < 15ms.
   - Tier 2: Amazon Bedrock integration running concurrently, with an intelligent local Neural Guard fallback that mirrors Bedrock's exact schema if cloud credentials are absent or latency exceeds threshold.
2. **Resilient Fallback:** Wrapped Bedrock invocations in a graceful try/catch block so the MCP server never fails or blocks Alexa from speaking.

### 6. Actionable Suggestion for Amazon / MCP Team
- **Alexa+ Streaming MCP Bridge:** Enable native chunked token streaming over MCP Streamable HTTP directly into Alexa's Text-to-Speech (TTS) synthesizer, so the first spoken token can begin playing to the user in < 400ms while the remainder of the analysis completes.
- **Local Dev Mock Utilities:** Provide an official `@aws-sdk/bedrock-mock` or built-in emulator for hackathons and local development so developers can test Bedrock agent workflows without incurring AWS billing or managing temporary STS tokens.
