# Fish Store - Windows Startup Script

Write-Host "🚀 Starting Fish Store Admin System..." -ForegroundColor Green
Write-Host ""

# Check if pnpm is installed
try {
    $pnpmVersion = pnpm --version
    Write-Host "✅ pnpm version: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ pnpm not found. Installing..." -ForegroundColor Red
    npm install -g pnpm
}

Write-Host ""
Write-Host "📍 Server will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "🔐 Admin login: http://localhost:5000/admin/login" -ForegroundColor Cyan
Write-Host ""
Write-Host "Admin login: use the credentials configured for your environment." -ForegroundColor Yellow
Write-Host "  (Do NOT use a shared/default password. Set a strong admin password" -ForegroundColor Gray
Write-Host "   via your secrets manager / DB - never commit real credentials.)" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Start the development server
pnpm run dev
