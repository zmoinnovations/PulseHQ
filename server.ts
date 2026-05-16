import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { createProvider } from "./src/services/llm/factory";
import { buildDiscoveryPrompt, buildEnrichmentPrompt, buildConfigGenerationPrompt } from "./src/services/llm/prompt-builder";
import { BusinessConfig, SearchMode } from "./src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Mailer only if credentials exist
const createTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: SMTP_PORT === '465',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

// Initialize LLM provider from env
const llmProvider = createProvider();
console.log(`[LLM] Provider: ${llmProvider.name}`);

// Business config storage
const BUSINESS_CONFIGS_FILE = path.join(process.cwd(), 'business_configs_storage.json');

async function loadAllBusinessConfigs(): Promise<BusinessConfig[]> {
  try {
    const data = await fs.readFile(BUSINESS_CONFIGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // First run: migrate from public/business-config.json
    try {
      const configPath = path.join(process.cwd(), 'public', 'business-config.json');
      const raw = await fs.readFile(configPath, 'utf-8');
      const legacy = JSON.parse(raw);
      const migrated: BusinessConfig = { id: crypto.randomUUID(), ...legacy };
      await fs.writeFile(BUSINESS_CONFIGS_FILE, JSON.stringify([migrated], null, 2), 'utf-8');
      return [migrated];
    } catch {
      return [];
    }
  }
}

async function loadBusinessConfigById(businessId?: string): Promise<BusinessConfig> {
  const configs = await loadAllBusinessConfigs();
  if (businessId) {
    const found = configs.find(c => c.id === businessId);
    if (found) return found;
  }
  if (configs.length > 0) return configs[0];
  // Ultimate fallback
  const configPath = path.join(process.cwd(), 'public', 'business-config.json');
  const raw = await fs.readFile(configPath, 'utf-8');
  return { id: 'fallback', ...JSON.parse(raw) };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // File persistence paths
  const LEADS_FILE = path.join(process.cwd(), 'leads_storage.json');
  const BATCHES_FILE = path.join(process.cwd(), 'batches_storage.json');

  // API Routes
  app.get("/api/leads/load", async (req, res) => {
    try {
      const data = await fs.readFile(LEADS_FILE, 'utf-8');
      const raw = JSON.parse(data);
      // Normalize legacy fields (businessName -> name, companyOverview -> profileSummary)
      const leads = raw.map((l: any) => ({
        ...l,
        name: l.name || l.businessName || 'Unknown',
        intelligenceReport: {
          ...l.intelligenceReport,
          profileSummary: l.intelligenceReport?.profileSummary || l.intelligenceReport?.companyOverview || '',
        },
      }));
      res.json(leads);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/leads/save", async (req, res) => {
    try {
      const leads = req.body;
      await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
      res.json({ status: "success", count: leads.length });
    } catch (error) {
      console.error("Save error:", error);
      res.status(500).json({ error: "Failed to save leads" });
    }
  });

  // Batch endpoints
  app.get("/api/batches/load", async (req, res) => {
    try {
      const data = await fs.readFile(BATCHES_FILE, 'utf-8');
      res.json(JSON.parse(data));
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/batches/save", async (req, res) => {
    try {
      const batches = req.body;
      await fs.writeFile(BATCHES_FILE, JSON.stringify(batches, null, 2), 'utf-8');
      res.json({ status: "success", count: batches.length });
    } catch (error) {
      console.error("Batch save error:", error);
      res.status(500).json({ error: "Failed to save batches" });
    }
  });

  // Business config endpoints
  app.get("/api/business-configs", async (req, res) => {
    try {
      const configs = await loadAllBusinessConfigs();
      res.json(configs);
    } catch (error: any) {
      console.error("Load configs error:", error);
      res.status(500).json({ error: "Failed to load business configs" });
    }
  });

  app.post("/api/business-configs", async (req, res) => {
    try {
      const config: BusinessConfig = req.body;
      if (!config.id) config.id = crypto.randomUUID();
      const configs = await loadAllBusinessConfigs();
      const idx = configs.findIndex(c => c.id === config.id);
      if (idx >= 0) {
        configs[idx] = config;
      } else {
        configs.push(config);
      }
      await fs.writeFile(BUSINESS_CONFIGS_FILE, JSON.stringify(configs, null, 2), 'utf-8');
      res.json(config);
    } catch (error: any) {
      console.error("Save config error:", error);
      res.status(500).json({ error: "Failed to save business config" });
    }
  });

  app.delete("/api/business-configs/:id", async (req, res) => {
    try {
      const configs = await loadAllBusinessConfigs();
      const filtered = configs.filter(c => c.id !== req.params.id);
      await fs.writeFile(BUSINESS_CONFIGS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      res.json({ status: "deleted" });
    } catch (error: any) {
      console.error("Delete config error:", error);
      res.status(500).json({ error: "Failed to delete business config" });
    }
  });

  app.post("/api/business-configs/generate", async (req, res) => {
    const { prompt: userPrompt, websiteUrl } = req.body;
    if (!userPrompt && !websiteUrl) {
      return res.status(400).json({ error: "Either prompt or websiteUrl is required" });
    }

    try {
      const llmPrompt = buildConfigGenerationPrompt(userPrompt, websiteUrl);
      const result = await llmProvider.generateConfig(llmPrompt);
      res.json({ ...result, id: crypto.randomUUID() });
    } catch (error: any) {
      console.error("[LLM] Config generation error:", error);
      res.status(500).json({ error: error.message || "Config generation failed" });
    }
  });

  // LLM-powered lead discovery
  app.post("/api/leads/discover", async (req, res) => {
    const { location, niche, mode, businessId } = req.body;
    if (!location || !niche) {
      return res.status(400).json({ error: "location and niche are required" });
    }

    try {
      const config = await loadBusinessConfigById(businessId);
      const searchMode: SearchMode = mode === 'businesses' ? 'businesses' : 'individuals';
      const prompt = buildDiscoveryPrompt(location, niche, config, searchMode);
      const results = await llmProvider.discoverLeads(prompt);

      const leads = results.map((l) => ({
        ...l,
        id: l.id || crypto.randomUUID(),
        status: "ready",
        intelligenceReport: l.intelligenceReport || {
          companyOverview: "Intelligence summary unavailable.",
          keyMetrics: [],
          opportunityAnalysis: "TBD",
        },
      }));

      res.json(leads);
    } catch (error: any) {
      console.error("[LLM] Discovery error:", error);
      res.status(500).json({ error: error.message || "Lead discovery failed" });
    }
  });

  // LLM-powered lead enrichment
  app.post("/api/leads/enrich", async (req, res) => {
    const { name, website, location } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    try {
      const prompt = buildEnrichmentPrompt(name, website, location);
      const result = await llmProvider.enrichLead(prompt);
      res.json(result);
    } catch (error: any) {
      console.error("[LLM] Enrichment error:", error);
      res.status(500).json({ error: error.message || "Lead enrichment failed" });
    }
  });

  app.post("/api/email/send", async (req, res) => {
    const { to, subject, html } = req.body;
    console.log(`[SMTP] Attempting dispatch to: ${to}`);
    
    const transporter = createTransporter();
    if (!transporter) {
      console.error("[SMTP] Failed - No configuration found in environment variables.");
      return res.status(500).json({ error: "SMTP is not configured in environment variables. Please check your .env file." });
    }

    try {
      // Split by double newline to identify true paragraphs from the AI
      const paragraphs = html.split(/\n\s*\n/).filter((p: string) => p.trim());
      const formattedHtml = paragraphs.map((p: string) => `<p style="margin-bottom: 24px;">${p.replace(/\n/g, '<br>')}</p>`).join('');

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #111; max-width: 600px;">
          <div style="color: #111;">${formattedHtml}</div>
          <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; font-size: 11px; color: #aaa;">
            Sent by ${process.env.SMTP_FROM_NAME || 'PulseHQ'}
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'PulseHQ'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        ...(process.env.SMTP_BCC ? { bcc: process.env.SMTP_BCC } : {}),
        subject,
        html: emailHtml,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("SMTP error:", error);
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
