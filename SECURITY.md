# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| v0.1.x (alpha) | ⚠️ Best-effort |
| v1.0.x (future) | ✅ Full support |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub Issues.**

Instead, email: **zhoujiankai1014@gmail.com**

We will respond within 48 hours with:
- Confirmation of receipt
- An initial assessment
- A timeline for resolution

## Security Considerations

### API Keys

- Never commit API keys to the repository
- Use `.env` files (gitignored) for local development
- API keys stored in Run configs should be encrypted in production

### Authentication

- Authentication is enforced on all API routes via NextAuth.js
- v1.0.0 will include full NextAuth.js integration
- For production deployments, place AgentBench behind a reverse proxy with authentication

### Database

- PostgreSQL is used as the primary database
- Use strong passwords and TLS for production connections
- Regularly back up your database

### Dependencies

- Dependencies are managed with pnpm and locked via `pnpm-lock.yaml`
- Dependabot/Renovate integration recommended for automated updates
- Run `pnpm audit` periodically to check for known vulnerabilities

## Best Practices

1. **Run behind a reverse proxy** (Nginx/Caddy) with HTTPS in production
2. **Set `WEBHOOK_SECRET`** to verify CI webhook requests
3. **Use API keys with limited scopes** for programmatic access
4. **Rotate secrets regularly**
5. **Keep dependencies updated**
