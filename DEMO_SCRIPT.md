# SocialPulse AI — 3.5 Minute Demo Script for Judges

A crisp, click-by-click walkthrough demonstrating how persistent Hindsight memory transforms generic content generation into grounded creator intelligence.

---

## Pre-Flight Checklist (Do this 60 seconds before presenting)
- Ensure you are signed in with your Supabase account.
- Open **Memory Lab** (`/memory-lab`) and expand the **Live Demo Safety Checklist**. Confirm all 7 indicators show green or yellow ready states.
- Browser zoom: 100% or 110%. Open full screen.

---

## Script & Click Sequence

### [0:00 – 0:30] The Problem: Generic AI Amnesia
- **Screen:** **Dashboard** (`/`)
- **Action:** Point to the top bar badge: `Hindsight: Connected (User Bank: socialpulse-...)`.
- **Spoken:**
  > *"Every social media AI today suffers from severe amnesia. Even if your post bombed or broke your account's save record yesterday, tomorrow ChatGPT or Claude will recommend the exact same generic advice because LLMs forget everything between sessions. SocialPulse AI gives creators an isolated, persistent memory bank powered by Hindsight Cloud."*
- **What NOT to click:** Do NOT click "Sign Out" or click "Clear Cache" in DevTools.
- **Live Fallback:** If the connection chip says *Setup Required*, point out that the system honestly flags missing keys rather than simulating a fake connection.

---

### [0:30 – 1:00] Real Data: Importing Empirical Telemetry
- **Screen:** **Analytics** (`/analytics`)
- **Action:**
  1. Click **"Import CSV"** in the top right.
  2. Select your exported Meta Business Suite CSV (or point to the already imported 24 published posts).
  3. Highlight the metric tooltips: *"Notice our denominators are strictly Reach (unique accounts), not impressions. Missing values stay null—we never inject fake zeros."*
- **Spoken:**
  > *"We don't simulate vanity data. Creators import real post delivery directly from Meta Business Suite. The app computes reach-weighted engagement, save, and share rates with full auditability."*
- **What NOT to click:** Do not click "Load Sample Data" if you are showing your live personal account with real posts imported.
- **Live Fallback:** If you have no custom CSV on hand, the labeled sample dataset is ready at one click to show identical analytics flows with a visible `[SAMPLE DATA]` badge.

---

### [1:00 – 1:30] Real Insight: Honest Empirical Lesson Extraction
- **Screen:** **Memory Activity** (`/memory-activity`)
- **Action:**
  1. Scroll down to the **Honest Lessons from Real Data** card.
  2. Click **"Suggest Lessons from My Data"**.
  3. Show the generated candidate: e.g. *Carousel save rate exceeds Reel save rate by +2.1% across qualifying cohorts (n=8).*
  4. Point to the limitation sentence: *"This reflects an observed association, not a proven cause."*
- **Spoken:**
  > *"Lessons are never hallucinated by the model; they are computed strictly in code from cohort differences where n is at least 3. And crucially, lessons are NEVER stored into Hindsight automatically—the creator must review and explicitly authorize retention."*
- **What NOT to click:** Do NOT spam the "Retain" button multiple times; duplicate detection will catch it.
- **Live Fallback:** If you have <3 posts per format, point to the honest badge: *"No qualifying cohorts (n>=3 required) to prevent statistical over-fitting."*

---

### [1:30 – 2:15] The Fair Test: Baseline Memory Lab Evaluation
- **Screen:** **Memory Lab** (`/memory-lab`)
- **Action:**
  1. Under the **A/B Experiment Runner**, leave the default topic: `High-Retention Hooks for Carousels`.
  2. Check **"Include baseline repeat (A')"**.
  3. Click **"Run Memory Lab"**.
- **Spoken:**
  > *"To prove memory actually works, we built Memory Lab. It's a scientifically controlled A/B test. Both Test A (without memory) and Test B (with memory) use the exact same prompt template, model (gemini-3.8-flash), low fixed temperature (0.3), and structured JSON schema. The ONLY independent variable is the recalled memory block."*
- **What NOT to click:** Do NOT toggle the model or change inputs while the runner is in flight.
- **Live Fallback:** If Gemini API latency is slow, show the previous completed run in the Historical Runs tab immediately below.

---

### [2:15 – 2:45] Close the Loop: Campaigns & Retention
- **Screen:** **Campaigns** (`/campaigns`)
- **Action:**
  1. Point to an active experiment or click an existing campaign card.
  2. Show **Close the Loop**: A real published post is linked.
  3. Point to the **Computed Empirical Outcome**: Actual Save Rate (4.8%) vs Baseline (2.2%), n=6, Verdict: **MET**.
  4. Point to the **Synthesized Lesson Draft** generated via `/api/campaigns/:id/lesson`:
     > *"Diagram carousel on slide 3 yielded 4.82% save rate (exceeding format baseline of 2.15%, n=6). Association, not proven cause."*
  5. Click **"Retain in Hindsight"**. Show the instant green confirmation badge.
- **Spoken:**
  > *"When a campaign finishes, we close the loop. We compare the post's real performance against format baselines, prompt Gemini to draft an evidence-grounded lesson, and store it into the user's permanent Hindsight bank."*
- **What NOT to click:** Do not click "Retain in Hindsight" a second time; duplicate protection will display *"This exact lesson was already retained."*
- **Live Fallback:** If Hindsight network takes longer than 2 seconds, point to the timestamped retained badge from previous campaigns.

---

### [2:45 – 3:15] Persistence Proof: Memory Recall Across Sessions
- **Screen:** Hard refresh the browser (`Ctrl+R` / `Cmd+R`), then return to **Memory Lab** (`/memory-lab`).
- **Action:**
  1. Point to the retrieved memories list now populating Test B:
     > *"Exact memory retrieved from Hindsight: 'Carousel slide 3 diagram layouts produced an average Save Rate of 4.82%...'"*
  2. Point to Test B's output: The model automatically structured slide 3 around an architecture diagram.
  3. Compare with Test A: Test A used bullet points.
- **Spoken:**
  > *"Even after a full browser refresh, Hindsight retains the creator's intelligence. Test B directly retrieved our stored lesson and adapted the carousel outline, while Test A defaulted to generic text bullets."*
- **What NOT to click:** Do not open an incognito window with a different account, as bank isolation will prevent seeing this user's memories.

---

### [3:15 – 3:45] Compare, Rate & Learning Curve
- **Screen:** Bottom of **Memory Lab** run (`/memory-lab`)
- **Action:**
  1. Point to the **Differences Panel**:
     - Factual token overlap similarity (e.g. 62% overlap).
     - Hook changes, caption changes, and hashtags added.
  2. Star-rate Test B (5 stars for Personalization & Evidence Use). Click **"Save Lab Ratings"**.
  3. Click the **"Learning Curve"** tab to show the historical progression of similarity and satisfaction.
- **Spoken:**
  > *"We don't rely on the AI to tell us why it changed. We compute token overlap similarity in code and log creator ratings over time into a longitudinal learning curve."*

---

### [3:45 – 4:00] Closing Statement
- **Action:** Switch back to **Dashboard** (`/`).
- **Spoken:**
  > *"SocialPulse AI proves that AI content tools shouldn't restart from zero every morning. With Hindsight memory banks, your AI gets smarter with every single post you publish. Thank you."*
