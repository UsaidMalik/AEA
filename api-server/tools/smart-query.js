/**
 * ~Raheem
 * Smart Query — LLM Orchestrator
 * Combines query-tools (session metrics) + RAG (research knowledge) + LLM
 * to answer user questions with data-backed, research-informed analysis.
 *
 * LLM routing:
 *   Online + GROQ_API_KEY set → Groq (cloud, free tier — llama3 / mixtral)
 *   Offline or no key         → Ollama (local)
 */

const { queryTools } = require('./query-tools');
const { searchKnowledge } = require('./rag');

const OLLAMA_URL          = process.env.OLLAMA_URL;
const OLLAMA_MODEL        = process.env.OLLAMA_MODEL;
const OLLAMA_TIMEOUT_MS   = parseInt(process.env.OLLAMA_TIMEOUT_MS) || 60000;
const GROQ_API_KEY        = process.env.GROQ_API_KEY;
const GROQ_MODEL          = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const CLOUD_TIMEOUT_MS    = 20000;
const INTERNET_CHECK_URL  = 'https://1.1.1.1';   // Cloudflare — fast, no redirect
const INTERNET_CACHE_TTL  = 30000;               // re-check every 30s


// ============================================================================
// Internet Connectivity Check (cached)
// ============================================================================

let _internetCache = { online: null, ts: 0 };

async function isOnline() {
    const now = Date.now();
    if (_internetCache.online !== null && now - _internetCache.ts < INTERNET_CACHE_TTL) {
        return _internetCache.online;
    }
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        await fetch(INTERNET_CHECK_URL, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timer);
        _internetCache = { online: true, ts: now };
        return true;
    } catch {
        _internetCache = { online: false, ts: now };
        return false;
    }
}


// ============================================================================
// Ollama API Call (local, with timeout)
// ============================================================================

async function callOllama(messages, timeoutMs = OLLAMA_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false }),
            signal: controller.signal,
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Ollama error (${res.status}): ${text}`);
        }

        const data = await res.json();
        return data.message?.content || '';
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error(`Ollama timed out after ${timeoutMs / 1000}s`);
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}


// ============================================================================
// AI API CALL ( For Now Groq)
// ============================================================================

async function callCloudAI(messages, timeoutMs = CLOUD_TIMEOUT_MS) {
    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: 1024 }),
            signal: controller.signal,
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Groq API error (${res.status}): ${text}`);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content || '';
    } catch (err) {
        if (err.name === 'AbortError') throw new Error('Groq API timed out');
        throw err;
    } finally {
        clearTimeout(timer);
    }
}


// ============================================================================
// Unified LLM Router — cloud first, Ollama fallback
// ============================================================================

async function callLLM(messages, timeoutMs = OLLAMA_TIMEOUT_MS) {
    const online = await isOnline();

    if (online && GROQ_API_KEY) {
        try {
            console.log(`[LLM] Provider: Groq (${GROQ_MODEL})`);
            const result = await callCloudAI(messages);
            return { text: result, provider: 'groq' };
        } catch (err) {
            console.warn(`[LLM] Groq failed, falling back to Ollama: ${err.message}`);
        }
    } else {
        console.log(`[LLM] Provider: Ollama (local) — online=${online}, apiKey=${!!GROQ_API_KEY}`);
    }

    const text = await callOllama(messages, timeoutMs);
    return { text, provider: 'ollama' };
}


// ============================================================================
// Question Classification (no LLM call — fast keyword check)
// ============================================================================

function classifyQuestion(question) {
    const q = question.toLowerCase();

    const dataKeywords = [
        'how many', 'how much', 'violation', 'session', 'app', 'website',
        'focus', 'stats', 'duration', 'time spent', 'emotion', 'denied',
        'blocked', 'used', 'top', 'most', 'least', 'average', 'compare',
        'trend', 'week', 'today', 'yesterday', 'last', 'history',
        'summary', 'overview', 'report', 'breakdown', 'score',
        'away', 'absent', 'missing', 'present', 'camera',
    ];

    const needsData = dataKeywords.some(kw => q.includes(kw));
    return needsData ? 'data' : 'general';
}


// ============================================================================
// Build Tool List (for LLM to choose from)
// ============================================================================

function buildToolList() {
    return queryTools
        .map(t => `- ${t.name}: ${t.description}`)
        .join('\n');
}


// ============================================================================
// Tool Selection (only for data questions)
// ============================================================================

async function selectTools(question) {
    const prompt = `Pick 1-4 functions to answer a productivity app question. Reply with ONLY a JSON array.

Functions:
${buildToolList()}

For customQuery: { "name": "customQuery", "querySpec": { "collection": "...", "pipeline": [...] } }
Collections: sessions, app_events, website_events, camera_events, interventions, configs

Examples:
"How many violations?" → [{"name":"getViolationCounts"}]
"What apps did I use?" → [{"name":"getTopApps"}]
"Full summary" → [{"name":"getSessionOverview"},{"name":"getSessionStats"},{"name":"getTopApps"}]
"Average focus last 5 sessions" → [{"name":"customQuery","querySpec":{"collection":"sessions","pipeline":
[{"$sort":{"started_at":-1}},{"$limit":5},{"$group":{"_id":null,"avg":{"$avg":"$stats.focus_pct"}}}]}}]`;

    const { text: response } = await callLLM([
        { role: 'system', content: prompt },
        { role: 'user', content: question },
    ], OLLAMA_TIMEOUT_MS);

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('LLM did not return a valid tool selection');

    let raw = jsonMatch[0];
    raw = raw.replace(/,\s*([}\]])/g, '$1');
    raw = raw.replace(/'/g, '"');
    raw = raw.replace(/(\w+)\s*:/g, '"$1":');
    raw = raw.replace(/""+/g, '"');

    let selected;
    try {
        selected = JSON.parse(raw);
    } catch {
        const nameMatches = [...raw.matchAll(/"name"\s*:\s*"([^"]+)"/g)];
        if (nameMatches.length === 0) throw new Error('LLM returned unparseable tool selection');
        selected = nameMatches.map(m => ({ name: m[1] }));
    }

    const validNames = queryTools.map(t => t.name);
    return selected
        .filter(item => {
            const name = typeof item === 'string' ? item : item.name;
            return validNames.includes(name);
        })
        .map(item => (typeof item === 'string' ? { name: item } : item));
}


