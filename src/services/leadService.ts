import { Lead, Batch, SearchMode, BusinessConfig } from "../types";

export async function discoverLeads(location: string, niche: string, mode: SearchMode = 'individuals', businessId?: string): Promise<Lead[]> {
  const res = await fetch('/api/leads/discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location, niche, mode, businessId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Discovery failed: ${res.status}`);
  }
  return res.json();
}

export async function loadBatches(): Promise<Batch[]> {
  const res = await fetch('/api/batches/load');
  return res.json();
}

export async function saveBatches(batches: Batch[]): Promise<void> {
  await fetch('/api/batches/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batches),
  });
}

export async function loadBusinessConfigs(): Promise<BusinessConfig[]> {
  const res = await fetch('/api/business-configs');
  return res.json();
}

export async function saveBusinessConfig(config: BusinessConfig): Promise<BusinessConfig> {
  const res = await fetch('/api/business-configs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function deleteBusinessConfig(id: string): Promise<void> {
  await fetch(`/api/business-configs/${id}`, { method: 'DELETE' });
}

export async function generateBusinessConfig(params: { prompt?: string; websiteUrl?: string }): Promise<BusinessConfig> {
  const res = await fetch('/api/business-configs/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Config generation failed: ${res.status}`);
  }
  return res.json();
}

export async function enrichLead(lead: Lead): Promise<Partial<Lead>> {
  const res = await fetch('/api/leads/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: lead.name,
      website: lead.website,
      location: lead.location,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Enrichment failed: ${res.status}`);
  }
  return res.json();
}
