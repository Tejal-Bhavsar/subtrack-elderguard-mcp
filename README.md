# 🛡️ SubTrack & ElderGuard MCP Server

> **Autonomous Phishing Protection & Hidden Subscription Defense for Vulnerable Families over Streamable HTTP on Alexa+**

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![MCP Spec](https://img.shields.io/badge/MCP%20Spec-2025--11--25+-00caff.svg)](https://modelcontextprotocol.io)
[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock%20Claude%203-ff9900.svg)](https://aws.amazon.com/bedrock/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)](https://www.typescriptlang.org/)

---

## 🏆 Hackathon Tracks & Challenges Entered

| Track / Challenge | Status | Implementation Details |
|---|---|---|
| **Alexa+ Track** | **Primary Entry** | Self-hosted Model Context Protocol (MCP) Server implementing the **official 2025-11-25+ Streamable HTTP transport specification** via `POST /mcp` with full Agent Skills exposure. |
| **AWS Builder Mini-Challenge** | **Completed** | Production-ready Amazon Bedrock integration (`@aws-sdk/client-bedrock-runtime`) invoking Anthropic Claude 3 / Titan for cloud threat reasoning. |
| **Open Source Mini-Challenge** | **Completed** | Fully open-sourced under permissive [MIT License](./LICENSE) with zero proprietary lock-in. |

> **👥 Hackathon Reviewer Note:**
> As specified in the submission guidelines, the following Amazon & Hackathon collaborator usernames have been invited to this repository:
> - `knmeiss`
> - `giolaq`
> - `anishamalde`
> - `mosesroth`
> - `emersonsklar`

---

## 💡 The Problem

Every year, older adults lose over **$3.4 Billion** to text and email scams:
1. **Urgent Smishing & Imposter Traps:** Fraudsters send texts impersonating banks (Chase, Wells Fargo), parcel services (USPS, FedEx), or distressed grandchildren claiming an emergency wire or gift cards are required.
2. **Hidden "Free Trial" Auto-Renewal Traps:** Deceptive health and memory apps lure seniors with a "7-day free trial" and quietly begin recurring charges of $29.99 to $49.99 weekly or monthly, draining fixed incomes.
3. **Cognitive Overload:** When seniors feel uncertain about a text or charge, calling family members often causes anxiety. Asking Alexa naturally in their living room is the most accessible, dignified line of defense.

---

## 🚀 The Solution: SubTrack & ElderGuard

**SubTrack & ElderGuard** is an open-standard MCP server that equips **Alexa+** with active financial and digital defense agent skills:

1. **ScamShield Agent Skill (`analyze_suspicious_message`):**
   - High-precision heuristic scanner inspecting URLs for homoglyphs, typosquatting, raw IP addresses, and high-risk TLDs (`.xyz`, `.top`, `.cc`).
   - Deep reasoning via **Amazon Bedrock Claude 3** evaluating conversational intent, coercive urgency, and payment extortion.
   - Synthesizes warm, clear voice advice tailored for older adults without technical jargon.

2. **SubTrack Agent Skill (`get_active_subscriptions`):**
   - Maintains real-time tracking of family subscriptions, recurring costs, and free trials.
   - Calculates monthly household run rates and explicitly flags expiring trial dates (e.g., *"Your BrainGym trial auto-renews in 2 days for $29.99"*).

3. **Auto-Renewal Alert Blocker (`cancel_subscription_alert`):**
   - Allows users to speak directly to Alexa: *"Alexa, cancel the BrainGym trial auto-renewal"*.
   - Executes auto-renewal block tokens and calculates immediate monthly budget savings.

4. **Interactive Local Web Simulator:**
   - Visual dashboard at `http://localhost:3000` demonstrating the Alexa+ experience with glowing Alexa voice rings, text-to-speech audio playback, and a live Streamable HTTP protocol inspector.

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ALEXA+ / ECHO VOICE ASSISTANT                         │
│   "Alexa, check if this text about a Chase wire transfer is a scam."        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                      HTTP POST /mcp (Streamable HTTP)
                      JSON-RPC 2.0 (Spec 2025-11-25+)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 SUBTRACK & ELDERGUARD MCP SERVER (EXPRESS)                  │
│                                                                             │
│  ┌───────────────────────┐  ┌────────────────────────────────────────────┐  │
│  │ Streamable HTTP       │  │ McpServer ("subtrack-elderguard-mcp")       │  │
│  │ Transport Handler     │──│ • analyze_suspicious_message                │  │
│  │ (stateless/stateful)  │  │ • get_active_subscriptions                  │  │
│  │                       │  │ • cancel_subscription_alert                 │  │
│  └───────────────────────┘  └──────────────────────┬─────────────────────┘  │
└────────────────────────────────────────────────────┼────────────────────────┘
                                                     │
               ┌─────────────────────────────────────┴─────────────────────────────────────┐
               ▼                                                                           ▼
┌───────────────────────────────┐                                           ┌───────────────────────────────┐
│     SCAMSHIELD ENGINE         │                                           │        SUBTRACK ENGINE        │
│  • Typosquatting / Homoglyphs │                                           │  • Household Sub Registry     │
│  • Domain Reputation & IPs    │                                           │  • Trial Countdown Monitor    │
│  • Urgency & Extortion Rules  │                                           │  • Spend & Savings Analytics  │
│  • Amazon Bedrock Claude 3    │                                           │  • Auto-Renew Block Tokenizer │
└──────────────┬────────────────┘                                           └───────────────────────────────┘
               │
               ▼
┌───────────────────────────────┐
│       AMAZON BEDROCK          │
│  @aws-sdk/client-bedrock-     │
│  runtime (Claude 3 Haiku)     │
└───────────────────────────────┘
```

---

## 🛠️ MCP Tools Exposed (Agent Skills)

### 1. `analyze_suspicious_message`
- **Description:** Analyzes incoming SMS, email, or transcribed voice messages for phishing, imposter scams, spoofed links, and elderly financial fraud using ScamShield heuristics and Amazon Bedrock.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "messageText": {
        "type": "string",
        "description": "The SMS, email body, or voice transcript text from an unknown sender to analyze."
      }
    },
    "required": ["messageText"]
  }
  ```
- **Sample Output:**
  ```json
  {
    "verdict": "DANGEROUS_SCAM",
    "threatRiskScore": 92,
    "threatCategory": "Bank Phishing / Institutional Impersonation",
    "signals": [
      {
        "category": "URL_SPOOF",
        "severity": "HIGH",
        "description": "Suspicious destination URL detected matching phishing heuristics: chase-alert-login.cc"
      },
      {
        "category": "URGENCY",
        "severity": "MEDIUM",
        "description": "Manufactured high-pressure urgency trigger: 'within 24 hours'"
      }
    ],
    "alexaVoiceSummary": "Warning. This message is almost certainly a scam attempting to steal your personal information or money. Please do not click any links, do not reply, and do not send gift cards or cash. I have flagged this sender for safety.",
    "actionRecommendations": [
      "Do not click any links or download attachments.",
      "Call the number on the back of your physical bank card."
    ]
  }
  ```

---

### 2. `get_active_subscriptions`
- **Description:** Retrieves active household subscriptions, calculates total monthly spend, and detects expiring free trials that will auto-renew without warning.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "timeframeDays": {
        "type": "number",
        "default": 7,
        "description": "Number of days ahead to look for expiring free trials (default: 7)."
      }
    }
  }
  ```

---

### 3. `cancel_subscription_alert`
- **Description:** Flags and blocks auto-renewal for a specified subscription or trial to avoid unwanted recurring charges for elderly family members.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "subscriptionId": {
        "type": "string",
        "description": "The unique ID or name of the subscription to block (e.g. 'sub-bg-101' or 'BrainGym Memory Pro')."
      }
    },
    "required": ["subscriptionId"]
  }
  ```

