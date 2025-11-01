import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as shareController from '../controllers/shareController.js';

const router = express.Router();

/**
 * Share Routes
 * All routes require JWT authentication via Bearer token
 */

// Create a location sharing request
router.post('/request', authenticate, shareController.createRequest);

// Get all share requests (inbound and outbound)
router.get('/requests', authenticate, shareController.getRequests);

// Approve or reject a share request
router.post('/requests/:requestId/approve', authenticate, shareController.respondToRequest);

// Revoke a pending request
router.post('/requests/:requestId/revoke', authenticate, shareController.revokeRequest);

// Revoke an active sharing session
router.post('/session/:sessionId/revoke', authenticate, shareController.revokeSession);

// Get active sessions
router.get('/sessions', authenticate, shareController.getActiveSessions);

// Direct location sharing (no approval needed)
router.post('/direct', authenticate, shareController.startDirectShare);

// Search users by username/email/phone
router.get('/users/search', authenticate, shareController.searchUsers);

export default router;

