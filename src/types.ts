/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export interface BusinessConfig {
  id: string;
  company: {
    name: string;
    website: string;
    headquarters: string;
    description: string;
  };
  products: { name: string; summary: string }[];
  sellingPoints: string[];
  targetProfiles: string[];
  scoring: {
    high: string;
    medium: string;
    low: string;
  };
  outreach: {
    tone: string;
    avoidWords: string[];
    painPointExamples: string[];
    productExamples: string[];
    signature: string;
  };
}

export interface Lead {
  id: string;
  name: string;
  contactPerson?: string;
  industry: string;
  location: string;
  website?: string;
  linkedinUrl?: string;
  email?: string;
  phoneNumber?: string;
  painPoints: string[];
  suggestedOffering: string;
  personalizedDraft: string;
  status: 'new' | 'analyzing' | 'ready' | 'contacted';
  score: number;
  source?: string;
  batchId?: string;
  intelligenceReport: {
    profileSummary: string;
    keyMetrics: string[];
    opportunityAnalysis: string;
    recentNews?: string;
    decisionMakerContext?: string;
  };
}

export type SearchMode = 'individuals' | 'businesses';

export interface Batch {
  id: string;
  name: string;
  createdAt: string;
  mode: SearchMode;
  locations: string[];
  niches: string[];
  leadCount: number;
  businessId?: string;
}

export interface SearchParams {
  locations: string[];
  niches: string[];
}
