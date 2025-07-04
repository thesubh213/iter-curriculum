#!/bin/bash


echo "🚀 ITER Curriculum Viewer - Multi-Platform Deployment"
echo "=================================================="

if [ ! -f "index.html" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📋 Pre-deployment checks..."

required_files=("netlify.toml" "wrangler.toml" "_headers" "sitemap.xml" "robots.txt" "seo-config.js")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file found"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

echo ""
echo "🔧 Validating configuration files..."

if grep -q "iter-curriculum.netlify.app" sitemap.xml && grep -q "iter-curriculum.pages.dev" sitemap.xml; then
    echo "✅ Sitemap includes both domains"
else
    echo "❌ Sitemap missing required domains"
    exit 1
fi

if grep -q "netlify.app" robots.txt && grep -q "pages.dev" robots.txt; then
    echo "✅ Robots.txt includes both domains"
else
    echo "❌ Robots.txt missing required domains"
    exit 1
fi

echo ""
echo "🧪 Testing SEO configuration..."

if grep -q "detectPlatform" seo-config.js; then
    echo "✅ SEO platform detection enabled"
else
    echo "❌ SEO platform detection missing"
    exit 1
fi

echo ""
echo "🎯 Deployment targets:"
echo "  Primary:   Netlify (iter-curriculum.netlify.app)"
echo "  Secondary: Cloudflare Pages (iter-curriculum.pages.dev)"
echo ""

echo "📦 Preparing for deployment..."

cat > deployment-info.json << EOL
{
  "deploymentDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "2.0.0",
  "platforms": {
    "primary": {
      "name": "Netlify",
      "url": "https://iter-curriculum.netlify.app/",
      "config": "netlify.toml"
    },
    "secondary": {
      "name": "Cloudflare Pages", 
      "url": "https://iter-curriculum.pages.dev/",
      "config": "wrangler.toml"
    }
  },
  "seo": {
    "canonical": "https://iter-curriculum.netlify.app/",
    "sitemap": "/sitemap.xml",
    "robots": "/robots.txt"
  }
}
EOL

echo "✅ Deployment info created"

echo ""
echo "🎉 Pre-deployment validation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Commit all changes to your repository"
echo "2. Push to main branch"
echo "3. Deploy to Netlify (will auto-deploy from Git)"
echo "4. Deploy to Cloudflare Pages (will auto-deploy from Git)"
echo "5. Verify both deployments are working"
echo "6. Check canonical URLs are properly set"
echo ""
echo "🔗 Platform URLs:"
echo "  Netlify:    https://iter-curriculum.netlify.app/"
echo "  Cloudflare: https://iter-curriculum.pages.dev/"
echo ""
echo "📊 SEO Verification:"
echo "  - Check canonical tags point to Netlify"
echo "  - Verify sitemaps are accessible on both platforms"
echo "  - Test robots.txt on both domains"
echo "  - Monitor Google Search Console for both properties"
echo ""
echo "✨ Happy deploying!"
