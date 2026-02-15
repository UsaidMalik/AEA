/**
 * ~Raheem
 * Query Tools — 10 base metric functions for Smart Query
 * Each function takes (db, session_id) and returns structured data
 * Used by the LLM orchestrator to answer natural language questions
 */


// ============================================================================
// 1. Session Overview
// ============================================================================

async function getSessionOverview(db, session_id) {
    const session = await db.collection('sessions').findOne({ session_id });
    if (!session) return { error: 'Session not found' };

    const duration = session.ended_at
        ? Math.round((new Date(session.ended_at) - new Date(session.started_at)) / 1000)
        : null;

    return {
        session_id: session.session_id,
        started_at: session.started_at,
        ended_at: session.ended_at,
        duration_sec: duration,
        config_name: session.config_name,
        web_policy: session.web_policy,
        app_policy: session.app_policy,
        vision_policy: session.vision_policy,
    };
}


// ============================================================================
// 2. Session Stats
// ============================================================================

async function getSessionStats(db, session_id) {
    const session = await db.collection('sessions').findOne({ session_id });
    if (!session) return { error: 'Session not found' };
    if (!session.stats) return { message: 'Session still running, stats not computed yet' };

    return {
        focus_pct: session.stats.focus_pct,
        away_secs: session.stats.away_secs,
        violations: session.stats.violations,
    };
}


// ============================================================================
// 3. Violation Counts
// ============================================================================

async function getViolationCounts(db, session_id) {
    const [web, app, emotion] = await Promise.all([
        db.collection('website_events').countDocuments({ session_id, 'policy.allowed': false }),
        db.collection('app_events').countDocuments({ session_id, 'policy.allowed': false }),
        db.collection('camera_events').countDocuments({ session_id }),
    ]);

    return {
        web_violations: web,
        app_violations: app,
        emotion_violations: emotion,
        total: web + app + emotion,
    };
}


// ============================================================================
// 4. Top Apps
// ============================================================================

async function getTopApps(db, session_id) {
    const events = await db.collection('app_events').find({ session_id }).toArray();

    const appMap = {};
    for (const e of events) {
        const dur = (new Date(e.ts_close) - new Date(e.ts_open)) / 1000;
        if (!appMap[e.app_name]) appMap[e.app_name] = { duration: 0, count: 0, allowed: e.policy?.allowed };
        appMap[e.app_name].duration += dur;
        appMap[e.app_name].count += 1;
    }

    return Object.entries(appMap)
        .map(([app_name, data]) => ({
            app_name,
            duration_sec: Math.round(data.duration),
            count: data.count,
            allowed: data.allowed,
        }))
        .sort((a, b) => b.duration_sec - a.duration_sec);
}


// ============================================================================
// 5. Top Websites
// ============================================================================

async function getTopWebsites(db, session_id) {
    const events = await db.collection('website_events').find({ session_id }).toArray();

    const siteMap = {};
    for (const e of events) {
        const dur = (new Date(e.ts_close) - new Date(e.ts_open)) / 1000;
        if (!siteMap[e.domain]) siteMap[e.domain] = { duration: 0, count: 0, allowed: e.policy?.allowed };
        siteMap[e.domain].duration += dur;
        siteMap[e.domain].count += 1;
    }

    return Object.entries(siteMap)
        .map(([domain, data]) => ({
            domain,
            duration_sec: Math.round(data.duration),
            count: data.count,
            allowed: data.allowed,
        }))
        .sort((a, b) => b.duration_sec - a.duration_sec);
}


// ============================================================================
// 6. Denied Apps
// ============================================================================

async function getDeniedApps(db, session_id) {
    const events = await db.collection('app_events')
        .find({ session_id, 'policy.allowed': false })
        .sort({ ts_open: -1 })
        .toArray();

    return events.map(e => ({
        app_name: e.app_name,
        window_title: e.window_title,
        duration_sec: Math.round((new Date(e.ts_close) - new Date(e.ts_open)) / 1000),
        ts_open: e.ts_open,
        ts_close: e.ts_close,
    }));
}


// ============================================================================
// 7. Denied Websites
// ============================================================================

async function getDeniedWebsites(db, session_id) {
    const events = await db.collection('website_events')
        .find({ session_id, 'policy.allowed': false })
        .sort({ ts_open: -1 })
        .toArray();

    return events.map(e => ({
        domain: e.domain,
        window_title: e.window_title,
        duration_sec: Math.round((new Date(e.ts_close) - new Date(e.ts_open)) / 1000),
        ts_open: e.ts_open,
        ts_close: e.ts_close,
    }));
}


// ============================================================================
// 8. Emotion Timeline
// ============================================================================

async function getEmotionTimeline(db, session_id) {
    const events = await db.collection('camera_events')
        .find({ session_id })
        .sort({ ts: 1 })
        .limit(100)
        .toArray();

    return events.map(e => ({
        ts: e.ts,
        emotion: e.affect?.label,
        confidence: e.affect?.confidence,
        presence: e.presence?.state,
    }));
}


// ============================================================================
// 9. Focus Breakdown
// ============================================================================

