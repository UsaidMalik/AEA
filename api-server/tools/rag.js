/**
 * ~Raheem
 * RAG Engine — Simple Retrieval Augmented Generation
 * Reads .txt files from /research, chunks them, embeds via Ollama,
 * and retrieves relevant passages at query time using cosine similarity.
 */

const fs = require('fs');
const path = require('path');

const OLLAMA_URL = process.env.OLLAMA_URL;
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL;
const RESEARCH_DIR = path.join(__dirname, '..', 'research');
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;
const TOP_K = 5;

// In-memory store: [{ text, embedding, source }]
let knowledgeBase = [];
let isIndexed = false;


// ============================================================================
// Chunking
// ============================================================================

function chunkText(text, source) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + CHUNK_SIZE, text.length);
        const chunk = text.slice(start, end).trim();

        if (chunk.length > 50) {
            chunks.push({ text: chunk, source });
        }

        start += CHUNK_SIZE - CHUNK_OVERLAP;
    }

    return chunks;
}


// ============================================================================
// Embedding (via Ollama)
// ============================================================================

async function getEmbedding(text) {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
    });

    if (!res.ok) {
        throw new Error(`Ollama embedding error (${res.status}): ${await res.text()}`);
    }

    const data = await res.json();
    return data.embedding;
}


// ============================================================================
// Cosine Similarity
// ============================================================================

function cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
    return magnitude === 0 ? 0 : dot / magnitude;
}


// ============================================================================
// Index — Read files, chunk, embed, store in memory
// ============================================================================

async function indexResearchFiles() {
    if (!fs.existsSync(RESEARCH_DIR)) {
        console.log(`[RAG] No research directory found at ${RESEARCH_DIR}, skipping indexing.`);
        return;
    }

    const files = fs.readdirSync(RESEARCH_DIR).filter(f => f.endsWith('.txt'));

    if (files.length === 0) {
        console.log('[RAG] No .txt files found in /research, skipping indexing.');
        return;
    }

    console.log(`[RAG] Indexing ${files.length} research file(s)...`);
    knowledgeBase = [];

    for (const file of files) {
        const filePath = path.join(RESEARCH_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const chunks = chunkText(content, file);

        for (const chunk of chunks) {
            try {
                const embedding = await getEmbedding(chunk.text);
                knowledgeBase.push({
                    text: chunk.text,
                    embedding,
                    source: chunk.source,
                });
            } catch (err) {
                console.error(`[RAG] Failed to embed chunk from ${file}:`, err.message);
            }
        }

        console.log(`[RAG] Indexed ${chunks.length} chunks from ${file}`);
    }

    isIndexed = true;
    console.log(`[RAG] Done. ${knowledgeBase.length} total chunks in knowledge base.`);
}


// ============================================================================
// Search — Find relevant chunks for a query
// ============================================================================

async function searchKnowledge(query, topK = TOP_K) {
    if (!isIndexed || knowledgeBase.length === 0) {
        return [];
    }

    const queryEmbedding = await getEmbedding(query);

    const scored = knowledgeBase.map(chunk => ({
        text: chunk.text,
        source: chunk.source,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
}


// ============================================================================
// Re-index — Call this if research files change at runtime
// ============================================================================

async function reindex() {
    isIndexed = false;
    await indexResearchFiles();
}

function getStatus() {
    return {
        indexed: isIndexed,
        chunks: knowledgeBase.length,
        research_dir: RESEARCH_DIR,
    };
}


module.exports = { indexResearchFiles, searchKnowledge, reindex, getStatus, chunkText, cosineSimilarity};

