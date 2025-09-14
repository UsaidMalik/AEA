// routes.js
import express from "express";

const router = express.Router();

function paginatedRoute(collectionName) {
  return async (req, res) => {
    try {
      const db = req.app.locals.db;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const collection = db.collection(collectionName);
      const total = await collection.countDocuments();
      const data = await collection.find().skip(skip).limit(limit).toArray();

      res.json({
        success: true,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        data,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

router.get("/sessions", paginatedRoute("sessions"));
router.get("/apps", paginatedRoute("apps"));
router.get("/web", paginatedRoute("web"));
router.get("/camera-events", paginatedRoute("camera_events"));
router.get("/interventions", paginatedRoute("interventions"));
router.get("/configs", paginatedRoute("configs"));
router.get("/predictions", paginatedRoute("predictions"));

export default router;
