import { Lead } from "../types";

export function exportLeadsCSV(leads: Lead[]): void {
  const headers = ['name', 'contactPerson', 'industry', 'location', 'email', 'phoneNumber', 'linkedinUrl', 'score', 'source', 'status'];
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const rows = leads.map(lead =>
    headers.map(h => escape(String((lead as any)[h] ?? ''))).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pulsehq-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
