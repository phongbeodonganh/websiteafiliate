# API Coverage — Phase 1: Security Remediation

No external API integration: this phase only removes secret fallbacks, deletes a destructive route, hardens existing endpoints (rate limiting, input validation, canonical JWT guard), and rebuilds one internal page — it consumes no new external service, SDK capability, or third-party surface. The existing Gemini SDK call sites keep their behavior; plan 06 changes only where the key is read from (env → settings precedence), not what the API is asked to do.
