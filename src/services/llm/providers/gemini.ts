import { GoogleGenAI, Type } from "@google/genai";
import { LLMProvider, LeadDiscoveryResult, LeadEnrichmentResult } from "../types";
import { sanitizeLeadDrafts } from "../../../utils/sanitize-draft";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model = "gemini-2.0-flash") {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async discoverLeads(prompt: string): Promise<LeadDiscoveryResult[]> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              industry: { type: Type.STRING },
              location: { type: Type.STRING },
              website: { type: Type.STRING },
              linkedinUrl: { type: Type.STRING },
              phoneNumber: { type: Type.STRING },
              email: { type: Type.STRING },
              painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestedOffering: { type: Type.STRING },
              personalizedDraft: { type: Type.STRING },
              score: { type: Type.NUMBER },
              intelligenceReport: {
                type: Type.OBJECT,
                properties: {
                  profileSummary: { type: Type.STRING },
                  keyMetrics: { type: Type.ARRAY, items: { type: Type.STRING } },
                  opportunityAnalysis: { type: Type.STRING },
                  recentNews: { type: Type.STRING },
                  decisionMakerContext: { type: Type.STRING },
                },
                required: ["profileSummary", "keyMetrics", "opportunityAnalysis"],
              },
            },
          },
        },
      },
    });

    let text = response.text || "[]";

    if (!text.endsWith(']')) {
      if (text.includes('}')) {
        text = text.substring(0, text.lastIndexOf('}') + 1) + ']';
      } else {
        text = "[]";
      }
    }

    return sanitizeLeadDrafts(JSON.parse(text));
  }

  async enrichLead(prompt: string): Promise<LeadEnrichmentResult> {
    const response = await this.ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  }

  async generateConfig(prompt: string): Promise<Record<string, any>> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  }
}
