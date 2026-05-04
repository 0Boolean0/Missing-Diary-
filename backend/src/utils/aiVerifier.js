/**
 * AI Assistive Verification using Google Gemini Flash
 *
 * Analyzes a missing person report's text fields and returns:
 *   - score: 0–100 (higher = more credible/complete)
 *   - flags: array of concern strings (empty = no issues found)
 *
 * This is ASSISTIVE ONLY — final approval/rejection is always by admin/police.
 * If the API is unavailable or the key is missing, returns null gracefully.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * @param {object} caseData
 * @param {string} caseData.name
 * @param {string} [caseData.description]
 * @param {string} [caseData.last_seen_location]
 * @param {string} [caseData.clothing]
 * @param {string} [caseData.medical_info]
 * @param {number} [caseData.age]
 * @param {string} [caseData.gender]
 * @returns {Promise<{score: number, flags: string[]} | null>}
 */
export async function verifyReportWithAI(caseData) {
  if (!GEMINI_API_KEY) {
    console.warn('[aiVerifier] GEMINI_API_KEY not set — skipping AI verification');
    return null;
  }

  const prompt = buildPrompt(caseData);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256,
        },
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[aiVerifier] Gemini API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseAIResponse(text);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[aiVerifier] Gemini API timed out');
    } else {
      console.warn('[aiVerifier] Gemini API call failed:', err.message);
    }
    return null;
  }
}

function buildPrompt(c) {
  return `You are an assistive verification system for a missing persons platform. 
Analyze the following missing person report and respond ONLY with valid JSON.

Report details:
- Name: ${c.name || 'Not provided'}
- Age: ${c.age || 'Not provided'}
- Gender: ${c.gender || 'Not provided'}
- Last seen location: ${c.last_seen_location || 'Not provided'}
- Clothing: ${c.clothing || 'Not provided'}
- Medical info: ${c.medical_info || 'Not provided'}
- Description: ${c.description || 'Not provided'}

Evaluate the report for:
1. Completeness (are key fields filled?)
2. Plausibility (does the description make sense?)
3. Potential red flags (spam, test data, nonsensical content, offensive language)

Respond with ONLY this JSON structure (no markdown, no explanation):
{"score": <integer 0-100>, "flags": [<string>, ...]}

Score guide: 80-100 = complete and credible, 50-79 = acceptable but missing details, 20-49 = incomplete or vague, 0-19 = likely spam or test data.
flags should be short English phrases describing concerns, or an empty array if none.`;
}

function parseAIResponse(text) {
  try {
    // Strip any accidental markdown code fences
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const score = Math.max(0, Math.min(100, parseInt(parsed.score, 10) || 0));
    const flags = Array.isArray(parsed.flags)
      ? parsed.flags.filter(f => typeof f === 'string').slice(0, 5)
      : [];

    return { score, flags };
  } catch {
    console.warn('[aiVerifier] Failed to parse AI response:', text);
    return null;
  }
}
