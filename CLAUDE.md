# Go To 11 — LinkedIn Post Studio

## What you're building

A single-page web app for Kenny Solway (Go To 11) to write and track LinkedIn posts.
Live site: https://goto11-li-post-studio.netlify.app/

The current live site is a generic LinkedIn dashboard. Replace it entirely with the Post Studio described below.

## Stack

- Single `index.html` file — no framework, no build step
- Google Fonts (Nunito + PT Sans) via CDN
- Anthropic API called client-side (model: `claude-sonnet-4-20250514`)
- `window.storage` for persistent post history (no backend needed yet)
- Deploy: push to connected GitHub repo → Netlify auto-deploys

## Brand

Fonts: Nunito (headings, labels, weight 700) + PT Sans (body, textareas)

Colours:
- Dark Purple `#9439bf` — primary actions, active states
- Light Purple `#bfb1c4` — secondary/muted
- Light Sand `#f4d4b7` — accents
- Dark Grey `#66615c` — body text
- Off White `#ebeaeb` — backgrounds

## App structure — four steps

### Step 1 — Seed idea
- Large textarea: "What's on your mind?"
- Format selector (5 options): Auto / Observation / Contrarian Reframe / Story → Lesson / Framework
- Button: Generate hooks → (API call #1)

### Step 2 — Pick a hook
- Three hook cards from API response
- Click to select
- Buttons: Write the post → / Back / Try new hooks

### Step 3 — Your post
- Editable textarea with generated post
- Word count (green 150–250, red if over)
- Copy button
- Pre-publish checklist (10 items, tick to strike through)
- Buttons: Change hook / Rewrite / Start over
- "Save to tracker" button — saves the post to Step 4 storage

### Step 4 — Post tracker
- Sits below the wizard, separated by a divider (or a second tab — judge what looks cleaner)
- Summary bar: total posts, average engagement rate, best engagement rate, highest save rate, total impressions
- Table: Date | Preview | Format | Impressions | Eng. rate | Saves | Comments | Shares
- Click any row to expand: full post, all raw metrics, all calculated rates, seed idea, hook used
- Manual metric entry form per post (enter LinkedIn numbers after publishing)
- Flag posts above 7% engagement rate visually
- Flag posts with save rate above 1% as exceptional

## System prompt — bake into every API call

```
You are ghostwriting LinkedIn posts for Kenny Solway, founder of Go To 11 Communication Training. He is a Decision Acceleration Partner — NOT a presentation coach, public speaking trainer, storytelling expert, or slide designer. Never frame him this way.

VOICE: Canadian English. No em dashes. Short sentences. White space. Confident but warm. No buzzwords (leverage, synergy, unlock). No LinkedIn clichés. Sounds like a real person thinking out loud.

TWO THREADS (at least one per post):
- Confidence: preparation → clarity → confidence → trust → approval
- Cost: unclear communication has quantifiable costs — wasted meetings, delayed decisions, stalled revenue

FORMATS:
- Observation: you noticed something, here's why it matters
- Contrarian reframe: challenge a common assumption
- Story → Lesson: specific moment then takeaway (story max 3–5 sentences)
- Framework: spotlight a model with a practical example

CRAFT PRINCIPLES:
- T-shirt test: at least one line works as a standalone pull quote
- Order of revelation: hook programs the right frame
- Steal thunder: exclude the wrong reader neutrally
- Anti-hype: let logic persuade, not volume
- Bucket brigades: bridges at transition points (1–2 max)
- No "I help leaders" openers
- Direct address: you, your team, your next meeting

STRUCTURE: Hook → argument/story/observation → clear insight → soft CTA
TARGET: 150–250 words. Line breaks for mobile readability.

CTA: soft invitation only — never "like and share", never "follow me", never an exclamation mark.

SIMPLIFICATION: Swap every complex word for a simpler one. No word over two syllables unless it is a Kenny signature term (velocity, alignment, structure, confidence, clarity, cost, preparation, framing, revenue).

NEVER frame Kenny as a presentation coach, speaker trainer, storytelling expert, or motivational speaker.
```

## API calls

### Hook generation
```
Kenny's seed idea: "[SEED]"

[FORMAT INSTRUCTION — e.g. "Pick whichever format best fits the idea." or "Use the Contrarian Reframe format."]

Generate exactly 3 hooks (opening lines). Each hook is 1–2 short sentences max. Label them Hook A, Hook B, Hook C. No extra explanation. No preamble. Just the three hooks.
```

### Post generation
```
Kenny's seed idea: "[SEED]"
Chosen hook: "[HOOK]"

[FORMAT INSTRUCTION]

Write the complete LinkedIn post. Open with the chosen hook exactly as written. Build the argument, story, or observation. Land on a clear insight. End with a soft CTA. Target 150–250 words. Line breaks for mobile. No hashtags. No emojis. Canadian English. No em dashes.
```

## Pre-publish checklist (10 items)

1. Hook stops the scroll — no clichés, no throat-clearing
2. 150–250 words
3. Canadian English (favour, organisation, colour)
4. No em dashes anywhere in the post
5. No hashtags or emojis
6. At least one t-shirt line — a standalone pull quote
7. Confidence or cost thread is present
8. Soft invitation CTA — not pushy, not performative
9. Sounds like a real person, not a content template
10. No deficit framing — reader is a high performer

## Post data structure

```json
{
  "id": "timestamp string",
  "date": "2026-04-07",
  "seed": "rough idea text",
  "hook": "chosen hook text",
  "hookLabel": "Hook C",
  "format": "contrarian",
  "post": "full post text",
  "metrics": {
    "impressions": null,
    "reactions": null,
    "comments": null,
    "shares": null,
    "saves": null,
    "reposts": null,
    "clicks": null,
    "followsGained": null,
    "profileViews": null
  }
}
```

## Calculated rates (derive from metrics, never store)

```js
engagementRate = (reactions + comments + shares + saves) / impressions * 100
commentRate    = comments / impressions * 100
shareRate      = shares / impressions * 100
saveRate       = saves / impressions * 100
clickRate      = clicks / impressions * 100
```

Exclude null metrics from calculations — missing data should not zero out a rate.

## Signal hierarchy (most to least meaningful)

1. Engagement rate — headline number, most comparable across posts
2. Save rate — highest intent signal
3. Comment rate — triggered a real reaction
4. Share/repost rate — people put their name behind it
5. Impressions — volume only, easily distorted

## Key rules

- Kenny is NOT a presentation coach, speaker trainer, or motivational speaker — hard rule everywhere
- Canadian English in UI copy too, not just post output
- No em dashes anywhere — including labels and UI text
- No deficit framing — readers are high performers, not people with problems
- Fast and frictionless — every step should feel immediate

## Notion integration

The Post Studio saves posts to localStorage. To sync to Notion:
- Kenny says "push my latest post to Notion" (or "sync all unpushed posts")
- Claude Code reads from the live site's localStorage or from Kenny's description
- Claude Code creates pages in the Content Calendar database:
  - **Database URL:** https://www.notion.so/goto11ca/1c8674c26436809aa314e54f9fb86647
  - **Data source:** collection://1c8674c2-6436-81af-b6dc-000b6625cbd3

### Field mapping (Post Studio → Notion)

| Post Studio | Notion property | Notes |
|---|---|---|
| post (first line) | Title | First line of the post |
| status | Status | draft → Not started, published → Published |
| publishDate | Publication Date | date:Publication Date:start |
| format | Content Type | observation → Perspective, contrarian → Reframe, story → Client Story, framework → Framework Deep-Dive |
| pillar | Topic/Subject | JSON array |
| ctaStyle | CTA Type | question → Reply trigger, invitation → Resonating close, observation → No CTA |
| linkedinUrl | Link to Asset | |
| post (full text) | Page content body | |
| seed | Notes | |
| impressions | Impressions | |
| comments | Comments | |
| "Claude" | Prompt tool | Always Claude |
| "LinkedIn" | Platform(s) | Always LinkedIn |
| "Text" | Medium | Default to Text |

## Planned future features (do not build yet)

- Survivor episode mode (weekly communication lesson posts)
- Post history analysis / pattern spotting across top performers
- Backend API to enable direct Notion sync from the browser
