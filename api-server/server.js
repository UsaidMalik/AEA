

const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.DATABASE_URI || 'mongodb://localhost:27017';
const dbName = process.env.DATABASE_NAME || 'aea_local';
let db;

const app = express();
app.use(express.json());

// Connect to MongoDB
MongoClient.connect(uri).then (client =>{
    db = client.db(dbName);
    console.log('Connected to MongoDB');
    app.listen(12039, () => console.log('API server running on http://localhost:12039'));
});


//API endpoint to get camera events with pagination
app.get('/api/camera-events', async (req, res) => {
   const page =parseInt(req.query.page) || 1;
   const limit = parseInt(req.query.limit) || 10;
   const data = await db.collection('camera_events')
   .find({})
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
    const data = await db.collection('website_events')
        .find({})
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
    const data = await db.collection('app_events')
        .find({})
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
    const data = await db.collection('sessions')
        .find({})
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
    const data = await db.collection('interventions')
        .find({})
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

// API endpoint to get predictions with pagination
app.get('/api/predictions', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const data = await db.collection('predictions')
        .find({})
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

// POST endpoint for AI query (Ollama)
app.post('/api/query', async (req, res) => {
    const { question, session_id } = req.body;
    if (!question || !session_id) {
        return res.status(400).json({ success: false, error: 'Missing question or session_id' });
    }
    // TODO: integrate with Ollama to generate MongoDB query from natural language
    res.status(501).json({ success: false, error: 'Ollama integration not yet implemented' });
});

