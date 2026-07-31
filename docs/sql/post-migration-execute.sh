#!/usr/bin/env bash
# Post-migration execution loop for DriverNord
# Run after migrations 008-015 are applied to production Supabase
#
# Prerequisites:
#   - Migrations applied (apply-migrations-008-015.sql)
#   - Dev server running on port 3000/3001/3002
#   - RECRUITER_API_KEY = recruiter-local-dev
#   - MATCH_API_KEY = test-e2e-key-local
#
# Usage:
#   bash docs/sql/post-migration-execute.sh [PORT]
#   Example: bash docs/sql/post-migration-execute.sh 3002

PORT=${1:-3002}
BASE="http://localhost:$PORT"
RECRUITER_KEY="recruiter-local-dev"
MATCH_KEY="test-e2e-key-local"

echo "=============================================="
echo "DRIVERNORD POST-MIGRATION EXECUTION LOOP"
echo "Target: $BASE"
echo "Date: $(date)"
echo "=============================================="
echo ""

# ── Step 1: Operational Intelligence ───────────────────────────────────────────

echo "STEP 1: Operational Intelligence (post-migration)"
echo "─────────────────────────────────────────────────"
OI=$(curl -s -H "x-recruiter-key: $RECRUITER_KEY" "$BASE/api/admin/operational-intelligence")
echo "$OI" | node -e "
const c=[]; process.stdin.on('data',d=>c.push(d)); process.stdin.on('end',()=>{
  const d=JSON.parse(c.join(''));
  console.log('company_needs:', JSON.stringify(d.company_needs, null, 2));
  console.log('drafts:', JSON.stringify(d.drafts, null, 2));
  console.log('urgent_actions:', (d.urgent_actions||[]).map(a=>a.type).join(', '));
  console.log('sms_safe:', d.sms_safe);
  console.log('matching_blocked:', d.matching_blocked);
});"
echo ""

# ── Step 2: Import scan records ────────────────────────────────────────────────

echo "STEP 2: Import 17 national scan records"
echo "─────────────────────────────────────────────────"
IMPORT=$(curl -s -X POST \
  -H "x-recruiter-key: $RECRUITER_KEY" \
  -H "Content-Type: application/json" \
  "$BASE/api/admin/drafts/import")
echo "Result: $IMPORT"
echo ""

# ── Step 3: List ready_for_review drafts ───────────────────────────────────────

echo "STEP 3: List ready_for_review drafts"
echo "─────────────────────────────────────────────────"
DRAFTS=$(curl -s \
  -H "x-recruiter-key: $RECRUITER_KEY" \
  "$BASE/api/admin/drafts?status=ready_for_review&limit=20")
echo "$DRAFTS" | node -e "
const c=[]; process.stdin.on('data',d=>c.push(d)); process.stdin.on('end',()=>{
  const r=JSON.parse(c.join(''));
  if (!Array.isArray(r)) { console.log('Error:', JSON.stringify(r)); return; }
  console.log('Total ready_for_review:', r.length);
  r.forEach(d=>{
    console.log(' -', d.scan_record_id, '|', d.id, '|', d.company_name||'(no name field)');
  });
});"

# Extract DN-003 UUID
DN3_UUID=$(echo "$DRAFTS" | node -e "
const c=[]; process.stdin.on('data',d=>c.push(d)); process.stdin.on('end',()=>{
  const r=JSON.parse(c.join(''));
  if (!Array.isArray(r)) { console.log(''); return; }
  const dn3 = r.find(d => d.scan_record_id === 'DN-003');
  console.log(dn3 ? dn3.id : '');
});")

if [ -z "$DN3_UUID" ]; then
  echo "ERROR: Could not find DN-003 draft UUID. Import may have failed."
  echo "Attempting fallback: list all drafts"
  curl -s -H "x-recruiter-key: $RECRUITER_KEY" "$BASE/api/admin/drafts?limit=30" | \
    node -e "const c=[]; process.stdin.on('data',d=>c.push(d)); process.stdin.on('end',()=>{
      const r=JSON.parse(c.join(''));
      if(Array.isArray(r)) r.forEach(d=>console.log(' -',d.scan_record_id,'|',d.id,'|',d.draft_status));
    });"
else
  echo "DN-003 (Edvardssons) UUID: $DN3_UUID"
fi
echo ""

# ── Step 4: Promote Edvardssons ────────────────────────────────────────────────

