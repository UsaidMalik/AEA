jest.mock('./rag'); //Mock Search Knowledge

const {classifyQuestion, handleSmartQuery} = require('./smart-query');
const {searchKnowledge} = require('./rag');

function mockCollection(data = {}){
    const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(data.findArray || []),
    };
    return {
        findOne: jest.fn().mockResolvedValue(data.findOne ?? null),
        countDocuments: jest.fn().mockResolvedValue(data.countDocuments || 0),
        find: jest.fn().mockReturnValue(chain),
        aggregate: jest.fn().mockReturnValue(chain),
        insertOne: jest.fn().mockResolvedValue({insertedId: 'mock-id' }),
        deleteOne: jest.fn().mockResolvedValue({deletedCount: data.deletedCount ?? 1}),
        _chain: chain,
    };
}

function mockDb(collectionMap = {}){
    return{
        collection:jest.fn((name) => collectionMap[name] || mockCollection()),
    };
}


//Unit tests for classify Question Logic
describe('classifyQuestion', () => {
    test('returns "data" for questions about violations', () => {
        expect(classifyQuestion("How many violations did I have?")).toBe("data");
        expect(classifyQuestion("What were my violations?")).toBe("data");
        expect(classifyQuestion("Did I have any violations?")).toBe("data");
        });
    
        test('returns "data" for app usage questions', () => {
        expect(classifyQuestion('what apps did I use today?')).toBe('data');
    });

    test('returns "data" for focus/stats questions', () => {
        expect(classifyQuestion('show me my focus score')).toBe('data');
    });

    test('returns "data" for session questions', () => {
        expect(classifyQuestion('give me a summary of my session')).toBe('data');
    });

    test('returns "data" for emotion/camera questions', () => {
        expect(classifyQuestion('was I away from the camera?')).toBe('data');
    });

    test('returns "data" for comparison questions', () => {
        expect(classifyQuestion('compare my last two weeks')).toBe('data');
    });

    // Case insensitivity
    test('handles uppercase input correctly', () => {
        expect(classifyQuestion('HOW MANY VIOLATIONS?')).toBe('data');
    });

    // General questions - should return 'general'
    test('returns "general" for productivity advice', () => {
        expect(classifyQuestion('how can I be more productive?')).toBe('general');
    });

    test('returns "general" for technique questions', () => {
        expect(classifyQuestion('what is the pomodoro technique?')).toBe('general');
    });

    test('returns "general" for greetings', () => {
        expect(classifyQuestion('hello, who are you?')).toBe('general');
    });

});


// ============================================================================
// Integration tests for handleSmartQuery
// ============================================================================

function makeOllamaFetch(content) {
    return jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: { content } }),
    });
}

describe('handleSmartQuery', () => {
    beforeEach(() => {
        searchKnowledge.mockResolvedValue([]);
    });
    afterEach(() => {
        global.fetch = undefined;
    });

    // Test 1: General question — 1 Ollama call, no tools
    test('general question returns answer with no tools used', async () => {
        global.fetch = makeOllamaFetch('Try the Pomodoro technique!');
        const db = mockDb();

        const result = await handleSmartQuery(db, 'how can I improve my focus?', null);

        expect(result.success).toBe(true);
        expect(result.answer).toBe('Try the Pomodoro technique!');
        expect(result.tools_used).toEqual([]);
        expect(result.research_used).toBe(false);
    });

    // Test 2: General question + RAG returns results → research_used: true
    test('general question with RAG context sets research_used to true', async () => {
        searchKnowledge.mockResolvedValue([{ source: 'paper.pdf', text: 'Pomodoro works well' }]);
        global.fetch = makeOllamaFetch('Based on research, Pomodoro is effective!');
        const db = mockDb();

        const result = await handleSmartQuery(db, 'what focus techniques work best?', null);

        expect(result.success).toBe(true);
        expect(result.research_used).toBe(true);
        expect(result.tools_used).toEqual([]);
    });

    // Test 3: Data question → tool selection + tool execution + answer (2 Ollama calls)
    test('data question selects tools, runs them, and returns answer', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: { content: '[{"name":"getViolationCounts"}]' } }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: { content: 'You had 5 violations.' } }),
            });
        const db = mockDb();

        const result = await handleSmartQuery(db, 'how many violations did I have?', 'sess-001');

        expect(result.success).toBe(true);
        expect(result.answer).toBe('You had 5 violations.');
        expect(result.tools_used).toContain('getViolationCounts');
    });

    // Test 4: Data question + RAG → research_used: true
    test('data question with RAG context sets research_used to true', async () => {
        searchKnowledge.mockResolvedValue([{ source: 'study.pdf', text: 'Violations reduce focus' }]);
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: { content: '[{"name":"getViolationCounts"}]' } }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: { content: 'Based on research, 5 violations is high.' } }),
            });
        const db = mockDb();

        const result = await handleSmartQuery(db, 'how many violations?', 'sess-001');

        expect(result.success).toBe(true);
        expect(result.research_used).toBe(true);
        expect(result.tools_used).toContain('getViolationCounts');
    });

    // Test 5: Tool selection returns bad JSON → fallback to general answer
    test('tool selection bad JSON falls back to general answer', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: { content: 'I cannot determine which tools to use.' } }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: { content: 'Here is some general advice.' } }),
            });
        const db = mockDb();

        const result = await handleSmartQuery(db, 'how many violations?', null);

        expect(result.success).toBe(true);
        expect(result.tools_used).toEqual([]);
    });

    // Test 6: Tool selection returns empty array → fallback to general answer
    test('tool selection empty list falls back to general answer', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: { content: '[]' } }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: { content: 'General answer here.' } }),
            });
        const db = mockDb();

        const result = await handleSmartQuery(db, 'how many violations?', null);

        expect(result.success).toBe(true);
        expect(result.tools_used).toEqual([]);
    });

    // Test 7: RAG throws error — non-fatal, answer still returned
    test('RAG failure is non-fatal and answer is still returned', async () => {
        searchKnowledge.mockRejectedValue(new Error('RAG index not ready'));
        global.fetch = makeOllamaFetch('Still works without RAG!');
        const db = mockDb();

        const result = await handleSmartQuery(db, 'how can I focus better?', null);

        expect(result.success).toBe(true);
        expect(result.answer).toBe('Still works without RAG!');
        expect(result.research_used).toBe(false);
    });
});