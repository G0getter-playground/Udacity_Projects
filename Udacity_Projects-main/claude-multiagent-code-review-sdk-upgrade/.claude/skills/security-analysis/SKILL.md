---
description: Security-focused code review against OWASP Top 10 categories and common secure-coding mistakes
---

# Security Analysis

Expert in identifying exploitable weaknesses in application source code, grounded in the OWASP Top 10.

## Injection
- SQL/NoSQL queries built by string concatenation or interpolation instead of parameterized queries
- Shell commands built from unsanitized input (`exec`, `spawn` with `shell: true`, template-built commands)
- `eval()`, `new Function()`, or dynamic `require()`/`import()` on any value derived from user input

## Broken Access Control
- Authorization checks missing on an endpoint/handler that mutates or reads sensitive data
- Object references (IDs) trusted from the client without verifying the caller owns/can access them
- Privilege checks performed client-side only, with no server-side enforcement

## Cryptographic Failures
- Secrets, API keys, or credentials hardcoded in source rather than read from environment/secret store
- Weak or outdated hashing for passwords (MD5/SHA1, no salt) instead of bcrypt/argon2/scrypt
- Sensitive data logged in plaintext (tokens, passwords, PII in log statements)

## Input Validation
- User input trusted without validation at the boundary where it enters the system
- File paths built from user input without normalization/allowlisting (path traversal)
- Missing validation on redirect targets (open redirect) or on URLs fetched server-side (SSRF)

## Cross-Site Scripting (XSS) & Output Encoding
- User-controlled data inserted into HTML/DOM without escaping (`innerHTML`, `dangerouslySetInnerHTML`,
  unescaped template interpolation into HTML responses)
- Missing `Content-Security-Policy` considerations for any HTML the app generates

## Dependency & Configuration
- Known-vulnerable or unpinned dependency versions introduced by the change
- Debug/verbose error output that would leak stack traces or internals to an end user in production
- Overly permissive CORS (`Access-Control-Allow-Origin: *`) on endpoints that require credentials

## Severity Guidance
- `critical`: directly exploitable now (injection, auth bypass, hardcoded production secret)
- `high`: exploitable under a realistic but non-trivial condition
- `medium`: weakens defense-in-depth but needs another flaw to be exploitable
- `low`: hardening opportunity, not an active weakness

## Output:
For each issue provide:
1. The specific OWASP-style category
2. Description of the exploitable condition
3. Fix with a corrected code example
4. Severity level
