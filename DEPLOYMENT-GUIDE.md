# Multi-Platform Deployment Guide
## ITER Curriculum Viewer - Netlify & Cloudflare Pages

This guide covers deploying the ITER Curriculum Viewer on both Netlify and Cloudflare Pages with proper SEO configuration.

## 🚀 Platform Configuration

### Primary Platform: Netlify
- **URL**: `https://iter-curriculum.netlify.app/`
- **Purpose**: Primary domain for SEO and canonical URLs
- **Configuration**: `netlify.toml` + `_headers`

### Secondary Platform: Cloudflare Pages
- **URL**: `https://iter-curriculum.pages.dev/`
- **Purpose**: Backup deployment and global edge distribution
- **Configuration**: `wrangler.toml`

## 📋 Deployment Checklist

### 1. Repository Setup
- [ ] Ensure all files are committed to main branch
- [ ] Verify `netlify.toml` is configured
- [ ] Verify `wrangler.toml` is configured  
- [ ] Check `_headers` file for Netlify
- [ ] Validate `sitemap.xml` includes both domains
- [ ] Confirm `robots.txt` references both domains

### 2. Netlify Deployment
```bash

Build command: (leave empty)
Publish directory: .
```

**Environment Variables** (if needed):
```
NODE_VERSION=18
ENVIRONMENT=production
```

### 3. Cloudflare Pages Deployment
```bash

Build command: (leave empty)
Build output directory: .
Root directory: /
```

**Environment Variables**:
```
NODE_VERSION=18
ENVIRONMENT=production
```

## 🔧 SEO Configuration

### Canonical URL Strategy
- **Primary**: All canonical URLs point to Netlify domain
- **Secondary**: Cloudflare serves content but redirects SEO to Netlify
- **Benefits**: Consolidated SEO authority, no duplicate content penalties

### Platform Detection
The application automatically detects the platform and adjusts:
- Canonical URLs always point to primary domain
- Meta tags updated dynamically
- Structured data uses consistent URLs

### URL Structure
```
Primary (Netlify):
https://iter-curriculum.netlify.app/
https://iter-curriculum.netlify.app/?year=2024&stream=cse&semester=1

Secondary (Cloudflare):
https://iter-curriculum.pages.dev/
https://iter-curriculum.pages.dev/?year=2024&stream=cse&semester=1
```

## 📊 Performance Optimization

### Caching Strategy
- **Static Assets**: 1 year cache (immutable)
- **HTML Files**: 5 minutes with revalidation
- **Service Worker**: No cache (always fresh)
- **SEO Files**: 24 hours cache

### Headers Applied
- Security headers on all files
- SEO-friendly robots directives
- Preload hints for critical resources
- Proper content-type headers

## 🔍 SEO Features

### Multi-Platform Benefits
1. **Redundancy**: If one platform is down, the other serves content
2. **Global CDN**: Faster loading worldwide
3. **SEO Safety**: Canonical URLs prevent duplicate content issues
4. **Performance**: Edge distribution improves Core Web Vitals

### Sitemap Strategy
- Single sitemap includes both domains
- Primary domain gets higher priority scores
- Image sitemap included for curriculum images
- Regular updates with new content

### Robots.txt Configuration
- Allows both platforms
- Provides sitemaps for both domains
- Optimized crawl delays for different bots

## 🛠️ Platform-Specific Features

### Netlify Features
- Custom headers via `_headers` file
- Form handling (if needed in future)
- Edge functions support
- Advanced redirect rules

### Cloudflare Features
- Global edge network
- DDoS protection
- Analytics integration
- Workers support (if needed)

## 📈 Monitoring & Analytics

### Recommended Setup
1. **Google Search Console**: Add both domains
2. **Google Analytics**: Track both with same property
3. **Core Web Vitals**: Monitor performance on both
4. **Uptime Monitoring**: Check both platforms

### SEO Monitoring
```javascript
gtag('config', 'GA_MEASUREMENT_ID', {
  page_title: document.title,
  page_location: window.location.href,
  custom_map: {
    'platform': seoManager.currentPlatform
  }
});
```

## 🔧 Maintenance Tasks

### Weekly
- [ ] Check uptime on both platforms
- [ ] Monitor search console for errors
- [ ] Verify canonical URLs are working

### Monthly
- [ ] Update sitemap if new content added
- [ ] Review performance metrics
- [ ] Check for any duplicate content issues

### Quarterly
- [ ] Full SEO audit across both platforms
- [ ] Update platform configurations if needed
- [ ] Review and optimize cache settings

## 🚨 Troubleshooting

### Common Issues
1. **Mixed Content**: Ensure all assets use HTTPS
2. **Duplicate Content**: Verify canonical URLs are set correctly
3. **Cache Issues**: Clear both platform caches if needed
4. **SEO Conflicts**: Check that primary domain gets proper signals

### Debug Commands
```bash
curl -I https://iter-curriculum.netlify.app/
curl -I https://iter-curriculum.pages.dev/

curl https://iter-curriculum.netlify.app/sitemap.xml
curl https://iter-curriculum.pages.dev/sitemap.xml
```

## 📞 Support Contacts

- **Netlify Support**: [Netlify Docs](https://docs.netlify.com/)
- **Cloudflare Support**: [Cloudflare Docs](https://developers.cloudflare.com/pages/)
- **SEO Questions**: Check Google Search Console Help

---

**Last Updated**: January 4, 2025  
**Version**: 2.0.0  
**Platforms**: Netlify + Cloudflare Pages
