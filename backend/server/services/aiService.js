const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export const aiService = {
  /**
   * Request dynamic surge pricing multiplier from the Python microservice.
   * @param {object} features active_bookings_5km, online_experts_5km, hour_of_day, is_weekend
   * @returns {Promise<number>} dynamic multiplier coefficient (1.0 to 2.0)
   */
  async getSurgeMultiplier(features) {
    try {
      const res = await fetch(`${PYTHON_SERVICE_URL}/api/v1/pricing/surge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(features)
      });
      if (!res.ok) return 1.0;
      const data = await res.json();
      return data.multiplier ?? 1.0;
    } catch (err) {
      console.error('AI Service: Surge pricing calculation failed, falling back to 1.0', err);
      return 1.0;
    }
  },

  /**
   * Request optimal bipartite batch matching using SciPy's Hungarian algorithm solver.
   * @param {Array} bookings List of bookings currently searching
   * @param {Array} candidates List of online candidates
   * @returns {Promise<Array>} List of optimal assignments containing booking_id and expert_id
   */
  async solveBatchMatching(bookings, candidates) {
    try {
      const res = await fetch(`${PYTHON_SERVICE_URL}/api/v1/dispatch/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookings, candidates })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.assignments ?? [];
    } catch (err) {
      console.error('AI Service: Batch matching optimization failed', err);
      return [];
    }
  },

  /**
   * Run dynamic escrow risk assessment and payment split splits.
   * @param {object} features amount, expert_rating, expert_completed_jobs, customer_dispute_ratio, is_first_time_pairing
   * @returns {Promise<object>} calculated risk score, hold days decision, dynamic split breakdown
   */
  async analyzeEscrow(features) {
    try {
      const res = await fetch(`${PYTHON_SERVICE_URL}/api/v1/escrow/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(features)
      });
      if (!res.ok) throw new Error('FastAPI response error');
      return await res.json();
    } catch (err) {
      console.error('AI Service: Escrow risk analysis failed, returning fallback defaults', err);
      return {
        risk_score: 0.1,
        decision: 'INSTANT_RELEASE',
        hold_days: 0,
        split: {
          amount: features.amount,
          platform_fee: Number((features.amount * 0.08).toFixed(2)),
          platform_fee_percent: 8.0,
          insurance_pool: 0.0,
          expert_net: Number((features.amount * 0.92).toFixed(2)),
          escrow_yield_est: 0.0001
        }
      };
    }
  },

  /**
   * Run dynamic text description diagnostics for job scope estimation.
   * @param {object} features description, service_id
   * @returns {Promise<object>} recommended hours, severity, tools checklist
   */
  async analyzeDiagnostic(features) {
    try {
      const res = await fetch(`${PYTHON_SERVICE_URL}/api/v1/diagnostic/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(features)
      });
      if (!res.ok) throw new Error('FastAPI response error');
      return await res.json();
    } catch (err) {
      console.error('AI Service: Scope diagnostic failed, returning fallback defaults', err);
      return {
        recommended_hours: 2,
        severity: 'LOW',
        tools: ['Standard utility tools'],
        expert_match_criteria: {
          min_experience_years: 1,
          requires_background_check: true,
          requires_certified_badge: false
        }
      };
    }
  }
};
