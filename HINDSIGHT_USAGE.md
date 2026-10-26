# How Hindsight Is Used in SocialPulse AI

A Judge & Reviewer Guide to Agentic Memory, Per-User Isolation, and Controlled Evaluation.

---

## 1. The Autonomous Learning Loop

SocialPulse AI bridges the gap between raw social post telemetry and future content synthesis through a closed, six-stage memory loop:

```
    [1. OBSERVE] ---> Real delivery metrics imported from Meta Business Suite CSV
         |
         v
    [2. RETAIN]  ---> Creator formulates hypothesis & tests; verified lesson stored into Hindsight
         |
         v
    [3. RECALL]  ---> Content Studio & Memory Lab semantically retrieve past rules for current topic
         |
         v
    [4. APPLY]   ---> Gemini models ingest retrieved memory block alongside format & audience brief
         |
         v
    [5. EXPLAIN] ---> System code computes factual token overlap, cited memories & delta
         |
         v
    [6. LEARN]   ---> Post-flight campaign evaluation updates baseline and stores next iteration
```

- **Observe:** Zero simulated numbers. Real Instagram post delivery (unique reach, saves, likes, comments, shares) provides the factual grounding. Missing metrics remain `null`, never substituted with misleading zeros.
- **Retain:** Lessons are **never** stored automatically without creator authorization. Every lesson includes sample size ($n \ge 3$), observed metric movement, and an explicit disclaimer (*"observed association, not proven cause"*).
- **Recall:** Memory queries target strictly the verified user's isolated memory bank (`socialpulse-<user-id>`). Cross-user leakage is prevented at both the application and database tiers.
- **Apply:** Model prompts inject only genuine recalled memories. If recall fails or is empty, the memory block is omitted, ensuring honest zero-shot behavior.
- **Explain:** Output differences between baseline and memory-informed runs are calculated via deterministic code (token-overlap Jaccard similarity, hook shifts, memory citations) rather than ungrounded LLM self-reporting.
- **Learn:** When new posts are published, campaigns close the loop by calculating actual performance vs. format baseline, generating empirical lessons for subsequent synthesis.

---

## 2. Three Concrete Example Memories Stored in the App

1. **Format & Slide Architecture Lesson:**
   > *"Carousel slide 3 diagram layouts produced an average Save Rate of 4.82% vs 2.15% for text-only bullet slides across 6 tested carousels (n=6). Note: Observed association, not proven cause."*
   - **Context:** `campaign_experiment`
   - **Target Metric:** `save_rate`
   - **Downstream Effect:** Future carousel briefs automatically incorporate visual diagrams and architecture outlines on slide 3 rather than generic text summaries.

2. **Hook Timing & Pacing Lesson:**
   > *"Reels opening with visual failure demos before title cards averaged 14.2% engagement rate vs 6.1% for talking-head intros (n=5). Note: Observed association, not proven cause."*
   - **Context:** `format_strategy`
   - **Target Metric:** `engagement_rate`
   - **Downstream Effect:** Video concept hooks shift immediately to showing physical contrast or mistake post-mortems in the first 2 seconds.

3. **Call-To-Action Behavioral Shift:**
   > *"Explicit 'Save for reference when building' CTAs outperformed general 'Follow for more' prompts by +84% relative bookmark volume across technical tutorials (n=8)."*
   - **Context:** `cta_optimization`
   - **Target Metric:** `save_rate`
   - **Downstream Effect:** CTAs avoid vanity follower requests in favor of high-utility bookmark reminders.

---

## 3. Where Memory Is Visible in the UI

Memory is intentionally prominent and auditable across the application:

| UI Location | Memory Presentation | Verification Rule |
| :--- | :--- | :--- |
| **Top Navigation Bar** | Real-time status indicator (`Hindsight: Connected` with user bank ID `socialpulse-<user-id>`) | Live diagnostic ping via `/api/status` |
| **Dashboard** | Memory Telemetry Cards: Lessons Retained, Successful Recalls, Failed Calls, Latest Recall preview | Computed from database rows; transparent failure counts |
| **Content Studio** | Blue/Purple "Hindsight Memory Recall Status" banner with exact numbered memory strings | Only displayed if recall succeeded; filtered strictly to returned memories |
| **Memory Lab** | Side-by-side comparison: **Test A (Without Memory)** vs. **Test B (With Retrieved Memory)** + Code-computed Differences panel | Identical model, seed temperature (0.3), and prompt template |
| **Memory Activity** | **Lesson Impact & Recall Evidence** card showing downstream recall counts for every stored lesson | Text-containment matching against saved Lab runs and studio ideas |
| **Campaigns** | "Retained Lesson in Hindsight Memory" block attached to closed-loop experiments | Shows exact retained text, timestamp, and memory event ID |

---

## 4. How a Judge Can Reproduce Before vs. After in Under 2 Minutes

Follow this quick evaluation protocol:

1. **Open the App:** Navigate to **Memory Lab** (`/memory-lab`) via the left sidebar.
2. **Review System Readiness:** Notice the **Live Demo Safety Checklist** at the top verifying that keys and banks are active.
3. **Inspect the Shared Brief:** Keep the default parameters:
   - **Topic:** `High-Retention Hooks for Carousels`
   - **Format:** `Carousel`
   - **Optimization Goal:** `Increase Bookmark Saves`
   - **Baseline Repeat (A'):** Checked (runs Test A twice to measure natural baseline variation)
4. **Click "Run Memory Lab":**
   - The server performs one single recall against Hindsight for your account.
   - It executes Test A (Zero-Shot Gemini at temp 0.3).
   - It executes Test B (Gemini with the recalled memory block at temp 0.3).
   - It executes Test A' (Natural variation control).
5. **Inspect the Results:**
   - **Without Memory (Left Column):** Outputs generic advice (e.g., standard educational tips).
   - **With Retrieved Memory (Right Column):** Directly cites and incorporates your account's empirical lessons (e.g., slide 3 architecture diagrams, utility-focused save CTAs).
   - **Retrieved Memories Panel:** Inspect the exact memories pulled from Hindsight Cloud.
   - **Differences Panel:** Review the deterministic Jaccard similarity percentage, hook changes, and hashtag delta.
6. **Submit an Evaluation Rating:** Rate Relevance, Personalization, and Evidence Use to append to the historical Learning Curve.
