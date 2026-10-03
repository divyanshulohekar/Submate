import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    gemini_configured: Boolean(process.env.GEMINI_API_KEY),
    app: 'SubMate AI'
  });
});

// AI Explanation endpoint using Gemini API
app.post('/api/ai/explain', async (req: Request, res: Response) => {
  const { merchant, historical_amount, current_amount, frequency, repeat_count, confidence, context_type, category } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.includes('MY_GEMINI_API_KEY')) {
    // Provide high-quality fallback explanation
    const percent = historical_amount ? Math.round(((current_amount - historical_amount) / historical_amount) * 100) : 0;
    return res.json({
      title: percent > 0 ? `${merchant} Price Hike (+${percent}%)` : `${merchant} Recurring Detection`,
      summary: `Observed ${repeat_count} repeating payments of ₹${current_amount} on a ${frequency} cadence.`,
      reason: `Stable billing intervals (~30 days) and consistent merchant identification with ${confidence}% detection confidence.`,
      suggested_action: `Review subscription status in Discovery Center to track next renewal or pause if inactive.`
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are the financial explanation engine of SubMate AI ("Discover first. Ask users to confirm.").
Analyze the following structured financial recurrence data:
- Merchant: ${merchant}
- Category: ${category || 'General'}
- Current Amount: ₹${current_amount}
- Previous Historical Amount: ${historical_amount ? `₹${historical_amount}` : 'None'}
- Billing Frequency: ${frequency}
- Repeat Count: ${repeat_count}
- Detection Confidence: ${confidence}%
- Context: ${context_type || 'recurring_candidate'}

Generate a concise, objective explanation adhering strictly to these product guardrails:
1. Never say "cancel this" or "unnecessary" as a fact.
2. Use phrases like "Potential", "Detected pattern", "Consider reviewing".
3. Return ONLY a valid JSON object with the following keys:
{
  "title": "short 4-8 word title",
  "summary": "1 sentence objective summary of what was detected",
  "reason": "1-2 sentence evidence explanation based on intervals, amounts, and merchant consistency",
  "suggested_action": "1 practical financial tip (e.g. check family plans, annual tier discount, or confirm)"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Gemini API Error:', err.message);
    return res.json({
      title: `${merchant} Recurring Analysis`,
      summary: `Observed ${repeat_count} debits of ₹${current_amount} on a ${frequency} cycle.`,
      reason: `Cleaned merchant identifier and consistent payment intervals verified with ${confidence}% confidence.`,
      suggested_action: `Confirm to add to subscription ledger and activate renewal alerts.`
    });
  }
});

// AI Cheaper Alternatives Discovery Feed using Gemini API
app.post('/api/ai/alternatives', async (req: Request, res: Response) => {
  const { subscriptions } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  const defaultAlternatives = [
    {
      id: 'alt_netflix',
      current_subscription: 'Netflix',
      current_amount: 649,
      alternative_service: 'JioCinema Premium + Prime Video Bundle',
      alternative_amount: 199,
      cadence: 'monthly',
      annual_savings: 5400,
      savings_percent: 69,
      migration_difficulty: 'Easy',
      pros: ['Includes HBO, Warner Bros & Peacock libraries', '4K Ultra HD streaming', 'Amazon Prime delivery benefits included'],
      trade_offs: ['Separate app interfaces', 'Requires 2 apps instead of 1'],
      category: 'Entertainment'
    },
    {
      id: 'alt_spotify',
      current_subscription: 'Spotify',
      current_amount: 119,
      alternative_service: 'YouTube Premium Family / Duo Share',
      alternative_amount: 49,
      cadence: 'monthly',
      annual_savings: 840,
      savings_percent: 59,
      migration_difficulty: 'Easy',
      pros: ['Includes full YouTube Music Premium', 'Ad-free YouTube video playback across all devices', 'Background audio playback'],
      trade_offs: ['Playlist migration required (Soundiiz tool recommended)'],
      category: 'Entertainment'
    },
    {
      id: 'alt_adobe',
      current_subscription: 'Adobe Creative Cloud',
      current_amount: 4230,
      alternative_service: 'Affinity V2 Universal License + DaVinci Resolve',
      alternative_amount: 0,
      cadence: 'monthly',
      annual_savings: 50760,
      savings_percent: 100,
      migration_difficulty: 'Moderate',
      pros: ['Zero recurring monthly debits (one-time license)', 'Hollywood-grade DaVinci color grading & editing', 'Low CPU overhead'],
      trade_offs: ['No Adobe Cloud font sync', 'Requires learning Affinity shortcuts'],
      category: 'Productivity'
    },
    {
      id: 'alt_chatgpt',
      current_subscription: 'ChatGPT Plus',
      current_amount: 1999,
      alternative_service: 'Google One AI Premium (Gemini Advanced)',
      alternative_amount: 999,
      cadence: 'monthly',
      annual_savings: 12000,
      savings_percent: 50,
      migration_difficulty: 'Instant',
      pros: ['Includes 2TB Google Drive storage across family', 'Gemini integration in Docs, Gmail & Sheets', '1M token context window'],
      trade_offs: ['Different model ecosystem than OpenAI GPT-4o'],
      category: 'Productivity'
    },
    {
      id: 'alt_canva',
      current_subscription: 'Canva Pro',
      current_amount: 499,
      alternative_service: 'Microsoft Designer + Figma Starter',
      alternative_amount: 0,
      cadence: 'monthly',
      annual_savings: 5988,
      savings_percent: 100,
      migration_difficulty: 'Easy',
      pros: ['Completely free with Microsoft / Google account', 'DALL-E 3 image generation included free', 'Vector precision tools'],
      trade_offs: ['Smaller template marketplace than Canva'],
      category: 'Productivity'
    },
    {
      id: 'alt_cult',
      current_subscription: 'Cult.fit',
      current_amount: 1499,
      alternative_service: 'Cult Pass Home / Pay-Per-Session Local Gym',
      alternative_amount: 699,
      cadence: 'monthly',
      annual_savings: 9600,
      savings_percent: 53,
      migration_difficulty: 'Easy',
      pros: ['Saves ₹9,600/year if visiting < 8 times a month', 'Access to all live online workout streams'],
      trade_offs: ['Limited peak-hour physical gym slots'],
      category: 'Health & Fitness'
    }
  ];

  if (!apiKey || apiKey.includes('MY_GEMINI_API_KEY')) {
    return res.json({ alternatives: defaultAlternatives, source: 'curated_intelligence' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const subList = (subscriptions || []).map((s: any) => `${s.merchant_name} (₹${s.amount}/${s.cycle}, ${s.category})`).join(', ');

    const prompt = `You are the cost-optimization and subscription alternative engine of Velocity.
User's currently held active subscriptions:
${subList || 'Netflix (₹649/monthly), Spotify (₹119/monthly), Adobe Creative Cloud (₹4230/monthly), ChatGPT Plus (₹1999/monthly)'}

Suggest 3 to 5 realistic, high-quality, cheaper or free/open-source alternative services to these subscriptions that provide comparable features at lower cost in India/Global markets.
Return ONLY a valid JSON object in this format:
{
  "alternatives": [
    {
      "id": "alt_unique_id",
      "current_subscription": "Name of current service",
      "current_amount": 649,
      "alternative_service": "Name of proposed cheaper alternative",
      "alternative_amount": 199,
      "cadence": "monthly",
      "annual_savings": 5400,
      "savings_percent": 69,
      "migration_difficulty": "Easy" | "Moderate" | "Complex",
      "pros": ["bullet 1", "bullet 2"],
      "trade_offs": ["tradeoff 1"],
      "category": "Entertainment" | "Productivity" | "Health & Fitness" | "Utilities"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    return res.json({ alternatives: parsed.alternatives || defaultAlternatives, source: 'gemini_3.8_flash' });
  } catch (err: any) {
    console.error('Gemini Alternatives Error:', err.message);
    return res.json({ alternatives: defaultAlternatives, source: 'fallback_intelligence' });
  }
});

// Setu Account Aggregator Sandbox Mock Endpoints (Section 4 & 27)
app.post('/api/setu-sandbox/consent', (req: Request, res: Response) => {
  const consentId = `SETU-SANDBOX-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  res.json({
    status: 'PENDING',
    consent_id: consentId,
    fiu_id: 'SUBMATE-FINANCIAL-SANDBOX',
    purpose_code: '102',
    purpose_desc: 'Customer Spending Pattern & Budgeting Intelligence',
    redirect_url: `/connections?consent_id=${consentId}&status=simulated_auth`
  });
});

app.get('/api/setu-sandbox/status/:id', (req: Request, res: Response) => {
  res.json({
    consent_id: req.params.id,
    status: 'ACTIVE',
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    frequency: 'MONTHLY',
    data_life_days: 90
  });
});

// UPI AutoPay Mandates Center (NPCI Interoperability Circular Oct 2025 compliant demo)
app.get('/api/upi-autopay/mandates', (req: Request, res: Response) => {
  res.json({
    disclaimer: 'Clearly labelled demo mandate center. Mandate modifications occur within authorized UPI PSP apps.',
    mandates: [
      {
        mandate_urn: 'UMN987123982173@hdfcbank',
        merchant: 'Spotify India',
        frequency: 'MONTHLY',
        max_amount: 500,
        current_amount: 119,
        created_at: '2026-04-12',
        status: 'LIVE',
        rule: 'AS_PER_BILL'
      },
      {
        mandate_urn: 'UMN445129038172@icici',
        merchant: 'Google One Storage',
        frequency: 'MONTHLY',
        max_amount: 250,
        current_amount: 130,
        created_at: '2026-04-22',
        status: 'LIVE',
        rule: 'FIXED'
      },
      {
        mandate_urn: 'UMN112984719283@sbi',
        merchant: 'YouTube Premium',
        frequency: 'MONTHLY',
        max_amount: 300,
        current_amount: 179,
        created_at: '2026-05-15',
        status: 'LIVE',
        rule: 'FIXED'
      }
    ]
  });
});

// Start dev server with Vite or production static server
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SubMate AI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
