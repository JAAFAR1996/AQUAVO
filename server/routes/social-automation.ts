import { Router } from "express";
import { processCommentsForMedia, startMonitorMode, stopMonitorMode } from "../services/social/auto-responder.js";

const router = Router();

// Endpoint to trigger Replay Mode (Dry-run or actual execution)
router.post('/replay', async (req, res) => {
    try {
        const { platform, mediaId, accessToken, dryRun } = req.body;
        
        if (!platform || !mediaId || !accessToken) {
            return res.status(400).json({ success: false, error: 'Missing required parameters (platform, mediaId, accessToken)' });
        }

        const isDryRun = dryRun === true || dryRun === 'true';

        const result = await processCommentsForMedia(
            platform, 
            mediaId, 
            accessToken, 
            undefined, // Process all historical comments
            isDryRun
        );

        res.json({ success: true, result });
    } catch (error: any) {
        console.error('Replay mode error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint to start Monitor Mode
router.post('/monitor/start', (req, res) => {
    try {
        const { platform, mediaId, accessToken, intervalMs } = req.body;
        
        if (!platform || !mediaId || !accessToken) {
            return res.status(400).json({ success: false, error: 'Missing required parameters' });
        }

        startMonitorMode(
            platform, 
            mediaId, 
            accessToken, 
            intervalMs || 60000
        );

        res.json({ success: true, message: `Monitor started for ${platform} media ${mediaId}` });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint to stop Monitor Mode
router.post('/monitor/stop', (req, res) => {
    try {
        const { platform, mediaId } = req.body;
        if (!platform || !mediaId) {
            return res.status(400).json({ success: false, error: 'Missing required parameters' });
        }

        stopMonitorMode(platform, mediaId);
        res.json({ success: true, message: `Monitor stopped for ${platform} media ${mediaId}` });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
