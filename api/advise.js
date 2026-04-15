/**
 * /api/advise  — streaming Claude advisor endpoint
 *
 * Accepts POST { stats, placements, bounds }
 * Streams back text/event-stream (SSE) chunks.
 *
 * Used by:
 *   - vite.config.js plugin (dev)
 *   - server.js (production Express)
 */

import Anthropic from '@anthropic-ai/sdk';
import { INTERVENTIONS_META } from './interventionsMeta.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Build a concise but information-rich prompt from live simulation state.
 */
function buildPrompt({ stats, placements, bounds }) {
  // Summarise placements by type
  const counts = {};
  for (const { type } of placements) counts[type] = (counts[type] ?? 0) + 1;

  const placementSummary = Object.entries(counts)
    .map(([type, n]) => {
      const meta = INTERVENTIONS_META[type];
      return `${n}× ${meta.label} (${meta.emoji}, $${(meta.cost * n).toLocaleString()} SGD, −${meta.cooling}°C each)`;
    })
    .join('\n  ');

  const isEmpty = placements.length === 0;

  return `You are an urban heat island mitigation advisor for Singapore. Analyse the current simulation state and give 2-3 short, specific, actionable recommendations. Be concise — this appears in a compact UI panel. Use plain text, no markdown headers. Separate recommendations with a blank line.

## Simulation state
- Area: Singapore (lat ${bounds?.south?.toFixed(3)}–${bounds?.north?.toFixed(3)}, lng ${bounds?.west?.toFixed(3)}–${bounds?.east?.toFixed(3)})
- Average temperature reduction so far: −${stats.avgReduction.toFixed(1)}°C
- Maximum local reduction: −${stats.maxReduction.toFixed(1)}°C
- Area improved: ${stats.pctImproved}%
- Estimated energy savings: ${stats.energySavingsKwh.toLocaleString()} kWh
- Total budget spent: $${stats.totalCost.toLocaleString()} SGD
- Interventions placed (${placements.length} total):
  ${isEmpty ? 'None yet.' : placementSummary}

${isEmpty
  ? 'The user has not placed any interventions yet. Suggest where to start for maximum impact in Singapore\'s urban heat context.'
  : 'Based on what has been placed, suggest what to add or where to focus next for the greatest additional cooling impact.'}`;
}

/**
 * Handle the request — works with both raw Node IncomingMessage (Vite plugin)
 * and Express req/res objects.
 */
export async function handleAdvise(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  // Parse body — Express already parses it; for raw Node we need to read it
  let body = req.body;
  if (!body) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try { body = JSON.parse(Buffer.concat(chunks).toString()); }
    catch { res.statusCode = 400; res.end('Bad JSON'); return; }
  }

  const { stats, placements, bounds } = body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: buildPrompt({ stats, placements, bounds }) }],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta?.type === 'text_delta'
      ) {
        const data = JSON.stringify({ text: event.delta.text });
        res.write(`data: ${data}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
  } catch (err) {
    console.error('Anthropic error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
}
