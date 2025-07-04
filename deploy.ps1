# ITER Curriculum Viewer - Multi-Platform Deployment Script (PowerShell)
# This script helps prepare and deploy to both Netlify and Cloudflare Pages

Write-Host "🚀 ITER Curriculum Viewer - Multi-Platform Deployment" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "index.html")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Pre-deployment checks..." -ForegroundColor Yellow

# Check required files
$requiredFiles = @("netlify.toml", "wrangler.toml", "_headers", "sitemap.xml", "robots.txt", "seo-config.js")
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file found" -ForegroundColor Green
    } else {
        Write-Host "❌ $file missing" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🔧 Validating configuration files..." -ForegroundColor Yellow

# Validate sitemap.xml
$sitemapContent = Get-Content "sitemap.xml" -Raw
if ($sitemapContent -match "iter-curriculum\.netlify\.app" -and $sitemapContent -match "iter-curriculum\.pages\.dev") {
    Write-Host "✅ Sitemap includes both domains" -ForegroundColor Green
} else {
    Write-Host "❌ Sitemap missing required domains" -ForegroundColor Red
    exit 1
}

# Validate robots.txt
$robotsContent = Get-Content "robots.txt" -Raw
if ($robotsContent -match "netlify\.app" -and $robotsContent -match "pages\.dev") {
    Write-Host "✅ Robots.txt includes both domains" -ForegroundColor Green
} else {
    Write-Host "❌ Robots.txt missing required domains" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🧪 Testing SEO configuration..." -ForegroundColor Yellow

# Check if critical files have proper content
$seoContent = Get-Content "seo-config.js" -Raw
if ($seoContent -match "detectPlatform") {
    Write-Host "✅ SEO platform detection enabled" -ForegroundColor Green
} else {
    Write-Host "❌ SEO platform detection missing" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎯 Deployment targets:" -ForegroundColor Cyan
Write-Host "  Primary:   Netlify (iter-curriculum.netlify.app)" -ForegroundColor White
Write-Host "  Secondary: Cloudflare Pages (iter-curriculum.pages.dev)" -ForegroundColor White
Write-Host ""

Write-Host "📦 Preparing for deployment..." -ForegroundColor Yellow

# Create a deployment info file
$deploymentInfo = @{
    deploymentDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    version = "2.0.0"
    platforms = @{
        primary = @{
            name = "Netlify"
            url = "https://iter-curriculum.netlify.app/"
            config = "netlify.toml"
        }
        secondary = @{
            name = "Cloudflare Pages"
            url = "https://iter-curriculum.pages.dev/"
            config = "wrangler.toml"
        }
    }
    seo = @{
        canonical = "https://iter-curriculum.netlify.app/"
        sitemap = "/sitemap.xml"
        robots = "/robots.txt"
    }
}

$deploymentInfo | ConvertTo-Json -Depth 4 | Out-File "deployment-info.json" -Encoding UTF8

Write-Host "✅ Deployment info created" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Pre-deployment validation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Commit all changes to your repository" -ForegroundColor White
Write-Host "2. Push to main branch" -ForegroundColor White
Write-Host "3. Deploy to Netlify (will auto-deploy from Git)" -ForegroundColor White
Write-Host "4. Deploy to Cloudflare Pages (will auto-deploy from Git)" -ForegroundColor White
Write-Host "5. Verify both deployments are working" -ForegroundColor White
Write-Host "6. Check canonical URLs are properly set" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Platform URLs:" -ForegroundColor Cyan
Write-Host "  Netlify:    https://iter-curriculum.netlify.app/" -ForegroundColor White
Write-Host "  Cloudflare: https://iter-curriculum.pages.dev/" -ForegroundColor White
Write-Host ""
Write-Host "📊 SEO Verification:" -ForegroundColor Cyan
Write-Host "  - Check canonical tags point to Netlify" -ForegroundColor White
Write-Host "  - Verify sitemaps are accessible on both platforms" -ForegroundColor White
Write-Host "  - Test robots.txt on both domains" -ForegroundColor White
Write-Host "  - Monitor Google Search Console for both properties" -ForegroundColor White
Write-Host ""
Write-Host "✨ Happy deploying!" -ForegroundColor Magenta
