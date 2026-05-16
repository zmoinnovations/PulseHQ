import OpenAI from "openai";
import { LLMProvider, LeadDiscoveryResult, LeadEnrichmentResult } from "../types";
import { sanitizeLeadDrafts } from "../../../utils/sanitize-draft";

const discoverySchema = {
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
            required: [
              "profileSummary", "keyMetrics", "opportunityAnalysis",
              "recentNews", "decisionMakerContext",
            ],
            additionalProperties: false,
          },
        },
        required: [
          "id", "name", "industry", "location", "website", "linkedinUrl",
          "phoneNumber", "email", "painPoints", "suggestedOffering",
          "personalizedDraft", "score", "intelligenceReport",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["leads"],
  additionalProperties: false,
};

const enrichmentSchema = {
  type: "object" as const,
  properties: {
    email: { type: "string" as const },
    phoneNumber: { type: "string" as const },
  },
  required: ["email", "phoneNumber"],
  additionalProperties: false,
};

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = "gpt-4o") {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async discoverLeads(prompt: string): Promise<LeadDiscoveryResult[]> {
    const response = await this.client.responses.create({
      model: this.model,
      input: prompt,
      tools: [{ type: "web_search" }],
      text: {
        format: {
          type: "json_schema",
          name: "lead_discovery",
          strict: true,
          schema: discoverySchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text);
    return sanitizeLeadDrafts(parsed.leads);
  }

  async enrichLead(prompt: string): Promise<LeadEnrichmentResult> {
    const response = await this.client.responses.create({
      model: this.model,
      input: prompt,
      tools: [{ type: "web_search" }],
      text: {
        format: {
          type: "json_schema",
          name: "lead_enrichment",
          strict: true,
          schema: enrichmentSchema,
        },
      },
    });

    return JSON.parse(response.output_text);
  }

  async generateConfig(prompt: string): Promise<Record<string, any>> {
    const response = await this.client.responses.create({
      model: this.model,
      input: prompt,
      tools: [{ type: "web_search" }],
    });

    return JSON.parse(response.output_text);
  }
}
