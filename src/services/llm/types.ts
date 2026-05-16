export interface LLMProvider {
  readonly name: string;
  discoverLeads(prompt: string): Promise<LeadDiscoveryResult[]>;
  enrichLead(prompt: string): Promise<LeadEnrichmentResult>;
  generateConfig(prompt: string): Promise<Record<string, any>>;
}

export interface LeadDiscoveryResult {
  id?: string;
  name: string;
  industry: string;
  location: string;
  website?: string;
  linkedinUrl?: string;
  phoneNumber?: string;
  email?: string;
  painPoints: string[];
  suggestedOffering: string;
  personalizedDraft: string;
  score: number;
  intelligenceReport: {
    profileSummary: string;
    keyMetrics: string[];
    opportunityAnalysis: string;
    recentNews?: string;
    decisionMakerContext?: string;
  };
}

export interface LeadEnrichmentResult {
  email?: string;
  phoneNumber?: string;
}
