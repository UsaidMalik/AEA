/**
 * ~Raheem
 * Smart Query — LLM Orchestrator
 * Combines query-tools (session metrics) + RAG (research knowledge) + Ollama
 * to answer user questions with data-backed, research-informed analysis.
 */

const { queryTools } = require('./query-tools');
const { searchKnowledge } = require('./rag');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:latest';
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS) || 60000; // 60s default


// ============================================================================
// Ollama API Call (with timeout)
// ============================================================================

async function callOllama(messages, timeoutMs = OLLAMA_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages,
                stream: false,
            }),
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
            throw new Error(`Ollama timed out after ${timeoutMs / 1000}s — model may be overloaded`);
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}


// ============================================================================
// Question Classification (no LLM call — fast keyword check)
// ============================================================================

function classifyQuestion(question) {
    const q = question.toLowerCase();

    // Data keywords — questions that need DB tools
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
"Average focus last 5 sessions" → [{"name":"customQuery","querySpec":{"collection":"sessions","pipeline":[{"$sort":{"started_at":-1}},{"$limit":5},{"$group":{"_id":null,"avg":{"$avg":"$stats.focus_pct"}}}]}}]`;

    const response = await callOllama([
        { role: 'system', content: prompt },
        { role: 'user', content: question },
    ], 30000);

    // Extract JSON array from response (with sanitisation for common LLM quirks)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('LLM did not return a valid tool selection');

    let raw = jsonMatch[0];
    // Fix common LLM JSON issues
    raw = raw.replace(/,\s*([}\]])/g, '$1');   // trailing commas
    raw = raw.replace(/'/g, '"');               // single quotes → double
    raw = raw.replace(/(\w+)\s*:/g, '"$1":');   // unquoted keys
    raw = raw.replace(/""+/g, '"');             // doubled quotes from above

    let selected;
    try {
        selected = JSON.parse(raw);
    } catch {
        // Fallback: extract tool names with a regex
        const nameMatches = [...raw.matchAll(/"name"\s*:\s*"([^"]+)"/g)];
        if (nameMatches.length === 0) throw new Error('LLM returned unparseable tool selection');
        selected = nameMatches.map(m => ({ name: m[1] }));
    }

    // Validate and normalize
    const validNames = queryTools.map(t => t.name);
    return selected
        .filter(item => {
            const name = typeof item === 'string' ? item : item.name;
            return validNames.includes(name);
        })
        .map(item => {
            if (typeof item === 'string') return { name: item };
            return item;
        });
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
                if (tool.requiresSpec) {
                    results[selection.name] = await tool.execute(db, session_id, selection.querySpec);
                } else {
                    results[selection.name] = await tool.execute(db, session_id);
                }
            } catch (err) {
                results[selection.name] = { error: err.message };
            }
        })
    );

    return results;
}


// ============================================================================
// Generate Answer — data-backed (with session data + RAG)
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

    return await callOllama([
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

    return await callOllama([
        { role: 'system', content: prompt },
        { role: 'user', content: question },
    ]);
}


// ============================================================================
// Main Handler — Smart Pipeline
// ============================================================================

async function handleSmartQuery(db, question, session_id) {
    const t0 = Date.now();

    // Classify: does this question need session data or is it general?
    const questionType = classifyQuestion(question);
    console.log(`[SmartQuery] Question type: ${questionType}`);

    // Always fetch RAG in background
    const ragPromise = searchKnowledge(question).catch(err => {
        console.error('[SmartQuery] RAG search failed (non-fatal):', err.message);
        return [];
    });

    // ── GENERAL questions: skip tool selection entirely (1 LLM call instead of 2) ──
    if (questionType === 'general') {
        const ragContext = await ragPromise;
        console.log(`[SmartQuery] RAG took ${Date.now() - t0}ms`);

        const t1 = Date.now();
        const answer = await generateGeneralAnswer(question, ragContext);
        console.log(`[SmartQuery] Answer generation took ${Date.now() - t1}ms`);
        console.log(`[SmartQuery] Total (general path): ${Date.now() - t0}ms`);

        return {
            success: true,
            answer,
            tools_used: [],
            research_used: ragContext.length > 0,
        };
    }

    // ── DATA questions: full pipeline with tool selection ──
    let toolSelections;
    try {
        toolSelections = await selectTools(question);
        console.log(`[SmartQuery] Tool selection took ${Date.now() - t0}ms → ${toolSelections.map(t => t.name).join(', ')}`);
    } catch (err) {
        // If tool selection fails, fall back to general answer
        console.error(`[SmartQuery] Tool selection failed, falling back to general: ${err.message}`);
        const ragContext = await ragPromise;
        const answer = await generateGeneralAnswer(question, ragContext);
        console.log(`[SmartQuery] Total (fallback path): ${Date.now() - t0}ms`);

        return {
            success: true,
            answer,
            tools_used: [],
            research_used: ragContext.length > 0,
        };
    }

    if (toolSelections.length === 0) {
        // No tools matched — fall back to general answer instead of failing
        const ragContext = await ragPromise;
        const answer = await generateGeneralAnswer(question, ragContext);
        console.log(`[SmartQuery] Total (no-tools fallback): ${Date.now() - t0}ms`);

        return {
            success: true,
            answer,
            tools_used: [],
            research_used: ragContext.length > 0,
        };
    }

    // Execute tools + RAG in parallel
    const t1 = Date.now();
    const [toolResults, ragContext] = await Promise.all([
        executeTools(db, session_id, toolSelections),
        ragPromise,
    ]);
    console.log(`[SmartQuery] Tools + RAG took ${Date.now() - t1}ms (parallel)`);

    // Generate the final answer
    const t2 = Date.now();
    const answer = await generateDataAnswer(question, toolResults, ragContext);
    console.log(`[SmartQuery] Answer generation took ${Date.now() - t2}ms`);
    console.log(`[SmartQuery] Total pipeline: ${Date.now() - t0}ms`);

    return {
        success: true,
        answer,
        tools_used: toolSelections.map(t => t.name),
        research_used: ragContext.length > 0,
    };
}


module.exports = { handleSmartQuery };