// ============================================================================
// Execute Selected Tools
// ============================================================================

async function executeTools(db, session_id = null, toolSelections) {
    const results = {};

    await Promise.all(
        toolSelections.map(async (selection) => {
            const tool = queryTools.find(t => t.name === selection.name);
            if (!tool) return;
            try {
                results[selection.name] = tool.requiresSpec
                    ? await tool.execute(db, session_id, selection.querySpec)
                    : await tool.execute(db, session_id);
            } catch (err) {
                results[selection.name] = { error: err.message };
            }
        })
    );

    return results;
}


// ============================================================================
// Generate Answer — data-backed (session data + RAG)
// ============================================================================

async function generateDataAnswer(question, toolResults, ragContext) {
    let researchBlock = '';
    if (ragContext && ragContext.length > 0) {
        researchBlock = `\n\nRelevant research & knowledge:\n${ragContext
            .map((r, i) => `[${i + 1}] (${r.source}) ${r.text}`)
            .join('\n')}`;
    }

    const prompt = `You are AEA's Smart Analysis Assistant — a friendly, knowledgeable productivity coach.

Your style:
- Be conversational and encouraging, not robotic.
- Use the actual numbers from the data but explain what they mean.
- Give specific, actionable advice when relevant.
- If something looks good, acknowledge it. If there are issues, be constructive.
- Keep responses concise (3-6 sentences) unless the user asked for a full report.
- Use simple formatting: bullet points for lists, bold for key numbers.

Session data:
${JSON.stringify(toolResults, null, 2)}
${researchBlock}`;

    return await callLLM([
        { role: 'system', content: prompt },
        { role: 'user', content: question },
    ]);
}


// ============================================================================
// Generate Answer — general (advice/tips, no session data needed)
// ============================================================================

async function generateGeneralAnswer(question, ragContext) {
    let researchBlock = '';
    if (ragContext && ragContext.length > 0) {
        researchBlock = `\n\nRelevant research you can reference:\n${ragContext
            .map((r, i) => `[${i + 1}] (${r.source}) ${r.text}`)
            .join('\n')}`;
    }

    const prompt = `You are AEA's Smart Analysis Assistant — a friendly, knowledgeable productivity coach.

You help users improve their focus, productivity, and work habits. AEA is an app that monitors sessions (tracking apps, websites, emotions via camera, and sending alerts for violations).

Your style:
- Be conversational, warm, and encouraging.
- Give specific, actionable advice — not generic platitudes.
- Reference research when available.
- Keep responses concise (3-6 sentences) unless the user wants more detail.
- You can discuss productivity techniques, focus strategies, time management, emotional regulation, and work habits.
${researchBlock}`;

    return await callLLM([
        { role: 'system', content: prompt },
        { role: 'user', content: question },
    ]);
}


// ============================================================================
// Main Handler — Smart Pipeline
// ============================================================================

async function handleSmartQuery(db, question, session_id) {
    const t0 = Date.now();

    const questionType = classifyQuestion(question);
    console.log(`[SmartQuery] Question type: ${questionType}`);

    const ragPromise = searchKnowledge(question).catch(err => {
        console.error('[SmartQuery] RAG search failed (non-fatal):', err.message);
        return [];
    });

    // ── GENERAL questions: 1 LLM call ──
    if (questionType === 'general') {
        const ragContext = await ragPromise;
        const { text: answer, provider } = await generateGeneralAnswer(question, ragContext);
        console.log(`[SmartQuery] Total (general path): ${Date.now() - t0}ms via ${provider}`);
        return { success: true, answer, provider, tools_used: [], research_used: ragContext.length > 0 };
    }

    // ── DATA questions: full pipeline ──
    let toolSelections;
    try {
        toolSelections = await selectTools(question);
        console.log(`[SmartQuery] Tools selected: ${toolSelections.map(t => t.name).join(', ')}`);
    } catch (err) {
        console.error(`[SmartQuery] Tool selection failed, falling back to general: ${err.message}`);
        const ragContext = await ragPromise;
        const { text: answer, provider } = await generateGeneralAnswer(question, ragContext);
        return { success: true, answer, provider, tools_used: [], research_used: ragContext.length > 0 };
    }

    if (toolSelections.length === 0) {
        const ragContext = await ragPromise;
        const { text: answer, provider } = await generateGeneralAnswer(question, ragContext);
        return { success: true, answer, provider, tools_used: [], research_used: ragContext.length > 0 };
    }

    const [toolResults, ragContext] = await Promise.all([
        executeTools(db, session_id, toolSelections),
        ragPromise,
    ]);

    const { text: answer, provider } = await generateDataAnswer(question, toolResults, ragContext);
    console.log(`[SmartQuery] Total pipeline: ${Date.now() - t0}ms via ${provider}`);

    return {
        success: true,
        answer,
        provider,
        tools_used: toolSelections.map(t => t.name),
        research_used: ragContext.length > 0,
    };
}


module.exports = { handleSmartQuery, classifyQuestion };
