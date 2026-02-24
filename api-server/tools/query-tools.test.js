const { validateQuerySpec } = require('./query-tools');

describe('validateQuerySpec', () => {

    // Missing / invalid spec
    test('rejects null spec', () => {
        const result = validateQuerySpec(null);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Missing collection name');
    });

    test('rejects spec without collection', () => {
        const result = validateQuerySpec({ pipeline: [] });
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Missing collection name');
    });

    // Collection validation
    test('rejects unknown collection', () => {
        const result = validateQuerySpec({ collection: 'passwords' });
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('not allowed');
    });

    test('accepts allowed collection', () => {
        const result = validateQuerySpec({ collection: 'sessions' });
        expect(result.valid).toBe(true);
    });

    test('accepts all valid collections', () => {
        const allowed = ['sessions', 'app_events', 'website_events', 'camera_events', 'interventions', 'configs', 'predictions'];
        allowed.forEach(collection => {
            expect(validateQuerySpec({ collection }).valid).toBe(true);
        });
    });

    // Dangerous operators
    test('rejects $out operator', () => {
        const result = validateQuerySpec({
            collection: 'sessions',
            pipeline: [{ $out: 'hacked' }]
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('$out');
    });

    test('rejects $merge operator', () => {
        const result = validateQuerySpec({
            collection: 'sessions',
            pipeline: [{ $merge: 'other_collection' }]
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('$merge');
    });

    test('rejects $set operator', () => {
        const result = validateQuerySpec({
            collection: 'app_events',
            pipeline: [{ $set: { hacked: true } }]
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('$set');
    });

    // Safe operators
    test('allows safe operators like $sort and $limit', () => {
        const result = validateQuerySpec({
            collection: 'sessions',
            pipeline: [{ $sort: { started_at: -1 } }, { $limit: 5 }]
        });
        expect(result.valid).toBe(true);
    });

    // Pipeline length
    test('rejects pipeline over 10 stages', () => {
        const longPipeline = Array(11).fill({ $sort: { ts: -1 } });
        const result = validateQuerySpec({
            collection: 'sessions',
            pipeline: longPipeline
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('max 10');
    });

    test('accepts pipeline with exactly 10 stages', () => {
        const pipeline = Array(10).fill({ $sort: { ts: -1 } });
        const result = validateQuerySpec({
            collection: 'sessions',
            pipeline: pipeline
        });
        expect(result.valid).toBe(true);
    });
});



// ============================================================================
// Integration Tests — query tool functions with mock DB
// ============================================================================

const { queryTools } = require('./query-tools');

// Helper: pull a tool's execute function by name
const getTool = (name) => queryTools.find(t => t.name === name).execute;

// Helper: create a mock collection that mimics MongoDB's chaining API
function mockCollection(data) {
    const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(data.findArray || []),
    };
    return {
        findOne: jest.fn().mockResolvedValue(data.findOne || null),
        countDocuments: jest.fn().mockResolvedValue(data.countDocuments || 0),
        find: jest.fn().mockReturnValue(chain),
        aggregate: jest.fn().mockReturnValue(chain),
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id' }),
    };
}

// Helper: create a mock db where each collection name maps to its own mock
function mockDb(collectionMap) {
    return {
        collection: jest.fn((name) => collectionMap[name] || mockCollection({})),
    };
}


// ---- getSessionOverview ----

describe('getSessionOverview', () => {
    const getSessionOverview = getTool('getSessionOverview');

    test('returns session metadata when found', async () => {
        const sessionDoc = {
            session_id: 'sess-001',
            started_at: '2024-01-01T12:00:00Z',
            ended_at: '2024-01-01T13:00:00Z',
            config_name: 'study_config',
            web_policy: { allow: [], deny: ['facebook.com'] },
            app_policy: { allow: [], deny: ['discord'] },
            vision_policy: { require_presence: true, away_grace_sec: 5 },
        };
        const db = mockDb({
            sessions: mockCollection({ findOne: sessionDoc }),
        });

        const result = await getSessionOverview(db, 'sess-001');

        expect(result.session_id).toBe('sess-001');
        expect(result.config_name).toBe('study_config');
        expect(result.duration_sec).toBe(3600);
        expect(result.web_policy).toEqual({ allow: [], deny: ['facebook.com'] });
    });

    test('returns error when session not found', async () => {
        const db = mockDb({
            sessions: mockCollection({ findOne: null }),
        });

        const result = await getSessionOverview(db, 'nonexistent');
        expect(result.error).toBe('Session not found');
    });
});


// ---- getSessionStats ----

describe('getSessionStats', () => {
    const getSessionStats = getTool('getSessionStats');

    test('returns stats when session is complete', async () => {
        const db = mockDb({
            sessions: mockCollection({
                findOne: {
                    session_id: 'sess-001',
                    stats: { focus_pct: 0.85, away_secs: 120, violations: { web: 3, app: 1, affect: 2 } },
                },
            }),
        });

        const result = await getSessionStats(db, 'sess-001');
        expect(result.focus_pct).toBe(0.85);
        expect(result.away_secs).toBe(120);
        expect(result.violations.web).toBe(3);
    });

    test('returns message when session still running (no stats)', async () => {
        const db = mockDb({
            sessions: mockCollection({
                findOne: { session_id: 'sess-002', stats: null },
            }),
        });

        const result = await getSessionStats(db, 'sess-002');
        expect(result.message).toContain('still running');
    });
});


// ---- getViolationCounts ----

describe('getViolationCounts', () => {
    const getViolationCounts = getTool('getViolationCounts');

    test('counts violations across all 3 collections', async () => {
        const db = mockDb({
            website_events: mockCollection({ countDocuments: 5 }),
            app_events: mockCollection({ countDocuments: 3 }),
            camera_events: mockCollection({ countDocuments: 7 }),
        });

        const result = await getViolationCounts(db, 'sess-001');
        expect(result.web_violations).toBe(5);
        expect(result.app_violations).toBe(3);
        expect(result.emotion_violations).toBe(7);
        expect(result.total).toBe(15);
    });
});


// ---- getTopApps ----

describe('getTopApps', () => {
    const getTopApps = getTool('getTopApps');

    test('groups and sorts apps by duration', async () => {
        const events = [
            { app_name: 'Chrome', ts_open: '2024-01-01T12:00:00Z', ts_close: '2024-01-01T12:10:00Z', policy: { allowed: true } },
            { app_name: 'Chrome', ts_open: '2024-01-01T12:20:00Z', ts_close: '2024-01-01T12:25:00Z', policy: { allowed: true } },
            { app_name: 'Discord', ts_open: '2024-01-01T12:00:00Z', ts_close: '2024-01-01T12:02:00Z', policy: { allowed: false } },
        ];
        const db = mockDb({
            app_events: mockCollection({ findArray: events }),
        });

        const result = await getTopApps(db, 'sess-001');

        // Chrome: 600 + 300 = 900 sec, Discord: 120 sec
        expect(result[0].app_name).toBe('Chrome');
        expect(result[0].duration_sec).toBe(900);
        expect(result[0].count).toBe(2);
        expect(result[1].app_name).toBe('Discord');
        expect(result[1].duration_sec).toBe(120);
        expect(result[1].allowed).toBe(false);
    });

    test('returns empty array when no events', async () => {
        const db = mockDb({
            app_events: mockCollection({ findArray: [] }),
        });

        const result = await getTopApps(db, 'sess-001');
        expect(result).toEqual([]);
    });
});


// ---- getTopWebsites ----

describe('getTopWebsites', () => {
    const getTopWebsites = getTool('getTopWebsites');

    test('groups and sorts websites by duration', async () => {
        const events = [
            { domain: 'google.com', ts_open: '2024-01-01T12:00:00Z', ts_close: '2024-01-01T12:05:00Z', policy: { allowed: true } },
            { domain: 'facebook.com', ts_open: '2024-01-01T12:10:00Z', ts_close: '2024-01-01T12:20:00Z', policy: { allowed: false } },
        ];
        const db = mockDb({
            website_events: mockCollection({ findArray: events }),
        });

        const result = await getTopWebsites(db, 'sess-001');

        expect(result[0].domain).toBe('facebook.com');
        expect(result[0].duration_sec).toBe(600);
        expect(result[1].domain).toBe('google.com');
        expect(result[1].duration_sec).toBe(300);
    });
});


// ---- getDeniedApps ----

describe('getDeniedApps', () => {
    const getDeniedApps = getTool('getDeniedApps');

    test('returns formatted denied app events', async () => {
        const events = [
            { app_name: 'Discord', window_title: 'Discord - Chat', ts_open: '2024-01-01T12:00:00Z', ts_close: '2024-01-01T12:05:00Z' },
        ];
        const db = mockDb({
            app_events: mockCollection({ findArray: events }),
        });

        const result = await getDeniedApps(db, 'sess-001');

        expect(result).toHaveLength(1);
        expect(result[0].app_name).toBe('Discord');
        expect(result[0].duration_sec).toBe(300);
        expect(result[0].window_title).toBe('Discord - Chat');
    });
});


// ---- getDeniedWebsites ----

describe('getDeniedWebsites', () => {
    const getDeniedWebsites = getTool('getDeniedWebsites');

    test('returns formatted denied website events', async () => {
        const events = [
            { domain: 'facebook.com', window_title: 'Facebook - Chrome', ts_open: '2024-01-01T12:00:00Z', ts_close: '2024-01-01T12:03:00Z' },
        ];
        const db = mockDb({
            website_events: mockCollection({ findArray: events }),
        });

        const result = await getDeniedWebsites(db, 'sess-001');

        expect(result).toHaveLength(1);
        expect(result[0].domain).toBe('facebook.com');
        expect(result[0].duration_sec).toBe(180);
    });
});


// ---- getEmotionTimeline ----

describe('getEmotionTimeline', () => {
    const getEmotionTimeline = getTool('getEmotionTimeline');

    test('returns formatted emotion events', async () => {
        const events = [
            { ts: '2024-01-01T12:00:00Z', affect: { label: 'happy', confidence: 0.9 }, presence: { state: 'present' } },
            { ts: '2024-01-01T12:01:00Z', affect: { label: 'missing', confidence: 1.0 }, presence: { state: 'away' } },
        ];
        const db = mockDb({
            camera_events: mockCollection({ findArray: events }),
        });

        const result = await getEmotionTimeline(db, 'sess-001');

        expect(result).toHaveLength(2);
        expect(result[0].emotion).toBe('happy');
        expect(result[0].confidence).toBe(0.9);
        expect(result[0].presence).toBe('present');
        expect(result[1].emotion).toBe('missing');
    });
});


// ---- getFocusBreakdown ----

describe('getFocusBreakdown', () => {
    const getFocusBreakdown = getTool('getFocusBreakdown');

    test('calculates allowed vs denied time', async () => {
        const appEvents = [
            { ts_open: '2024-01-01T12:00:00Z', ts_close: '2024-01-01T12:10:00Z', policy: { allowed: true } },
        ];
        const webEvents = [
            { ts_open: '2024-01-01T12:10:00Z', ts_close: '2024-01-01T12:15:00Z', policy: { allowed: false } },
        ];
        const db = mockDb({
            app_events: mockCollection({ findArray: appEvents }),
            website_events: mockCollection({ findArray: webEvents }),
        });

        const result = await getFocusBreakdown(db, 'sess-001');

        // allowed: 600s, denied: 300s, total: 900s
        expect(result.allowed_sec).toBe(600);
        expect(result.denied_sec).toBe(300);
        expect(result.total_sec).toBe(900);
        expect(result.focus_pct).toBe(67); // Math.round(600/900 * 100)
    });

    test('returns 0 focus when no events', async () => {
        const db = mockDb({
            app_events: mockCollection({ findArray: [] }),
            website_events: mockCollection({ findArray: [] }),
        });

        const result = await getFocusBreakdown(db, 'sess-001');
        expect(result.total_sec).toBe(0);
        expect(result.focus_pct).toBe(0);
    });
});


// ---- getInterventions ----

describe('getInterventions', () => {
    const getInterventions = getTool('getInterventions');

    test('returns formatted intervention events', async () => {
        const events = [
            { ts: '2024-01-01T12:05:00Z', nudge_type: 'popup', trigger_reason: 'denied_app', user_response: 'closed_app', follow_up_result: 'complied', latency_ms: 150 },
        ];
        const db = mockDb({
            interventions: mockCollection({ findArray: events }),
        });

        const result = await getInterventions(db, 'sess-001');

        expect(result).toHaveLength(1);
        expect(result[0].nudge_type).toBe('popup');
        expect(result[0].trigger_reason).toBe('denied_app');
        expect(result[0].latency_ms).toBe(150);
    });

    test('returns empty array when no interventions', async () => {
        const db = mockDb({
            interventions: mockCollection({ findArray: [] }),
        });

        const result = await getInterventions(db, 'sess-001');
        expect(result).toEqual([]);
    });
});
