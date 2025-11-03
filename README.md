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
