jest.mock('./tools/smart-query')
jest.mock('./tools/rag')

const request = require('supertest');
const {createApp}= require('./server');
const {handleSmartQuery}= require('./tools/smart-query');
const {indexResearchFiles, getStatus:getRagStatus} = require('./tools/rag');

function mockCollection(data= {}){
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
    return {
        collection: jest.fn((name) => collectionMap[name] || mockCollection ()),
    };
}

describe('Get /api/camera-events', () => {
    test('returns 200 with data', async() => {
        //1. Set up mock data
        const events = [{ts: '2024-01-01', affect: {label:'happy'}}];
        const db = mockDb({camera_events: mockCollection({findArray: events})});
        const app = createApp(db);
        const res = await request(app).get('/api/camera-events');
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual(events);

    });

    test('filters by session_id', async() => {
        const col = mockCollection({findArray: []});
        const db = mockDb({camera_events: col});
        const app = createApp(db);

        await request(app).get('/api/camera-events?session_id=sess-001');
        expect(col.find).toHaveBeenCalledWith({session_id: 'sess-001'})
    });

    test('uses page and limit for pagination', async()=> {
        const col = mockCollection({findArray: []});
        const db = mockDb({camera_events: col});
        const app = createApp(db);

        await request(app).get('/api/camera-events?page=3&limit=5');
        expect(col._chain.skip).toHaveBeenCalledWith(10);
        expect(col._chain.limit).toHaveBeenCalledWith(5);
    });



});



// API endpoints to get web events with pagination
describe('Get /api/web', () => {
    test('returns 200 with data ', async() =>{
        const events = [{ts: '2024-01-01', window:'mock'  }]
        const db = mockDb({website_events: mockCollection({findArray: events})});
        const app = createApp(db);

        const res = await request(app).get('/api/web');
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual(events);
    });

    test('filters with sessionId', async() => {
        const col = mockCollection({findArray: []});
        const db = mockDb({website_events: col});
        const app = createApp(db);

        await request(app).get('/api/web?session_id=sess-001');
        expect(col.find).toHaveBeenCalledWith({ session_id: 'sess-001' });
    });

    test('uses page and limit for pagination', async () => {
        const col = mockCollection({ findArray: [] });
        const db = mockDb({ website_events: col });
        const app = createApp(db);

        await request(app).get('/api/web?page=2&limit=5');

        // page=2, limit=5 → skip (2-1)*5 = 5
        expect(col._chain.skip).toHaveBeenCalledWith(5);
        expect(col._chain.limit).toHaveBeenCalledWith(5);
    });
});

describe('GET /api/apps', () => {
    test('returns 200 with data', async () => {
        const events = [{ ts: '2024-01-01', app_name: 'Chrome' }];
        const db = mockDb({ app_events: mockCollection({ findArray: events }) });
        const app = createApp(db);

        const res = await request(app).get('/api/apps');
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual(events);
    });

    test('filters by session_id', async () => {
        const col = mockCollection({ findArray: [] });
        const db = mockDb({ app_events: col });
        const app = createApp(db);

        await request(app).get('/api/apps?session_id=sess-001');
        expect(col.find).toHaveBeenCalledWith({ session_id: 'sess-001' });
    });

    test('uses page and limit for pagination', async () => {
        const col = mockCollection({ findArray: [] });
        const db = mockDb({ app_events: col });
        const app = createApp(db);

        await request(app).get('/api/apps?page=2&limit=5');
        expect(col._chain.skip).toHaveBeenCalledWith(5);
        expect(col._chain.limit).toHaveBeenCalledWith(5);
    });
});

