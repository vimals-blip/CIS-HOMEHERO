import pool from './db.js';

// Repair script: every user with the EXPERT role must have a row in `experts`
// and `expert_wallet`, otherwise GET /experts/:id 404s and their dashboard
// shows "Could not load your expert profile". New signups are kept consistent
// transactionally (authController.signup); this fixes pre-existing accounts —
// e.g. after re-running `db:seed`, which only recreates the demo experts.
//
// Idempotent: rows are only inserted where missing. Safe to run any time.
async function run() {
  const [missing] = await pool.query(
    `SELECT ur.user_id, p.name
       FROM user_roles ur
       LEFT JOIN profiles p ON p.id = ur.user_id
       LEFT JOIN experts e  ON e.id = ur.user_id
      WHERE ur.role = 'EXPERT' AND e.id IS NULL`,
  );

  if (missing.length === 0) {
    console.log('All EXPERT-role users already have an experts row. Nothing to do.');
    return;
  }

  console.log(`Backfilling ${missing.length} expert(s):`);
  for (const m of missing) console.log(`  - ${m.user_id} (${m.name ?? 'unknown'})`);

  // Defaults mirror AuthModel.createExpertProfile: unverified, OFFLINE, SUBMITTED.
  await pool.query(
    `INSERT INTO experts (id, gender, bio, experience_years, is_verified, is_trained, status, service_pincodes, onboarding_status, created_at)
     SELECT ur.user_id, 'FEMALE', NULL, 0, 0, 0, 'OFFLINE', JSON_ARRAY(), 'SUBMITTED', NOW()
       FROM user_roles ur
       LEFT JOIN experts e ON e.id = ur.user_id
      WHERE ur.role = 'EXPERT' AND e.id IS NULL`,
  );
  await pool.query(
    `INSERT INTO expert_wallet (expert_id, available_balance, pending_balance, total_earned)
     SELECT ur.user_id, 0, 0, 0
       FROM user_roles ur
       LEFT JOIN expert_wallet w ON w.expert_id = ur.user_id
      WHERE ur.role = 'EXPERT' AND w.expert_id IS NULL`,
  );

  const [[{ remaining }]] = await pool.query(
    `SELECT COUNT(*) AS remaining
       FROM user_roles ur LEFT JOIN experts e ON e.id = ur.user_id
      WHERE ur.role = 'EXPERT' AND e.id IS NULL`,
  );
  console.log(`Done. Orphaned experts remaining: ${remaining}.`);
  console.log('Note: backfilled experts are unverified — approve them in the admin KYC queue.');
}

run()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((e) => { console.error('Backfill failed:', e); process.exit(1); });
