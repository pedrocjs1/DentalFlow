#!/bin/bash
# ═══════════════════════════════════════════════════
# Dentiqa — Production Health Check Script
# ═══════════════════════════════════════════════════

API="https://api.dentiqa.app"
DASHBOARD="https://dashboard.dentiqa.app"
LANDING="https://dentiqa.app"
ADMIN="https://admin.dentiqa.app"

PASS=0
FAIL=0

check() {
  local label="$1"
  local result="$2"
  if [ "$result" = "true" ]; then
    echo "  ✅ $label"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $label"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "🔍 Dentiqa Production Health Checks"
echo "════════════════════════════════════"

# ── 1. Health checks (HTTP 200) ──────────────────
echo ""
echo "1. Domain Reachability"

for url in "$API/health" "$DASHBOARD" "$LANDING" "$ADMIN"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url")
  check "$url → HTTP $status" "$([ "$status" = "200" ] && echo true || echo false)"
done

# ── 2. API Health details ────────────────────────
echo ""
echo "2. API Health Details"

health=$(curl -s --max-time 10 "$API/health" 2>/dev/null)
if [ -n "$health" ]; then
  db=$(echo "$health" | grep -o '"db":"connected"' | head -1)
  redis=$(echo "$health" | grep -o '"redis":"connected"' | head -1)
  check "Database connected" "$([ -n "$db" ] && echo true || echo false)"
  check "Redis connected" "$([ -n "$redis" ] && echo true || echo false)"
else
  check "API /health response" "false"
fi

# ── 3. SSL Certificates ─────────────────────────
echo ""
echo "3. SSL Certificates"

for domain in "api.dentiqa.app" "dashboard.dentiqa.app" "dentiqa.app" "admin.dentiqa.app"; do
  ssl=$(curl -s -o /dev/null -w "%{ssl_verify_result}" --max-time 10 "https://$domain")
  check "$domain SSL valid" "$([ "$ssl" = "0" ] && echo true || echo false)"
done

# ── 4. CORS ──────────────────────────────────────
echo ""
echo "4. CORS Policy"

# Allowed origin
cors_ok=$(curl -s -o /dev/null -w "%{http_code}" -H "Origin: https://dashboard.dentiqa.app" --max-time 10 "$API/health")
cors_header=$(curl -s -D - -o /dev/null -H "Origin: https://dashboard.dentiqa.app" --max-time 10 "$API/health" | grep -i "access-control-allow-origin")
check "Allowed origin (dashboard) → has CORS header" "$([ -n "$cors_header" ] && echo true || echo false)"

# Blocked origin
cors_bad=$(curl -s -D - -o /dev/null -H "Origin: https://evil.com" --max-time 10 "$API/health" | grep -i "access-control-allow-origin")
check "Blocked origin (evil.com) → no CORS header" "$([ -z "$cors_bad" ] && echo true || echo false)"

# ── 5. Rate Limiting ────────────────────────────
echo ""
echo "5. Rate Limiting"

has_ratelimit=$(curl -s -D - -o /dev/null --max-time 10 "$API/health" | grep -i "x-ratelimit")
check "Rate limit headers present" "$([ -n "$has_ratelimit" ] && echo true || echo false)"

# ── Summary ──────────────────────────────────────
echo ""
echo "════════════════════════════════════"
echo "Results: ✅ $PASS passed, ❌ $FAIL failed"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
