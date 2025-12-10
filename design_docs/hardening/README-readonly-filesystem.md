# Read-Only Filesystem Requirements for RPG Wiki

## Security Request

To enable `readOnlyRootFilesystem: true` in the Kubernetes deployment (required for defense-in-depth security and CVE-2025-66478 mitigation), the following changes are needed in the application:

### Required Changes

1. **Pre-generate Prisma Client during Docker build**
   
   Add to your `Dockerfile` after `npm install`:
   ```dockerfile
   RUN npx prisma generate
   ```
   
   This ensures Prisma Client code is baked into the image instead of generated at runtime.

2. **Verify writable paths are externally mounted**
   
   Ensure the application only writes to these paths (already mounted as emptyDir volumes):
   - `/tmp` - temporary files
   - `/app/backup-data` - Git backup operations
   - `/app/.ssh` - SSH keys (read-only mount)

3. **Test that the application starts without writing to:**
   - `/app/node_modules`
   - `/app/src/generated`
   - `/app/.next` (if not already handled)
   - Any other locations in the root filesystem

### Current State

- `readOnlyRootFilesystem: false` - **Temporary workaround** to allow Prisma runtime generation
- All other security hardening is active (non-root user, dropped capabilities, NetworkPolicy, rate limiting)

### Expected Outcome

After implementing the above changes, we can set `readOnlyRootFilesystem: true`, which:
- Prevents attackers from writing malicious files if the container is compromised
- Reduces impact radius of CVE-2025-66478 and future vulnerabilities
- Meets Kubernetes Pod Security Standards "restricted" profile requirements

### Testing

Build the updated image and verify:
```bash
docker run --rm --read-only \
  -v /tmp \
  -v /app/backup-data \
  registry.klucsik.hu/rpg-wiki:latest
```

Container should start successfully without "EROFS: read-only file system" errors.
