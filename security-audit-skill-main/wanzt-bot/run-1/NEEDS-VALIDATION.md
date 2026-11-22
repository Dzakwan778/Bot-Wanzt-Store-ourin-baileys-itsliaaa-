# Needs Validation Leads

This document records unresolved audit leads whose decisive facts lie outside repository source and bounded local execution. No severity rating is assigned to these items.

## 1. Unverified Production VPS HTTPS/TLS Configuration and External Reachability of Backend Port 5000

- **Fingerprint**: `deploy.vps-tls-and-port5000-exposure`
- **Affected Boundary**: Production VPS Nginx reverse proxy, TLS transport, and host/cloud firewall around backend port 5000
- **Description**: deploy-vps.sh configures Nginx exclusively on HTTP port 80 (line 107), prints certbot --nginx only as an optional manual command (line 191), and enables UFW port 5000/tcp directly (line 160). Whether TLS certificates are active on the production VPS and whether an external cloud firewall blocks port 5000 cannot be determined from repository source alone.
- **Claimed Root Cause**: deploy-vps.sh omits automated TLS enforcement and opens firewall port 5000/tcp directly, creating plaintext transport and reverse-proxy bypass risks unless manually remediated on the live host.

### Repository Source Trace

1. **[entrypoint]** `deploy-vps.sh:107` (`Nginx site configuration`): Configures listen 80 only without SSL/TLS redirect or HSTS.
2. **[sink]** `deploy-vps.sh:160` (`UFW firewall configuration`): Executes ufw allow 5000/tcp exposing Node.js Express directly.

### Verified Source Evidence

- `deploy-vps.sh:107`: Nginx server block listens on port 80 only.
- `deploy-vps.sh:160`: ufw allow 5000/tcp opens backend port externally.
- `deploy-vps.sh:191`: Certbot SSL issuance is left as a manual operator instruction.

### Exact Unresolved Blockers

- Live VPS Nginx config (/etc/nginx/sites-enabled/*), Certbot certificate state, UFW rules, and cloud security group rules are outside the local repository and isolated sandbox.

### Verification Plan

- **Safe Owner-Observed Deployment Check**: Owner should inspect the live VPS by running "ss -tulnp | grep 5000", "ufw status verbose", and inspecting /etc/nginx/sites-enabled/bot-whatsapp for TLS server blocks and HTTPS redirects, plus verifying cloud firewall rules block external TCP/5000.
