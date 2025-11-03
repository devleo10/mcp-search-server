# MCP Search Server (TypeScript + Bun)

Minimal MCP-style search server and CLI written in TypeScript and targeted at Bun runtime. Use the `src/` implementations.

Quick start (PowerShell):

```powershell
# Install Bun (example): scoop install bun
bun install
bun run start

# CLI example
bun run cli -- samples/sample.txt keyword -i

# Run tests
bun test
```
# MCP Search Server

Minimal Bun + TypeScript example search server and CLI.

Run locally (PowerShell):

```powershell
scoop install bun   # if you don't have Bun
bun install
bun run start
```

Sample POST (PowerShell):

```powershell
 $body = @{ path = "samples/sample.txt"; keyword = "keyword" } | ConvertTo-Json
 Invoke-RestMethod -Uri http://localhost:3000/search -Method POST -Body $body -ContentType 'application/json'
```

CLI example:

```powershell
bun run bin/search-cli.ts -- samples/sample.txt keyword -i -c 1
```
