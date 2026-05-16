import { BusinessConfig, SearchMode } from "../../types";

export function buildDiscoveryPrompt(location: string, niche: string, config: BusinessConfig, mode: SearchMode = 'individuals'): string {
  const productList = config.products.map(p => `- ${p.name}: ${p.summary}`).join('\n');
  const sellingPoints = config.sellingPoints.map(s => `- ${s}`).join('\n');
  const targetProfiles = config.targetProfiles.map(t => `- ${t}`).join('\n');
  const avoidWords = config.outreach.avoidWords.map(w => `"${w}"`).join(', ');
  const painExamples = config.outreach.painPointExamples.join(', ');
  const productExamples = config.outreach.productExamples.join(', ');

  const modeInstructions = mode === 'individuals'
    ? `Find 5 real, named INDIVIDUALS in ${location} working in or connected to the ${niche} industry who would be ideal prospects for ${config.company.description}.

    IMPORTANT: Return PEOPLE, not companies. Find entrepreneurs, business owners, executives, professionals, diplomats, investors, or high-net-worth individuals by name. Each lead must be a specific person with their full name.`
    : `Find 5 real BUSINESSES or ORGANIZATIONS in ${location} operating in or connected to the ${niche} industry who would be ideal prospects for ${config.company.description}.

    IMPORTANT: Return COMPANIES/ORGANIZATIONS, not individual people. Find established businesses, startups, firms, or institutions by their official name. Each lead must be a specific company or organization.`;

  const searchInstructions = mode === 'individuals'
    ? `For each individual, use web search to find:
    1. Full Name, their role/title, and any online presence (LinkedIn, Twitter/X, website).
    2. LinkedIn profile URL — search for their name on linkedin.com and return the full profile URL.
    3. Personal or work Email (search LinkedIn profiles, company pages, speaker bios, press mentions).
    4. WhatsApp/Phone Number (for direct messaging).
    5. Pain points relevant to their personal financial situation (e.g., ${painExamples}).
    6. A highly personalized outreach message addressed to them by name.`
    : `For each business, use web search to find:
    1. Official business name, what they do, and their online presence (website, LinkedIn company page).
    2. LinkedIn company page URL — search for the business on linkedin.com and return the full page URL.
    3. Business contact Email (search company website, LinkedIn, directories, press mentions).
    4. Phone Number (company main line or decision-maker direct).
    5. Pain points relevant to their business operations (e.g., ${painExamples}).
    6. A highly personalized outreach message addressed to the company.`;

  const hookInstruction = mode === 'individuals'
    ? '- Hook: Reference their specific role, company, or recent activity.'
    : '- Hook: Reference their specific business, market position, or recent company news.';

  const painInstruction = mode === 'individuals'
    ? '- Pain: Briefly mention a problem relevant to someone in their position.'
    : '- Pain: Briefly mention a business challenge relevant to their industry or scale.';

  const addressInstruction = mode === 'individuals'
    ? '- Address them by first name in the message.'
    : '- Address the company by name or use "your team" in the message.';

  const jsonMapping = mode === 'individuals'
    ? `JSON field mapping:
    - "name": the person's full name (NOT a company name)
    - "industry": their sector
    - "linkedinUrl": full LinkedIn profile URL (e.g. "https://www.linkedin.com/in/username")
    - "intelligenceReport.profileSummary": brief background on who this person is and why they're a good prospect`
    : `JSON field mapping:
    - "name": the official business/organization name (NOT a person's name)
    - "contactPerson": full name and title of the key decision-maker or contact person at this business (e.g. "Sarah Chen, Head of Operations")
    - "industry": their sector
    - "linkedinUrl": full LinkedIn company page URL (e.g. "https://www.linkedin.com/company/name")
    - "intelligenceReport.profileSummary": brief overview of the company, what they do, and why they're a good prospect`;

  return `
    ${modeInstructions}

    Company: ${config.company.name}
    Website: ${config.company.website}
    Headquarters: ${config.company.headquarters}

    Products (MUST mention at least 2 in outreach):
${productList}

    Key Selling Points:
${sellingPoints}

    Target Profiles (who to find):
${targetProfiles}

    ${searchInstructions}

    Lead Scoring Priority (score 1-10):
    - 9-10: ${config.scoring.high}
    - 7-8: ${config.scoring.medium}
    - 5-6: ${config.scoring.low}

    Outreach Requirements (100% HUMAN FEEL):
    - Tone: ${config.outreach.tone}
    - NO AI Words: Skip ${avoidWords}.
    - NEVER use em-dashes (—) or en-dashes (–). Use hyphens (-) only for compound words. NO exclamation marks more than once.
    ${hookInstruction}
    ${painInstruction}
    - Solution: Mention 2 specific products that fit them (e.g., ${productExamples}).
    - Proof: Reference key selling points that matter for this person.
    - CTA: Invite them to "check out a quick demo" or "reply and I'll walk you through it".

    Formatting Rules:
    - Plain-text style: Short, clean paragraphs. No bolding or bullets in the message body.
    - Spacing: Use double-line breaks (\\n\\n) between every paragraph.
    - Keep it conversational. Like a WhatsApp message from someone they'd trust.
    ${addressInstruction}
    - Signature:

    ${config.outreach.signature}

    ${jsonMapping}

    Return the data as a compact JSON array.
    Keep 'personalizedDraft' around 150-200 words and 'profileSummary' under 100 words to ensure the response fits within token limits.
  `;
}

