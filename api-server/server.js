

const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({path: path.join(__dirname, '../.env')});
const { handleSmartQuery } = require('./tools/smart-query');
const { indexResearchFiles, getStatus: getRagStatus } = require('./tools/rag');

const uri = process.env.DATABASE_URI;
const dbName = process.env.DATABASE_NAME;

// Session control — proxy to Flask (port 12040)
const FLASK_URL = process.env.FLASK_URL || 'http://localhost:12040';


function createApp(db) {
    const app = express();
    app.use(express.json());

    const cors = require('cors');
    app.use(cors());

    //API endpoint to get camera events with pagination
    app.get('/api/camera-events', async (req, res) => {
       const page =parseInt(req.query.page) || 1;
       const limit = parseInt(req.query.limit) || 10;
       const filter = req.query.session_id ? { session_id: req.query.session_id } : {};
       const data = await db.collection('camera_events')
       .find(filter)
       .sort({ ts: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

       res.json({ data });

    });

    // API endpoint to get web events with pagination
    app.get('/api/web', async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const filter = req.query.session_id ? { session_id: req.query.session_id } : {};
        const data = await db.collection('website_events')
            .find(filter)
            .sort({ ts: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();
        res.json({ data });
    });

    // API endpoint to get app events with pagination
    app.get('/api/apps', async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const filter = req.query.session_id ? { session_id: req.query.session_id } : {};
        const data = await db.collection('app_events')
            .find(filter)
            .sort({ ts: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();
        res.json({ data });
    });

    // API endpoint to get sessions
    app.get('/api/sessions', async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const filter = req.query.session_id ? { session_id: req.query.session_id } : {};
        const data = await db.collection('sessions')
            .find(filter)
            .sort({ started_at: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();
        res.json({ data });
    });

    // API endpoint to get interventions with pagination
    app.get('/api/interventions', async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const filter = req.query.session_id ? { session_id: req.query.session_id } : {};
        const data = await db.collection('interventions')
            .find(filter)
            .sort({ ts: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();
        res.json({ data });
    });

    // API endpoint to get configs with pagination
    app.get('/api/configs', async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const data = await db.collection('configs')
            .find({})
            .sort({ created_ts: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();
        res.json({ data });
    });

    // Optional: API endpoint to get predictions with pagination
    app.get('/api/predictions', async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const filter = req.query.session_id ? { session_id: req.query.session_id } : {};
        const data = await db.collection('predictions')
            .find(filter)
            .sort({ ts_generated: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();
        res.json({ data });
    });

    // POST endpoint to create a new config
    app.post('/api/configs', async (req, res) => {
        try {
            const { name, json, source } = req.body;
            if (!name || !json || !json.action) {
                return res.status(400).json({ success: false, error: 'Missing required fields: name, json.action' });
            }
            const existing = await db.collection('configs').findOne({ name });
            if (existing) {
                return res.status(409).json({ success: false, error: `Config "${name}" already exists` });
            }
            const now = new Date();
            const doc = {
                name,
                json,
                source: source || 'preset',
                prompt: null,
                created_ts: now,
                updated_ts: now,
                schema_version: 2,
            };
            await db.collection('configs').insertOne(doc);
            res.status(201).json({ success: true, data: doc });
        } catch (error) {
            console.error('Error creating config:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    // DELETE endpoint to remove a config
    app.delete('/api/configs/:id', async (req, res) => {
        try {
            const result = await db.collection('configs').deleteOne({ _id: new ObjectId(req.params.id) });
            if (result.deletedCount === 0) {
                return res.status(404).json({ success: false, error: 'Config not found' });
            }
            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting config:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    // POST endpoint for AI query (Ollama + RAG)
    app.post('/api/query', async (req, res) => {
        const { question, session_id } = req.body;
        if (!question) {
            return res.status(400).json({ success: false, error: 'Missing question' });
        }
        try {
            const result = await handleSmartQuery(db, question, session_id);
            res.json(result);
        } catch (error) {
            console.error('Smart query error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process query. Is Ollama running?',
            });
        }
    });

    // GET endpoint to check RAG status
    app.get('/api/rag/status', (req, res) => {
        res.json(getRagStatus());
    });

    // POST endpoint to re-index research files
    app.post('/api/rag/reindex', async (req, res) => {
        try {
            await indexResearchFiles();
            res.json({ success: true, ...getRagStatus() });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // GET /api/capabilities — system capability detection (Linux xdotool check)
    app.get('/api/capabilities', (req, res) => {
        const { execSync } = require('child_process');
        const os = require('os');
        const platform = os.platform();
        let xdotool = null;
        if (platform === 'linux') {
            try {
                execSync('which xdotool', { stdio: 'ignore' });
                xdotool = true;
            } catch {
                xdotool = false;
            }
        }
        res.json({ platform, xdotool });
    });

    // Session control — proxy to Flask
    app.post('/api/session/start', async (req, res) => {
        try {
            const { config_name } = req.body;
            if (!config_name) {
                return res.status(400).json({ error: 'Missing config_name' });
            }
            const flaskRes = await fetch(`${FLASK_URL}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config_name }),
            });
            const data = await flaskRes.json();
            res.status(flaskRes.status).json(data);
        } catch (error) {
            console.error('Error starting session:', error);
            res.status(503).json({ error: 'Processing engine not available' });
        }
    });

    app.post('/api/session/stop', async (req, res) => {
        try {
            const flaskRes = await fetch(`${FLASK_URL}/stop`, { method: 'POST' });
            const data = await flaskRes.json();
            res.status(flaskRes.status).json(data);
        } catch (error) {
            console.error('Error stopping session:', error);
            res.status(503).json({ error: 'Processing engine not available' });
        }
    });

    app.get('/api/session/status', async (req, res) => {
        try {
            const flaskRes = await fetch(`${FLASK_URL}/status`);
            const data = await flaskRes.json();
            res.status(flaskRes.status).json(data);
        } catch (error) {
            console.error('Error getting session status:', error);
            res.status(503).json({ error: 'Processing engine not available' });
        }
    });

    return app;
}


// Only connect to MongoDB and start server when run directly (not imported by tests)
if (require.main === module) {
    MongoClient.connect(uri).then(async (client) => {
        const db = client.db(dbName);
        console.log('Connected to MongoDB');

        indexResearchFiles().catch(err => console.error('[RAG] Indexing failed:', err.message));

        const app = createApp(db);
        // Serve built React dashboard in production
        if(process.env.NODE_ENV !== 'development'){
            const clientPath = path.join(__dirname, '../dahsboard/dist')
            app.use(express.static(clientPath))
            //SPA fallback
            app.get('*', (req,res) => {
                res.sendFile(path.join(clientPath, 'index.html'))
            })
        }
        app.listen(12039, () => console.log('API server running on http://localhost:12039'));
    });
}

module.exports = { createApp };
