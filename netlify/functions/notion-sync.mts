import type { Context, Config } from "@netlify/functions";
import { wrapHandler } from './_cost-logger.mjs';

const NOTION_API = "https://api.notion.com/v1/pages";
const NOTION_VERSION = "2022-06-28";
const DATABASE_ID = "1c8674c26436809aa314e54f9fb86647";

const FORMAT_TO_CONTENT_TYPE: Record<string, string> = {
  observation: "Perspective",
  contrarian: "Reframe",
  story: "Client Story",
  framework: "Framework Deep-Dive",
  auto: "Perspective",
};

const CTA_MAP: Record<string, string> = {
  question: "Reply trigger",
  invitation: "Resonating close",
  observation: "No CTA",
  none: "No CTA",
};

const _handler = async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  const notionToken = Netlify.env.get("NOTION_TOKEN");
  if (!notionToken) {
    return new Response(
      JSON.stringify({ error: "NOTION_TOKEN not configured. Add it in Netlify environment variables." }),
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const p = body;
  const title = (p.post || "").split("\n")[0].slice(0, 200) || "Untitled post";

  // Build properties
  const properties: Record<string, any> = {
    Title: { title: [{ text: { content: title } }] },
    Status: { status: { name: p.status === "draft" ? "Not started" : "Published" } },
    "Prompt tool": { select: { name: "Claude" } },
    "Platform(s)": { multi_select: [{ name: "LinkedIn" }] },
    Medium: { multi_select: [{ name: "Text" }] },
  };

  // Publication date
  if (p.publishDate) {
    properties["Publication Date"] = { date: { start: p.publishDate } };
  }

  // Content type from format
  if (p.format && FORMAT_TO_CONTENT_TYPE[p.format]) {
    properties["Content Type"] = { select: { name: FORMAT_TO_CONTENT_TYPE[p.format] } };
  }

  // Topic/Subject from pillar
  if (p.pillar) {
    properties["Topic/Subject"] = { multi_select: [{ name: p.pillar }] };
  }

  // CTA Type
  if (p.ctaType && CTA_MAP[p.ctaType]) {
    properties["CTA Type"] = { select: { name: CTA_MAP[p.ctaType] } };
  } else if (p.ctaStyle && CTA_MAP[p.ctaStyle]) {
    properties["CTA Type"] = { select: { name: CTA_MAP[p.ctaStyle] } };
  }

  // LinkedIn URL
  if (p.linkedinUrl) {
    properties["Link to Asset"] = { url: p.linkedinUrl };
  }

  // Notes (seed idea)
  if (p.seed) {
    properties["Notes"] = { rich_text: [{ text: { content: p.seed.slice(0, 2000) } }] };
  }

  // Metrics
  if (p.metrics) {
    if (p.metrics.impressions != null) properties["Impressions"] = { number: p.metrics.impressions };
    if (p.metrics.comments != null) properties["Comments"] = { number: p.metrics.comments };
    if (p.metrics.clicks != null && p.metrics.impressions) {
      properties["Click Rate"] = { number: p.metrics.clicks / p.metrics.impressions };
    }
  }

  // Build page content (the full post as page body)
  const children: any[] = [];
  if (p.post) {
    // Split post into paragraphs for Notion blocks
    const paragraphs = p.post.split("\n").filter((line: string) => line.trim());
    for (const para of paragraphs.slice(0, 100)) {
      children.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: para.slice(0, 2000) } }],
        },
      });
    }

    // Add separator and metadata
    children.push({ object: "block", type: "divider", divider: {} });

    if (p.hook) {
      children.push({
        object: "block",
        type: "callout",
        callout: {
          rich_text: [{ type: "text", text: { content: `Hook used (${p.hookLabel || ""}): ${p.hook}` } }],
          icon: { emoji: "🎣" },
        },
      });
    }
  }

  // Create the page in Notion
  const notionBody: any = {
    parent: { database_id: DATABASE_ID },
    properties,
  };
  if (children.length > 0) {
    notionBody.children = children;
  }

  try {
    const res = await fetch(NOTION_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify(notionBody),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data.message || "Notion API error", details: data }),
        { status: res.status }
      );
    }

    return new Response(
      JSON.stringify({ success: true, pageId: data.id, url: data.url }),
      { status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to reach Notion" }),
      { status: 500 }
    );
  }
};

export default wrapHandler(_handler, {
  project: '30-li-post-studio-goto11',
  function_name: 'notion-sync',
});

export const config: Config = {
  path: "/api/notion-sync",
};