describe('GET /api/sessions', () => {
    test('returns 200 with data', async () => {
        const sessions = [{ session_id: 'sess-001', started_at: '2024-01-01' }];
        const db = mockDb({ sessions: mockCollection({ findArray: sessions }) });
        const app = createApp(db);

        const res = await request(app).get('/api/sessions');
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual(sessions);
    });

    test('filters by session_id', async () => {
        const col = mockCollection({ findArray: [] });
        const db = mockDb({ sessions: col });
        const app = createApp(db);

        await request(app).get('/api/sessions?session_id=sess-001');
        expect(col.find).toHaveBeenCalledWith({ session_id: 'sess-001' });
    });

    test('uses page and limit for pagination', async () => {
        const col = mockCollection({ findArray: [] });
        const db = mockDb({ sessions: col });
        const app = createApp(db);

        await request(app).get('/api/sessions?page=4&limit=10');
        // page=4, limit=10 → skip (4-1)*10 = 30
        expect(col._chain.skip).toHaveBeenCalledWith(30);
        expect(col._chain.limit).toHaveBeenCalledWith(10);
    });
});

describe('GET /api/interventions', () => {
    test('returns 200 with data', async () => {
        const nudges = [{ ts: '2024-01-01', type: 'break' }];
        const db = mockDb({ interventions: mockCollection({ findArray: nudges }) });
        const app = createApp(db);

        const res = await request(app).get('/api/interventions');
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual(nudges);
    });

    test('filters by session_id', async () => {
        const col = mockCollection({ findArray: [] });
        const db = mockDb({ interventions: col });
        const app = createApp(db);

        await request(app).get('/api/interventions?session_id=sess-001');
        expect(col.find).toHaveBeenCalledWith({ session_id: 'sess-001' });
    });

    test('uses page and limit for pagination', async () => {
        const col = mockCollection({ findArray: [] });
        const db = mockDb({ interventions: col });
        const app = createApp(db);

        await request(app).get('/api/interventions?page=2&limit=3');
        // page=2, limit=3 → skip (2-1)*3 = 3
        expect(col._chain.skip).toHaveBeenCalledWith(3);
        expect(col._chain.limit).toHaveBeenCalledWith(3);
    });
});

describe('GET /api/predictions', () => {
    test('returns 200 with data', async () => {
        const preds = [{ ts_generated: '2024-01-01', label: 'distracted' }];
        const db = mockDb({ predictions: mockCollection({ findArray: preds }) });
        const app = createApp(db);

        const res = await request(app).get('/api/predictions');
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual(preds);
    });

    test('filters by session_id', async () => {
        const col = mockCollection({ findArray: [] });
        const db = mockDb({ predictions: col });
        const app = createApp(db);

        await request(app).get('/api/predictions?session_id=sess-001');
        expect(col.find).toHaveBeenCalledWith({ session_id: 'sess-001' });
    });

    test('uses page and limit for pagination', async () => {
        const col = mockCollection({ findArray: [] });
        const db = mockDb({ predictions: col });
        const app = createApp(db);

        await request(app).get('/api/predictions?page=2&limit=5');
        expect(col._chain.skip).toHaveBeenCalledWith(5);
        expect(col._chain.limit).toHaveBeenCalledWith(5);
    });
});

// ============================================================================
// Config CRUD
// ============================================================================