if [ -n "$DN3_UUID" ]; then
  echo "STEP 4: Promote Edvardssons (DN-003)"
  echo "─────────────────────────────────────────────────"
  PROMOTE=$(curl -s -X POST \
    -H "x-recruiter-key: $RECRUITER_KEY" \
    -H "Content-Type: application/json" \
    "$BASE/api/admin/drafts/$DN3_UUID/promote")
  echo "Result: $PROMOTE"

  EDV_NEED_ID=$(echo "$PROMOTE" | node -e "
  const c=[]; process.stdin.on('data',d=>c.push(d)); process.stdin.on('end',()=>{
    const r=JSON.parse(c.join(''));
    console.log(r.need_id || '');
  });")
  echo "Edvardssons need_id: $EDV_NEED_ID"
else
  echo "STEP 4: SKIPPED — Edvardssons draft UUID not found"
  EDV_NEED_ID=""
fi
echo ""

# ── Step 5: JPC Rematch ────────────────────────────────────────────────────────

echo "STEP 5: JPC Rematch (post-migration, expect 0 simulation drivers)"
echo "─────────────────────────────────────────────────"
JPC_NEED_ID="33bc791f-baf6-4d72-851a-beab50b62337"
JPC_MATCH=$(curl -s -X POST \
  -H "x-api-key: $MATCH_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"need_id\": \"$JPC_NEED_ID\"}" \
  "$BASE/api/recruiter/match")
echo "$JPC_MATCH" | node -e "
const c=[]; process.stdin.on('data',d=>c.push(d)); process.stdin.on('end',()=>{
  const r=JSON.parse(c.join(''));
  if (r.error) { console.log('ERROR:', r.error); return; }
  console.log('totalCandidates:', r.totalCandidates);
  console.log('totalShortlisted:', r.totalShortlisted);
  console.log('shortlisted:');
  (r.shortlisted||[]).forEach(e=>
    console.log(' -', e.driver_id?.slice(0,8)+'...', 'score:', e.score, '|',
      e.first_name||'(unknown)', '|', e.license, e.domain)
  );
});"
echo ""

# ── Step 6: Edvardssons Match ──────────────────────────────────────────────────

if [ -n "$EDV_NEED_ID" ]; then
  echo "STEP 6: Edvardssons Match"
  echo "─────────────────────────────────────────────────"
  EDV_MATCH=$(curl -s -X POST \
    -H "x-api-key: $MATCH_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"need_id\": \"$EDV_NEED_ID\"}" \
    "$BASE/api/recruiter/match")
  echo "$EDV_MATCH" | node -e "
  const c=[]; process.stdin.on('data',d=>c.push(d)); process.stdin.on('end',()=>{
    const r=JSON.parse(c.join(''));
    if (r.error) { console.log('ERROR:', r.error); return; }
    console.log('totalCandidates:', r.totalCandidates);
    console.log('totalShortlisted:', r.totalShortlisted);
    console.log('shortlisted:');
    (r.shortlisted||[]).forEach(e=>
      console.log(' -', e.driver_id?.slice(0,8)+'...', 'score:', e.score, '|',
        e.first_name||'(unknown)', '|', e.license, e.domain)
    );
  });"
else
  echo "STEP 6: SKIPPED — Edvardssons need_id not available"
fi
echo ""

# ── Step 7: Final Operational Intelligence ─────────────────────────────────────

echo "STEP 7: Final Operational Intelligence (post-all-operations)"
echo "─────────────────────────────────────────────────"
OI_FINAL=$(curl -s -H "x-recruiter-key: $RECRUITER_KEY" "$BASE/api/admin/operational-intelligence")
echo "$OI_FINAL" | node -e "
const c=[]; process.stdin.on('data',d=>c.push(d)); process.stdin.on('end',()=>{
  const d=JSON.parse(c.join(''));
  console.log('company_needs:', JSON.stringify(d.company_needs, null, 2));
  console.log('drafts:', JSON.stringify(d.drafts, null, 2));
  console.log('ingested_drivers:', JSON.stringify(d.ingested_drivers, null, 2));
  console.log('sms_safe:', d.sms_safe);
  console.log('matching_blocked:', d.matching_blocked);
  console.log('urgent_actions:', (d.urgent_actions||[]).map(a=>a.type).join(', ')||'none');
});"

echo ""
echo "=============================================="
echo "EXECUTION COMPLETE"
echo "=============================================="
