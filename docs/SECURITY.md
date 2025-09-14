# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Mem0-Redis Hybrid seriously. If you have discovered a security vulnerability in our project, we appreciate your help in disclosing it to us in a responsible manner.

### Reporting Process

1. **DO NOT** create a public GitHub issue for the vulnerability.
2. Email your findings to security@mem0hybrid.dev (or use GitHub's private vulnerability reporting if available).
3. Provide as much information as possible about the vulnerability:
   - Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
   - Full paths of source file(s) related to the manifestation of the issue
   - The location of the affected source code (tag/branch/commit or direct URL)
   - Any special configuration required to reproduce the issue
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue, including how an attacker might exploit the issue

### What to Expect

- We will acknowledge receipt of your vulnerability report within 48 hours.
- We will send a more detailed response within 96 hours indicating the next steps in handling your report.
- We will keep you informed of the progress towards a fix and full announcement.
- We will credit you in the security advisory if you desire.

### Security Update Process

1. The security team will investigate the vulnerability and determine its impact.
2. A fix will be developed privately.
3. We will prepare a new release containing the fix.
4. We will publish a security advisory detailing the vulnerability and the fix.

## Security Best Practices

When using Mem0-Redis Hybrid:

### Environment Variables

- Never commit `.env` files containing API keys
- Use environment-specific configurations
- Rotate API keys regularly
- Use secrets management systems in production

### Redis Security

- Always use Redis AUTH when exposed to network
- Enable TLS for Redis connections in production
- Restrict Redis access to trusted networks only
- Keep Redis version updated

### API Key Management

- Store Mem0 API keys securely
- Use different API keys for different environments
- Monitor API key usage for anomalies
- Implement rate limiting on your MCP server

### Data Protection

- Be aware that cached data in Redis may contain sensitive information
- Implement proper access controls
- Consider encrypting sensitive data before caching
- Regularly audit cached data

## Dependencies

We use automated tools to monitor and update dependencies:

- Dependabot for automated security updates
- npm audit in CI pipeline
- Regular manual review of critical dependencies

## Contact

Report security vulnerabilities via:

- GitHub Security Advisories: [Enable private vulnerability reporting](https://github.com/n3wth/r3call/security)

## Acknowledgments

We would like to thank the following individuals for responsibly disclosing vulnerabilities:

- [Your name could be here!]