describe('Config endpoints', () => {
    test('GET /api/configs returns 200 with data', async () => {
        const configs = [{ name: 'study', json: { action: 'monitor' } }];
        const db = mockDb({ configs: mockCollection({ findArray: configs }) });
        const app = createApp(db);

        const res = await request(app).get('/api/configs');

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual(configs);
    });

    test('POST /api/configs creates config and returns 201', async () => {
        // findOne returns null → no duplicate
        const col = mockCollection({ findOne: null });
        const db = mockDb({ configs: col });
        const app = createApp(db);

        const res = await request(app)
            .post('/api/configs')
            .send({ name: 'study', json: { action: 'monitor' } });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('study');
        expect(col.insertOne).toHaveBeenCalled();
    });

    test('POST /api/configs returns 400 when json.action is missing', async () => {
        const db = mockDb({ configs: mockCollection() });
        const app = createApp(db);

        const res = await request(app)
            .post('/api/configs')
            .send({ name: 'study' }); // missing json entirely

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('POST /api/configs returns 409 for duplicate name', async () => {
        // findOne returns existing doc → duplicate
        const col = mockCollection({ findOne: { name: 'study', json: { action: 'monitor' } } });
        const db = mockDb({ configs: col });
        const app = createApp(db);

        const res = await request(app)
            .post('/api/configs')
            .send({ name: 'study', json: { action: 'monitor' } });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });

    test('DELETE /api/configs/:id returns 404 when config not found', async () => {
        // deletedCount: 0 → nothing was deleted
        const col = mockCollection({ deletedCount: 0 });
        const db = mockDb({ configs: col });
        const app = createApp(db);

        const res = await request(app).delete('/api/configs/507f1f77bcf86cd799439011');

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });
});

// ============================================================================
// Smart Query
// ============================================================================

describe('POST /api/query', () => {
    test('returns 200 with answer for valid question', async () => {
        handleSmartQuery.mockResolvedValue({
            success: true,
            answer: 'You had 3 violations.',
            tools_used: ['getViolationCounts'],
            research_used: false,
        });
        const db = mockDb();
        const app = createApp(db);

        const res = await request(app)
            .post('/api/query')
            .send({ question: 'How many violations?' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.answer).toBe('You had 3 violations.');
    });

    test('returns 400 when question is missing', async () => {
        const db = mockDb();
        const app = createApp(db);

        const res = await request(app)
            .post('/api/query')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

// ============================================================================
// RAG endpoints
// ============================================================================

describe('RAG endpoints', () => {
    test('GET /api/rag/status returns 200 with status object', async () => {
        getRagStatus.mockReturnValue({ indexed: true, chunks: 42, research_dir: './research' });
        const db = mockDb();
        const app = createApp(db);

        const res = await request(app).get('/api/rag/status');

        expect(res.status).toBe(200);
        expect(res.body.indexed).toBe(true);
        expect(res.body.chunks).toBe(42);
    });

    test('POST /api/rag/reindex returns 200 on success', async () => {
        indexResearchFiles.mockResolvedValue();
        getRagStatus.mockReturnValue({ indexed: true, chunks: 10, research_dir: './research' });
        const db = mockDb();
        const app = createApp(db);

        const res = await request(app).post('/api/rag/reindex');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.chunks).toBe(10);
    });
});

// ============================================================================
// Session proxy endpoints
// ============================================================================

describe('Session proxy endpoints', () => {
    afterEach(() => {
        global.fetch = undefined;
    });

    test('POST /api/session/start returns 400 when config_name missing', async () => {
        const db = mockDb();
        const app = createApp(db);

        const res = await request(app)
            .post('/api/session/start')
            .send({});

        expect(res.status).toBe(400);
    });

    test('POST /api/session/start proxies to Flask and returns response', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            status: 200,
            json: async () => ({ session_id: 'sess-001', config_name: 'study' }),
        });
        const db = mockDb();
        const app = createApp(db);

        const res = await request(app)
            .post('/api/session/start')
            .send({ config_name: 'study' });

        expect(res.status).toBe(200);
        expect(res.body.session_id).toBe('sess-001');
    });

    test('POST /api/session/stop proxies to Flask and returns response', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            status: 200,
            json: async () => ({ ended_at: '2024-01-01' }),
        });
        const db = mockDb();
        const app = createApp(db);

        const res = await request(app).post('/api/session/stop');

        expect(res.status).toBe(200);
        expect(res.body.ended_at).toBe('2024-01-01');
    });

    test('GET /api/session/status returns 503 when Flask is down', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));
        const db = mockDb();
        const app = createApp(db);

        const res = await request(app).get('/api/session/status');

        expect(res.status).toBe(503);
        expect(res.body.error).toBe('Processing engine not available');
    });
});
