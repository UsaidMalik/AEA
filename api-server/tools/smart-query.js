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


// ============================================================================
// Ollama API Call
// ============================================================================

async function callOllama(messages) {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages,
            stream: false,
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ollama error (${res.status}): ${text}`);
    }

    const data = await res.json();
    return data.message?.content || '';
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
// Step 1 — Tool Selection
// ============================================================================

async function selectTools(question) {
    const prompt = `You are a data analysis assistant for a productivity monitoring app called AEA.
The user is asking about their focus/productivity session. You must decide which data query functions to call.

Available functions:
${buildToolList()}

RULES:
- Respond with ONLY valid JSON, nothing else.
- Pick 1-4 tools that are most relevant to answer the question.
- For predefined tools, use: { "name": "toolName" }
- For customQuery, include a querySpec: { "name": "customQuery", "querySpec": { "collection": "...", "filter": {...}, "sort": {...}, "limit": 50 } }
- For customQuery aggregation: { "name": "customQuery", "querySpec": { "collection": "...", "pipeline": [ {$match: ...}, {$group: ...} ] } }
- Use customQuery ONLY when the predefined tools cannot answer the question (e.g. cross-session trends, weekly grouping, date-range filtering, averages across sessions).
- Allowed collections for customQuery: sessions, app_events, website_events, camera_events, interventions, configs, predictions

Examples:
- "How many violations?" → [{ "name": "getViolationCounts" }]
- "What apps did I use most?" → [{ "name": "getTopApps" }]
- "Give me a full summary" → [{ "name": "getSessionOverview" }, { "name": "getSessionStats" }, { "name": "getTopApps" }]
- "Compare my violations across all sessions this week" → [{ "name": "customQuery", "querySpec": { "collection": "sessions", "pipeline": [{ "$sort": { "started_at": -1 } }, { "$limit": 7 }, { "$project": { "session_id": 1, "started_at": 1, "stats.violations": 1 } }] } }]
- "Average focus across my last 5 sessions" → [{ "name": "customQuery", "querySpec": { "collection": "sessions", "pipeline": [{ "$sort": { "started_at": -1 } }, { "$limit": 5 }, { "$group": { "_id": null, "avg_focus": { "$avg": "$stats.focus_pct" } } }] } }]

User question: "${question}"`;

    const response = await callOllama([
        { role: 'system', content: prompt },
        { role: 'user', content: question },
    ]);

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
// Step 2 — Execute Selected Tools
// ============================================================================

async function executeTools(db, session_id, toolSelections) {
    const results = {};

    await Promise.all(
        toolSelections.map(async (selection) => {
            const tool = queryTools.find(t => t.name === selection.name);
            if (!tool) return;
            try {
                if (tool.requiresSpec) {
                    // customQuery — pass the querySpec as third arg
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
// Step 3 — Generate Answer (with RAG context)
// ============================================================================

async function generateAnswer(question, toolResults, ragContext) {
    // Build research context block
    let researchBlock = '';
    if (ragContext && ragContext.length > 0) {
        researchBlock = `\n\nRelevant research & knowledge:\n${ragContext
            .map((r, i) => `[${i + 1}] (${r.source}) ${r.text}`)
            .join('\n')}`;
    }

    const prompt = `You are AEA's Smart Analysis Assistant — a productivity coach backed by real session data and research.

Your job:
1. Answer the user's question using the session data provided below.
2. When relevant, reference research findings to give educated advice.
3. Be concise, specific, and use actual numbers from the data.
4. If giving improvement tips, make them actionable and tied to the user's actual patterns.
5. Format your response in a clean, readable way.

Session data:
${JSON.stringify(toolResults, null, 2)}
${researchBlock}`;

    const answer = await callOllama([
        { role: 'system', content: prompt },
        { role: 'user', content: question },
    ]);

    return answer;
}


// ============================================================================
// Main Handler — Full Pipeline
// ============================================================================

async function handleSmartQuery(db, question, session_id) {
    // Step 1: LLM picks which tools to call
    const toolSelections = await selectTools(question);

    if (toolSelections.length === 0) {
        return {
            success: false,
            error: 'Could not determine which data to fetch for your question.',
        };
    }

    // Step 2: Execute the selected query tools
    const toolResults = await executeTools(db, session_id, toolSelections);

    // Step 3: Search RAG knowledge base for relevant research
    let ragContext = [];
    try {
        ragContext = await searchKnowledge(question);
    } catch (err) {
        console.error('[SmartQuery] RAG search failed (non-fatal):', err.message);
    }

    // Step 4: Generate the final answer
    const answer = await generateAnswer(question, toolResults, ragContext);

    return {
        success: true,
        answer,
        tools_used: toolSelections.map(t => t.name),
        research_used: ragContext.length > 0,
    };
}


module.exports = { handleSmartQuery };
