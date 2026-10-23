# 🎬 Demo Video Script: SubTrack & ElderGuard MCP Server

**Total Duration:** Exactly 2 minutes and 30 seconds (02:30)  
**Target Audience:** Amazon Hackathon Judges, Alexa+ Engineering Team, and Open Source Community  
**Tone:** Energetic, authoritative, empathetic, and technically precise  

---

### [0:00 - 0:30] SECTION 1: THE HOOK & THE URGENT PROBLEM

**Visual on Screen:**
- Split screen: On the left, an elderly person looking anxious at their smartphone displaying an alarming SMS from "Chase Bank". On the right, title card: *"Over $3.4 Billion Lost Yearly to Senior Fraud & Forgotten Auto-Renewals."*
- Camera switches to speaker.

**Speaker (0:00 - 0:15):**
> *"Every single day, millions of our parents and grandparents receive terrifying texts: 'Your bank account is suspended,' 'Your grandson is in jail,' or deceptive 7-day memory app trials that quietly auto-renew for $30 a month. For non-tech-savvy seniors, spotting these predatory traps is stressful and overwhelming."*

**Speaker (0:15 - 0:30):**
> *"What if Alexa could be their 24/7 personal digital guardian? Introducing **SubTrack & ElderGuard** — a production-grade Model Context Protocol (MCP) Server built for Alexa+ using the official 2025-11-25 Streamable HTTP specification. Let's see it in action!"*

---

### [0:30 - 1:30] SECTION 2: LIVE PRODUCT DEMO

**Visual on Screen:**
- Screen captures browser window showing the **Interactive Web Simulator** at `http://localhost:3000`.
- The glowing Alexa blue LED ring is visible, alongside the SubTrack household subscription cards and the live Streamable HTTP inspector.

**Speaker (0:30 - 0:50):**
> *"Here is our live Alexa+ simulator. Let's simulate an elderly user asking Alexa to check an alarming SMS: 'Urgent: Unauthorized wire from Chase Bank. Verify your credentials at chase-alert-login.cc within 24 hours.'*
> *(Speaker clicks the preset prompt button)*
> *Notice the Alexa ring pulses cyan as the request streams over our MCP server."*

**Audio on Screen (Alexa Voice Output via Web Speech API):**
> *"Warning. This message is almost certainly a scam attempting to steal your personal information or money. Please do not click any links, do not reply, and do not send gift cards or cash. I have flagged this sender for safety."*

**Speaker (0:50 - 1:10):**
> *"Look at the threat telemetry: The ScamShield engine caught the homoglyph domain spoofing, the manufactured 24-hour urgency trigger, and flagged an immediate risk score of 92 out of 100 with zero delay.*
> *Now let's check household subscriptions. A senior says: 'Alexa, what free trials are expiring this week?'*
> *(Speaker clicks the SubTrack voice button)*
> *Immediately, Alexa warns that BrainGym Memory Pro's 7-day trial ends in 2 days and will auto-charge $29.99.*
> *With one sentence: 'Alexa, cancel my BrainGym auto-renewal' — our agent skill issues an auto-renewal block token, saving $30 a month instantly!"*

**Speaker (1:10 - 1:30):**
> *"And over in our Live Streamable HTTP tab, you can inspect the raw JSON-RPC 2.0 streaming packets arriving at POST `/mcp` in real time. Full compliance with the official 2025-11-25 spec with sub-50ms latency."*

---

### [1:30 - 2:15] SECTION 3: CODE & ARCHITECTURE WALKTHROUGH

**Visual on Screen:**
- Switch to VS Code showing `src/mcp/server.ts`, `src/index.ts`, and `src/aws/bedrockScanner.ts`.

**Speaker (1:30 - 1:52):**
> *"Let's look under the hood. In `src/index.ts`, we implement the MCP Streamable HTTP transport listening on POST `/mcp`. Notice our explicit import of `@modelcontextprotocol/sdk`.*
> *In `src/mcp/server.ts`, we initialize the `McpServer` named `subtrack-elderguard-mcp` and expose three clean, production-grade Agent Skills: `analyze_suspicious_message`, `get_active_subscriptions`, and `cancel_subscription_alert` — all validated with strict Zod input schemas."*

**Speaker (1:52 - 2:15):**
> *"For the AWS Builder Mini-Challenge, we integrated Amazon Bedrock via `@aws-sdk/client-bedrock-runtime` in `src/aws/bedrockScanner.ts`. When a complex message arrives, Bedrock invokes Claude 3 Haiku to perform deep psychological extortion analysis.*
> *And for high reliability, if cloud credentials are absent during local testing, our built-in Neural Guard engine takes over seamlessly without crashing."*

---

### [2:15 - 2:30] SECTION 4: CLOSING & SUBMISSION

**Visual on Screen:**
- GitHub repository view showing MIT License, README, FRICTION_LOG, and collaborator invites.

**Speaker (2:15 - 2:30):**
> *"SubTrack & ElderGuard is 100% open-source under the MIT License. We have submitted for the Alexa+ Track, AWS Builder, and Open Source challenges, and added all judging collaborators.*
> *Protecting our loved ones is why we build technology. Thank you, and let's bring ElderGuard to Alexa+!"*

**Visual on Screen (2:28 - 2:30):**
- Fade to black with text:
  **SubTrack & ElderGuard MCP Server**  
  *Built with ❤️ for Amazon Hackathon 2026*  
  *GitHub: subtrack-elderguard-mcp*
