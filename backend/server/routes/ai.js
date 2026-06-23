import express from 'express';
import { aiService } from '../services/aiService.js';
import { authMiddleware } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = express.Router();

// Apply auth middleware to protect these simulator endpoints
router.use(authMiddleware);

// Route to simulate dynamic pricing calculations
router.post('/surge', async (req, res, next) => {
  try {
    const { active_bookings_5km, online_experts_5km, hour_of_day, is_weekend } = req.body;
    
    // Construct the payload exactly as Python expects
    const features = {
      active_bookings_5km: Number(active_bookings_5km ?? 0),
      online_experts_5km: Number(online_experts_5km ?? 0),
      hour_of_day: Number(hour_of_day ?? 12),
      is_weekend: Boolean(is_weekend ?? false)
    };

    const multiplier = await aiService.getSurgeMultiplier(features);
    res.json({ features, multiplier });
  } catch (err) {
    next(err);
  }
});

// Route to simulate batch matching calculations
router.post('/match', async (req, res, next) => {
  try {
    const { bookings, candidates } = req.body;
    
    // Call the Python matching microservice
    const assignments = await aiService.solveBatchMatching(bookings, candidates);
    res.json({ bookings, candidates, assignments });
  } catch (err) {
    next(err);
  }
});

// Route to simulate escrow risk calculations
router.post('/escrow/analyze', async (req, res, next) => {
  try {
    const { amount, expert_rating, expert_completed_jobs, customer_dispute_ratio, is_first_time_pairing } = req.body;
    
    const features = {
      amount: Number(amount ?? 50),
      expert_rating: Number(expert_rating ?? 4.8),
      expert_completed_jobs: Number(expert_completed_jobs ?? 10),
      customer_dispute_ratio: Number(customer_dispute_ratio ?? 0.0),
      is_first_time_pairing: Boolean(is_first_time_pairing ?? false)
    };

    const analysis = await aiService.analyzeEscrow(features);
    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

// Route to run AI diagnostic service classification
router.post('/diagnostic/analyze', async (req, res, next) => {
  try {
    const { description, service_id } = req.body;
    
    // Fetch global_gemini_api_key from CMS settings
    const geminiSetting = await prisma.settings.findUnique({
      where: { setting_key: 'global_gemini_api_key' }
    });
    const apiKey = geminiSetting?.setting_value || process.env.GEMINI_API_KEY || '';

    const analysis = await aiService.analyzeDiagnostic({
      description: String(description ?? ''),
      service_id: String(service_id ?? ''),
      api_key: apiKey
    });
    
    // Asynchronously log the interaction to build our training dataset
    prisma.ai_interactions.create({
      data: {
        user_id: req.user?.id || null,
        service_id: String(service_id ?? ''),
        user_prompt: String(description ?? ''),
        ai_response: analysis
      }
    }).catch(e => console.error("Failed to log AI interaction:", e));

    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

export default router;