export function buildConfigGenerationPrompt(prompt?: string, websiteUrl?: string): string {
  const context = websiteUrl
    ? `Research this business website: ${websiteUrl}\nExtract their company info, products/services, selling points, target audience, and tone of voice.`
    : '';
  const userDescription = prompt
    ? `Business description from the user:\n"${prompt}"`
    : '';

  return `
    You are a business profile generator. Based on the information provided, create a complete business configuration JSON.

    ${context}
    ${userDescription}

    Generate a JSON object with this EXACT structure (no extra fields, no missing fields):
    {
      "company": {
        "name": "Company Name",
        "website": "https://example.com",
        "headquarters": "City, Country",
        "description": "One-line description of what the company does"
      },
      "products": [
        { "name": "Product Name", "summary": "Brief description of this product/service" }
      ],
      "sellingPoints": [
        "Key advantage or differentiator (3-7 items)"
      ],
      "targetProfiles": [
        "Description of ideal customer type (3-6 items)"
      ],
      "scoring": {
        "high": "Description of highest-value prospect characteristics",
        "medium": "Description of medium-value prospect characteristics",
        "low": "Description of lower-value prospect characteristics"
      },
      "outreach": {
        "tone": "Description of desired communication tone",
        "avoidWords": ["word1", "word2"],
        "painPointExamples": ["pain point 1", "pain point 2"],
        "productExamples": ["product fit example 1", "product fit example 2"],
        "signature": "Sign-off text with company name and contact info"
      }
    }

    Rules:
    - Products should have 2-5 items
    - Selling points should have 3-7 items
    - Target profiles should have 3-6 items
    - Pain point examples should have 4-6 items
    - Avoid words should have 5-8 common AI/corporate jargon words
    - Make everything specific to this business, not generic
    - Return ONLY the JSON object, no markdown fences or extra text
  `;
}

export function buildEnrichmentPrompt(name: string, website?: string, location?: string): string {
  return `
    Deep research for contact info for the individual: "${name}".
    Website/Profile: ${website || 'N/A'}.
    Location: ${location || 'N/A'}.
    Find their personal email address and WhatsApp/Phone number.
    Search LinkedIn, personal websites, company pages, speaker bios, and social profiles.
    Only return a JSON object with these two fields:
    { "email": "extracted_email", "phoneNumber": "extracted_phone" }
  `;
}