---

### 4. `list_active_subscriptions`
- **Description:** Lists down every active subscription with its name, monthly price, and total household spend. Triggered when user asks: *"Alexa, tell me which active subscriptions I have and list them down."*
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {}
  }
  ```

---

### 5. `get_cancellation_reminders`
- **Description:** Provides proactive warnings and reminders about expiring free trials and subscriptions that must be cancelled before getting charged. Triggered when user asks: *"Alexa, remind me which subscription I have to cancel before getting charged."*
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "timeframeDays": {
        "type": "number",
        "default": 7,
        "description": "Number of days ahead to look for upcoming charges and trial expirations (default: 7)."
      }
    }
  }
  ```

---

## ⚡ Quickstart Guide

### Prerequisites
- Node.js `v18.0.0` or later (tested on Node `v23.11.0`)
- npm `v9.0.0` or later

### 1. Clone & Install
```bash
git clone https://github.com/your-username/subtrack-elderguard-mcp.git
cd subtrack-elderguard-mcp
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Note: If AWS credentials are not configured, the server automatically uses the built-in Intelligent Neural Guard Heuristic Engine, guaranteeing 100% offline functionality without configuration!)*

### 3. Run Locally
```bash
npm run dev
```

The server will start at:
- **Interactive Web Simulator:** [http://localhost:3000](http://localhost:3000)
- **MCP Streamable HTTP Endpoint:** `http://localhost:3000/mcp`
- **Server Health Check:** [http://localhost:3000/health](http://localhost:3000/health)

---

## 🧪 Testing the Streamable HTTP Transport Directly

You can test the MCP endpoint with standard JSON-RPC 2.0 requests:

### List Tools via cURL
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### Call ScamShield via cURL
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "analyze_suspicious_message",
      "arguments": {
        "messageText": "Urgent: Your Chase card is locked. Verify at http://chase-security-login.xyz within 24 hours."
      }
    }
  }'
