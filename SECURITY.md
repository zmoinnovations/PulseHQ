# Security Policy

## Reporting a vulnerability

If you find a security issue, please report it privately — don't open a public GitHub issue.

Email: security@zmoinnovations.com

We'll acknowledge your report within 48 hours and aim to provide a fix or mitigation plan within 7 days for critical issues.

## What counts as a security issue

- Authentication or authorization bypass
- Injection vulnerabilities (XSS, command injection, etc.)
- Exposure of API keys or credentials through the application
- SMTP relay abuse vectors

## What's NOT a security issue

- Rate limiting (not implemented yet — it's on the roadmap)
- Self-hosted instances with misconfigured `.env` files
- Vulnerabilities in dependencies (please report these upstream, but let us know too)

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
| < 1.0   | No        |
