# Security Policy

## Supported Versions

SplitHub is currently in active development. The following versions are supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < main  | :x:                |

## Reporting a Vulnerability

We take security seriously at SplitHub. If you discover a security vulnerability, please follow the responsible disclosure process below.

### Responsible Disclosure

**Please do NOT disclose security vulnerabilities publicly** (GitHub issues, Discord, Twitter, etc.) until we have had a chance to address them.

Instead, please report vulnerabilities via:

- **Email**: security@splithub.io (preferred)
- **GitHub Security Advisories**: Use the [Security Advisory](https://github.com/0xgeorgemathew/splithub/security/advisories) feature for private reporting

### What to Include

When reporting a vulnerability, please include:

1. **Description**: Clear description of the vulnerability
2. **Impact**: What could an attacker do if they exploited this?
3. **Steps to Reproduce**: Detailed steps to reproduce the issue
4. **Affected Components**: Which parts of the codebase are affected
5. **Suggested Fix** (optional): If you have ideas for remediation
6. **Your Contact**: How we can reach you for follow-up questions

### Response Timeline

We aim to respond to security reports within:

- **24 hours**: Acknowledgment of receipt
- **72 hours**: Initial assessment and severity classification
- **7 days**: Progress update on remediation
- **30 days**: Target resolution for critical issues

### Severity Classification

| Severity | Description | Examples |
|----------|-------------|----------|
| Critical | Immediate risk to user funds or system integrity | Private key exposure, unauthorized fund transfers, smart contract exploits |
| High | Significant risk that could lead to fund loss | Replay attacks, signature malleability, access control bypass |
| Medium | Moderate risk to system security | Rate limiting bypass, information disclosure |
| Low | Minor security concerns | Best practice violations without immediate exploit |

## Security Considerations

### For Contributors

When contributing to SplitHub, please keep these security principles in mind:

#### Smart Contract Security

- **Never expose private keys** in code, tests, or documentation
- **Validate all inputs** to contract functions
- **Use established patterns** from OpenZeppelin and battle-tested libraries
- **Consider reentrancy** risks in any state-changing functions
- **Test edge cases** thoroughly, especially around payment flows

#### NFC/Chip Security

- The Arx Halo chip is for **authorization only**, not storage
- Never store sensitive keys or credentials on the chip
- Validate chip signatures server-side before executing payments
- Implement proper tap limits and rate limiting

#### API Security

- All payment-critical endpoints must verify authentication
- Validate webhook signatures from external services
- Implement proper CORS policies
- Rate limit sensitive operations

#### Data Protection

- Never log sensitive data (private keys, full card numbers, etc.)
- Hash sensitive identifiers where possible
- Follow least-privilege principles for database access

### Security Features

SplitHub implements several security measures:

- **Just-in-time liquidity**: Funds stay in DeFi until needed, reducing exposure
- **Tap limits**: Configurable spending limits for NFC payments
- **Multi-signature requirements**: For high-value operations
- **Real-time monitoring**: Suspicious activity detection
- **Secure enclaves**: Agent wallets use secure key management

## Security Best Practices for Users

### For Store Owners

1. **Keep your admin keys secure** - Never share private keys or seed phrases
2. **Set appropriate tap limits** - Match limits to your expected transaction volume
3. **Monitor store activity** - Regularly review analytics for unusual patterns
4. **Use strong authentication** - Enable all available security features in Privy

### For Consumers

1. **Protect your NFC chip** - While losing it doesn't mean losing funds, report lost chips immediately
2. **Review transactions** - Check your payment history regularly
3. **Set spending limits** - Configure tap limits appropriate for your usage
4. **Secure your wallet** - Use hardware wallets or secure key storage for significant balances

## Bug Bounty

We are exploring the implementation of a bug bounty program. Details will be announced when available.

## Security Updates

Security patches will be released as quickly as possible. Users should:

1. Watch the repository for security advisories
2. Update promptly when security fixes are released
3. Review the [CHANGELOG](./CHANGELOG.md) for security-related changes

## Acknowledgments

We thank the following security researchers who have responsibly disclosed vulnerabilities:

*(This list will be updated as vulnerabilities are reported and fixed)*

## Contact

For security-related questions or concerns:

- **Security Team**: security@splithub.io
- **PGP Key**: [Available upon request]

---

Last updated: April 2026