async function getFocusBreakdown(db, session_id) {
    const [apps, webs] = await Promise.all([
        db.collection('app_events').find({ session_id }).toArray(),
        db.collection('website_events').find({ session_id }).toArray(),
    ]);

    let allowed_sec = 0, denied_sec = 0;
    for (const e of [...apps, ...webs]) {
        const dur = (new Date(e.ts_close) - new Date(e.ts_open)) / 1000;
        if (e.policy?.allowed) allowed_sec += dur;
        else denied_sec += dur;
    }

    const total = allowed_sec + denied_sec;
    return {
        allowed_sec: Math.round(allowed_sec),
        denied_sec: Math.round(denied_sec),
        total_sec: Math.round(total),
        focus_pct: total > 0 ? Math.round((allowed_sec / total) * 100) : 0,
    };
}


// ============================================================================
// 10. Interventions
// ============================================================================

async function getInterventions(db, session_id) {
    const events = await db.collection('interventions')
        .find({ session_id })
        .sort({ ts: 1 })
        .toArray();

    return events.map(e => ({
        ts: e.ts,
        nudge_type: e.nudge_type,
        trigger_reason: e.trigger_reason,
        user_response: e.user_response,
        follow_up_result: e.follow_up_result,
        latency_ms: e.latency_ms,
    }));
}


// ============================================================================
// 11. Custom Query (LLM escape hatch — find + aggregate with guardrails)
// ============================================================================

const ALLOWED_COLLECTIONS = ['sessions', 'app_events', 'website_events', 'camera_events', 'interventions', 'configs', 'predictions'];
const DANGEROUS_OPERATORS = ['$out', '$merge', '$set', '$unset', '$replaceRoot', '$replaceWith', '$addFields'];
const MAX_RESULTS = 100;

function validateQuerySpec(spec) {
    if (!spec || !spec.collection) {
        return { valid: false, reason: 'Missing collection name' };
    }
    if (!ALLOWED_COLLECTIONS.includes(spec.collection)) {
        return { valid: false, reason: `Collection "${spec.collection}" not allowed. Allowed: ${ALLOWED_COLLECTIONS.join(', ')}` };
    }

    // Check aggregation pipeline for dangerous stages
    if (spec.pipeline && Array.isArray(spec.pipeline)) {
        const stageKeys = spec.pipeline.flatMap(stage => Object.keys(stage));
        const dangerous = stageKeys.filter(k => DANGEROUS_OPERATORS.includes(k));
        if (dangerous.length > 0) {
            return { valid: false, reason: `Dangerous operators not allowed: ${dangerous.join(', ')}` };
        }
        if (spec.pipeline.length > 10) {
            return { valid: false, reason: 'Pipeline too long (max 10 stages)' };
        }
    }

    return { valid: true };
}

async function customQuery(db, session_id, querySpec) {
    const validation = validateQuerySpec(querySpec);
    if (!validation.valid) {
        return { error: validation.reason };
    }

    const collection = db.collection(querySpec.collection);

    // Aggregation pipeline mode
    if (querySpec.pipeline && Array.isArray(querySpec.pipeline)) {
        const results = await collection
            .aggregate(querySpec.pipeline)
            .limit(MAX_RESULTS)
            .toArray();
        return { type: 'aggregate', count: results.length, data: results };
    }

    // Find mode
    const filter = querySpec.filter || {};
    const sort = querySpec.sort || {};
    const limit = Math.min(querySpec.limit || 50, MAX_RESULTS);
    const projection = querySpec.projection || {};

    const results = await collection
        .find(filter, { projection })
        .sort(sort)
        .limit(limit)
        .toArray();

    return { type: 'find', count: results.length, data: results };
}


// ============================================================================
// Export — Tool registry for the LLM orchestrator
// ============================================================================

const queryTools = [
    { name: 'getSessionOverview',  description: 'Get session metadata: start/end time, duration, config name, policies', execute: getSessionOverview },
    { name: 'getSessionStats',     description: 'Get focus percentage, away seconds, and violation counts (web, app, emotion)', execute: getSessionStats },
    { name: 'getViolationCounts',  description: 'Count all violations by type: web, app, and emotion', execute: getViolationCounts },
    { name: 'getTopApps',          description: 'Get top applications ranked by total usage time', execute: getTopApps },
    { name: 'getTopWebsites',      description: 'Get top websites ranked by total visit time', execute: getTopWebsites },
    { name: 'getDeniedApps',       description: 'Get all denied/banned application usage events with details', execute: getDeniedApps },
    { name: 'getDeniedWebsites',   description: 'Get all denied/banned website visit events with details', execute: getDeniedWebsites },
    { name: 'getEmotionTimeline',  description: 'Get emotion/camera events over time with labels and confidence', execute: getEmotionTimeline },
    { name: 'getFocusBreakdown',   description: 'Calculate time on allowed vs denied activities and focus percentage', execute: getFocusBreakdown },
    { name: 'getInterventions',    description: 'Get all nudges/notifications sent during the session', execute: getInterventions },
    { name: 'customQuery',         description: 'Run a custom MongoDB find or aggregation pipeline when predefined tools are not enough. Requires a querySpec object with: collection, filter/sort/limit (for find) OR pipeline (for aggregate). Use for cross-session analysis, weekly trends, grouping by day, averages, or any query the other tools cannot handle.', execute: customQuery, requiresSpec: true },
];

module.exports = { queryTools };
