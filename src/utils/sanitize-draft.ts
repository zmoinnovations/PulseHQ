import { LeadDiscoveryResult } from "../services/llm/types";

/**
 * Post-processes LLM-generated lead drafts to remove unwanted characters
 * that slip through despite prompt instructions (em dashes, etc.)
 */
export function sanitizeLeadDrafts(leads: LeadDiscoveryResult[]): LeadDiscoveryResult[] {
  return leads.map(lead => ({
    ...lead,
    personalizedDraft: sanitizeText(lead.personalizedDraft),
    suggestedOffering: sanitizeText(lead.suggestedOffering),
  }));
}

function sanitizeText(text: string): string {
  if (!text) return text;
  return text
    // Replace em dash (—) and en dash (–) with hyphen
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    // Replace fancy quotes with straight quotes
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}
