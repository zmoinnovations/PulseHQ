import Anthropic from "@anthropic-ai/sdk";
import { LLMProvider, LeadDiscoveryResult, LeadEnrichmentResult } from "../types";
import { sanitizeLeadDrafts } from "../../../utils/sanitize-draft";

const discoveryInputSchema = {
  type: "object" as const,
  properties: {
    leads: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          name: { type: "string" as const },
          industry: { type: "string" as const },
          location: { type: "string" as const },
          website: { type: "string" as const },
          linkedinUrl: { type: "string" as const },
          phoneNumber: { type: "string" as const },
          email: { type: "string" as const },
          painPoints: { type: "array" as const, items: { type: "string" as const } },
          suggestedOffering: { type: "string" as const },
          personalizedDraft: { type: "string" as const },
          score: { type: "number" as const },
          intelligenceReport: {
            type: "object" as const,
            properties: {
              profileSummary: { type: "string" as const },
              keyMetrics: { type: "array" as const, items: { type: "string" as const } },
              opportunityAnalysis: { type: "string" as const },
              recentNews: { type: "string" as const },
              decisionMakerContext: { type: "string" as const },
            },
            required: ["profileSummary", "keyMetrics", "opportunityAnalysis"],
          },
        },
        required: [
          "name", "industry", "location", "painPoints",
          "suggestedOffering", "personalizedDraft", "score", "intelligenceReport",
        ],
      },
    },
  },
  required: ["leads"],
};

const enrichmentInputSchema = {
  type: "object" as const,
  properties: {
    email: { type: "string" as const },
    phoneNumber: { type: "string" as const },
  },
  required: ["email", "phoneNumber"],
};

export class ClaudeProvider implements LLMProvider {
  readonly name = "claude";
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = "claude-sonnet-4-6") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async discoverLeads(prompt: string): Promise<LeadDiscoveryResult[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 10,
        },
        {
          name: "return_leads",
          description: "Return the discovered leads as structured data.",
          input_schema: discoveryInputSchema,
        },
      ],
      tool_choice: { type: "any" },
    });

    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === "return_leads") {
        const result = block.input as { leads: LeadDiscoveryResult[] };
        return sanitizeLeadDrafts(result.leads);
      }
    }

    // Fallback: try to parse text content as JSON
    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    if (textContent) {
      try {
        return sanitizeLeadDrafts(JSON.parse(textContent));
      } catch {
        // ignore parse errors
      }
    }

    return [];
  }

  async enrichLead(prompt: string): Promise<LeadEnrichmentResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
        {
          name: "return_contact",
          description: "Return the discovered contact information.",
          input_schema: enrichmentInputSchema,
        },
      ],
      tool_choice: { type: "any" },
    });

    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === "return_contact") {
        return block.input as LeadEnrichmentResult;
      }
    }

    return {};
  }

  async generateConfig(prompt: string): Promise<Record<string, any>> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
    });

    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Extract JSON from response (may be wrapped in markdown fences)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return JSON.parse(textContent);
  }
}
