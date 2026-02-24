const { chunkText, cosineSimilarity } = require('./rag');

describe('chunkText', () => {

    test('returns empty array for short text under 50 chars', () => {
        const result = chunkText('too short', 'file.txt');
        expect(result).toEqual([]);
    });

    test('returns single chunk for text under 500 chars', () => {
        const text = 'a'.repeat(100);
        const result = chunkText(text, 'notes.txt');
        expect(result).toHaveLength(1);
        expect(result[0].source).toBe('notes.txt');
        expect(result[0].text).toBe(text);
    });

    test('creates overlapping chunks for long text', () => {
        const text = 'a'.repeat(1000);
        const result = chunkText(text, 'paper.txt');
        expect(result.length).toBeGreaterThan(1);
        result.forEach(chunk => {
            expect(chunk.source).toBe('paper.txt');
        });
    });
});

describe('cosineSimilarity', () => {

    test('identical vectors return 1', () => {
        expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    });

    test('opposite vectors return -1', () => {
        expect(cosineSimilarity([1, 0, 0], [-1, 0, 0])).toBeCloseTo(-1);
    });

    test('orthogonal vectors return 0', () => {
        expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    });

    test('zero vector returns 0', () => {
        expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    });
});
