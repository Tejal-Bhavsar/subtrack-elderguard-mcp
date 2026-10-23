# 📢 Hackathon Developer Feedback & Product Review

**Project Name:** SubTrack & ElderGuard MCP Server  
**Track:** Alexa+ Track (Self-Hosted MCP Server)  
**Mini-Challenges:** AWS Builder & Open Source  

---

## 1. Tools & Libraries Used
- **`@modelcontextprotocol/sdk` (v1.6+)**: Utilized `McpServer` and `StreamableHTTPServerTransport` to implement the open Model Context Protocol standard over HTTP.
- **Express (v4.21+)**: Used as the web server layer to host the static Alexa+ web simulator and handle the `/mcp` routing.
- **`@aws-sdk/client-bedrock-runtime`**: Integrated for deep threat intelligence and senior-friendly conversational reasoning via Claude 3 Haiku / Titan.
- **Zod (v3.24+)**: Enforced strict runtime type validation and descriptive schema reflection for Alexa+ agent tool calling.
- **Web Speech API**: Integrated into the local web simulator for client-side Alexa voice playback.

---

## 2. What Worked Extremely Well

### ⚡ Streamable HTTP Performance & Architecture
- **Single Endpoint Architecture:** Consolidating client communication into `POST /mcp` instead of having split SSE endpoints and separate message-posting endpoints is a major architectural improvement. It significantly simplifies reverse proxy rules, firewall policies, and AWS API Gateway / Lambda routing.
- **Protocol Type Safety:** The TypeScript definitions provided in `@modelcontextprotocol/sdk` are thorough. Once the transport lifecycle is properly wired, registering tools with descriptive Zod schemas makes agent capabilities discoverable by any compliant MCP client.
- **Lightweight Footprint:** The MCP server boots in milliseconds, uses minimal memory, and handles concurrent JSON-RPC requests efficiently.

---

## 3. What Needs Work & Areas for Improvement

### 🔍 Documentation on Streamable HTTP & Header Requirements
- **Cryptic 406 Errors:** When a client sends a standard HTTP POST with `Accept: application/json`, the transport rejects the request with a `406 Not Acceptable: Client must accept both application/json and text/event-stream`. This requirement was not immediately obvious in the main documentation and caused unexpected failures during standard curl/fetch testing.
- **Stateless vs. Stateful Sessions:** The difference between stateless transport usage (`sessionIdGenerator: undefined`) and stateful sessions (`sessionIdGenerator: () => randomUUID()`) requires clearer architectural examples. Specifically, in stateless mode, each incoming HTTP request requires its own transport instance, whereas in stateful mode, a single transport handles multiple requests keyed by `mcp-session-id`. A canonical Express/Fastify sample repository would save developers hours of trial and error.
- **SSE Fallbacks vs. Raw Streaming:** Clarifying when the protocol streams back chunked SSE packets (`text/event-stream`) versus when it returns a single synchronous JSON response is crucial for developers integrating with voice frontends that require token streaming.

---

## 4. Developer Onboarding Experience
- **Initial Setup:** Cloning the repository, running `npm install`, and importing `@modelcontextprotocol/sdk` was seamless. The SDK exports modern ES modules that play nicely with `tsx` and modern Node runtimes (`v20+` and `v23+`).
- **Learning Curve:** Transitioning from traditional REST APIs or custom Alexa Skills to the agentic MCP paradigm requires a minor mental shift. Understanding how the LLM acts as the orchestrator that selects tools based on the description and input schemas is intuitive once the `tools/list` handshake is observed in the logs.
- **Overall Rating:** **9/10** — An exceptionally promising standard that solves agent-to-tool interoperability. With better HTTP transport guides and built-in Express middleware helpers, it could easily be 10/10.

---

## 5. AWS Service Details (AWS Builder Mini-Challenge)

### Amazon Bedrock Integration Details:
- **Service Used:** Amazon Bedrock Runtime (`@aws-sdk/client-bedrock-runtime`).
- **Foundation Models Targeted:** `anthropic.claude-3-haiku-20240307-v1:0` and `amazon.titan-text-express-v1`.
- **Use Case:** Secondary semantic verification of deceptive SMS messages. Bedrock evaluates psychological urgency triggers, grandparent impersonation, and fraudulent payment channels, outputting structured risk metrics and spoken voice warnings for Alexa.
- **Resilience Design:** Created a hybrid pipeline where immediate heuristics calculate a risk score in < 15ms, followed by Bedrock's deep contextual reasoning. If AWS credentials are not configured in a reviewer's local environment, an intelligent local Neural Guard engine takes over, ensuring the project remains 100% testable out of the box.