```

---

## 📂 Project Structure

```text
subtrack-elderguard-mcp/
├── package.json               # Dependencies & build scripts
├── tsconfig.json              # TypeScript ES2022 / NodeNext config
├── LICENSE                    # MIT Open Source License
├── .gitignore                 # Standard exclusions
├── .env.example               # Environment template
├── README.md                  # Main submission & architectural overview
├── FRICTION_LOG.md            # Required 10% Judging Bonus friction log
├── FEEDBACK.md                # Product & onboarding feedback
├── VIDEO_SCRIPT.md            # 2:30 YouTube demo video script
└── src/
    ├── index.ts               # Express entry point & Streamable HTTP /mcp router
    ├── mcp/
    │   ├── server.ts          # McpServer registration & Zod tool definitions
    │   ├── scamShieldTool.ts  # Heuristic & Bedrock Scam Detection Engine
    │   └── subTrackTool.ts    # Subscription & Trial Tracking Engine
    ├── aws/
    │   └── bedrockScanner.ts  # AWS Bedrock runtime client & fallback
    └── public/
        └── index.html         # Interactive Web Simulator & visualizer
```

---

## 📜 Submission Documents
- [FRICTION_LOG.md](./FRICTION_LOG.md) — 3 in-depth engineering logs analyzing Streamable HTTP headers, Zod registration, and AWS Bedrock streaming.
- [FEEDBACK.md](./FEEDBACK.md) — Product feedback on `@modelcontextprotocol/sdk` and developer onboarding.
- [VIDEO_SCRIPT.md](./VIDEO_SCRIPT.md) — Complete 2-minute-30-second presentation script.

---

## 📄 License
This project is licensed under the [MIT License](./LICENSE). Open source for the community and for protecting vulnerable individuals everywhere.
