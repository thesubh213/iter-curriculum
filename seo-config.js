

const SEO_CONFIG = {
    site: {
        name: "ITER Curriculum Viewer",
        tagline: "Engineering Syllabus & Academic Resources",
        description: "Access comprehensive ITER curriculum, engineering syllabus, semester-wise course materials for CSE, ECE, EEE, ME, CE streams. Official academic resource portal for SOA University students.",
        urls: {
            primary: "https://iter-curriculum.netlify.app/",
            secondary: "https://iter-curriculum.pages.dev/",
            canonical: "https://iter-curriculum.netlify.app/" 
        },
        author: "ITER Curriculum Team",
        version: "2.0.0"
    },

    keywords: {
        primary: [
            "ITER curriculum viewer",
            "ITER syllabus",
            "SOA university curriculum",
            "engineering curriculum ITER",
            "ITER academic resources"
        ],
        
        streams: [
            "CSE curriculum ITER",
            "ECE curriculum ITER", 
            "EEE curriculum ITER",
            "mechanical engineering ITER",
            "civil engineering ITER",
            "computer science ITER",
            "electronics engineering ITER",
            "electrical engineering ITER"
        ],
        
        academic: [
            "semester wise curriculum",
            "engineering course materials",
            "SOA university syllabus",
            "ITER course structure",
            "engineering subjects ITER",
            "ITER student portal",
            "academic curriculum viewer",
            "technical education ITER"
        ],
        
        longTail: [
            "ITER engineering curriculum 2024-2025",
            "SOA university semester wise syllabus",
            "ITER CSE subjects list",
            "engineering course structure ITER",
            "ITER academic calendar curriculum",
            "SOA university course materials download",
            "ITER engineering streams curriculum"
        ]
    },

    pages: {
        home: {
            title: "ITER Curriculum Viewer - Engineering Syllabus & Academic Resources | SOA University",
            description: "Access comprehensive ITER curriculum, engineering syllabus, semester-wise course materials for all engineering streams at SOA University.",
            keywords: "ITER curriculum viewer, engineering syllabus, SOA university, academic resources"
        },
        
        viewer: {
            title: "View Curriculum - {stream} {semester} | ITER Curriculum Viewer",
            description: "View detailed curriculum for {stream} engineering {semester} at ITER, SOA University. Access course materials and syllabus.",
            keywords: "{stream} curriculum ITER, {semester} syllabus, engineering course materials"
        }
    },

    structuredData: {
        organization: {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "ITER - Institute of Technical Education and Research",
            "url": "https://www.soa.ac.in/iter",
            "logo": "https://iter-curriculum.netlify.app/images/iter-logo.png",
            "sameAs": [
                "https://www.facebook.com/ITER.SOA",
                "https://twitter.com/ITER_SOA",
                "https://www.linkedin.com/school/iter-soa"
            ]
        },

        website: {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "ITER Curriculum Viewer",
            "url": "https://iter-curriculum.netlify.app/",
            "alternateName": "ITER Curriculum",
            "sameAs": [
                "https://iter-curriculum.pages.dev/"
            ],
            "potentialAction": {
                "@type": "SearchAction",
                "target": "https://iter-curriculum.netlify.app/?search={search_term_string}",
                "query-input": "required name=search_term_string"
            }
        },

        breadcrumbList: {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": []
        }
    },

    social: {
        openGraph: {
            type: "website",
            siteName: "ITER Curriculum Viewer",
            locale: "en_US",
            image: {
                url: "https://iter-curriculum.netlify.app/images/og-image.png",
                width: 1200,
                height: 630,
                alt: "ITER Curriculum Viewer - Engineering Academic Resources"
            }
        },
        
        twitter: {
            card: "summary_large_image",
            site: "@ITER_SOA",
            creator: "@ITER_SOA"
        }
    },

    technical: {
        lang: "en",
        charset: "UTF-8",
        viewport: "width=device-width, initial-scale=1.0",
        themeColor: "#667eea",
        robots: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
        googleSiteVerification: "", 
        bingVerification: "", 
    }
};


class SEOManager {
    constructor() {
        this.config = SEO_CONFIG;
        this.currentPlatform = this.detectPlatform();
        this.baseUrl = this.getCurrentBaseUrl();
    }

    detectPlatform() {
        const hostname = window.location.hostname;
        if (hostname.includes('netlify.app')) {
            return 'netlify';
        } else if (hostname.includes('pages.dev')) {
            return 'cloudflare';
        } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'local';
        }
        return 'unknown';
    }

   
    getCurrentBaseUrl() {
        if (this.currentPlatform === 'netlify') {
            return this.config.site.urls.primary;
        } else if (this.currentPlatform === 'cloudflare') {
            return this.config.site.urls.secondary;
        } else if (this.currentPlatform === 'local') {
            return window.location.origin + '/';
        }
        return this.config.site.urls.canonical; 
    }

   
    updateTitle(template, variables = {}) {
        let title = template;
        Object.keys(variables).forEach(key => {
            title = title.replace(new RegExp(`{${key}}`, 'g'), variables[key]);
        });
        document.title = title;
        
        
        this.updateMetaProperty('og:title', title);
        this.updateMetaProperty('twitter:title', title);
    }

   
    updateDescription(template, variables = {}) {
        let description = template;
        Object.keys(variables).forEach(key => {
            description = description.replace(new RegExp(`{${key}}`, 'g'), variables[key]);
        });
        
        this.updateMetaName('description', description);
        this.updateMetaProperty('og:description', description);
        this.updateMetaProperty('twitter:description', description);
    }

    
    updateKeywords(template, variables = {}) {
        let keywords = template;
        Object.keys(variables).forEach(key => {
            keywords = keywords.replace(new RegExp(`{${key}}`, 'g'), variables[key]);
        });
        
        this.updateMetaName('keywords', keywords);
    }

    
    updateCanonical(url) {
        const canonicalUrl = url.includes('pages.dev') 
            ? url.replace('iter-curriculum.pages.dev', 'iter-curriculum.netlify.app')
            : url;
            
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
            canonical.href = canonicalUrl;
        }
        
        this.updateMetaProperty('og:url', canonicalUrl);
        this.updateMetaProperty('twitter:url', canonicalUrl);
    }

    
    addStructuredData(data) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(data, null, 2);
        document.head.appendChild(script);
    }

    
    updateBreadcrumbs(items) {
        const breadcrumbData = {
            ...this.config.structuredData.breadcrumbList,
            itemListElement: items.map((item, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": item.name,
                "item": item.url
            }))
        };
        
        this.addStructuredData(breadcrumbData);
    }

  
    updateMetaName(name, content) {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = name;
            document.head.appendChild(meta);
        }
        meta.content = content;
    }

    updateMetaProperty(property, content) {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
        }
        meta.content = content;
    }

    
    initializePageSEO(pageType, context = {}) {
        switch (pageType) {
            case 'viewer':
                if (context.stream && context.semester && context.year) {
                    this.updateTitle(
                        this.config.pages.viewer.title,
                        {
                            stream: context.stream,
                            semester: `Semester ${context.semester}`,
                            year: context.year
                        }
                    );
                    
                    this.updateDescription(
                        this.config.pages.viewer.description,
                        {
                            stream: context.stream,
                            semester: `Semester ${context.semester}`
                        }
                    );
                    
                    this.updateKeywords(
                        this.config.pages.viewer.keywords,
                        {
                            stream: context.stream.toLowerCase(),
                            semester: `semester ${context.semester}`
                        }
                    );

                    this.updateBreadcrumbs([
                        { name: "Home", url: window.location.origin },
                        { name: context.year, url: `${window.location.origin}?year=${context.year}` },
                        { name: context.stream, url: `${window.location.origin}?year=${context.year}&stream=${context.stream}` },
                        { name: `Semester ${context.semester}`, url: window.location.href }
                    ]);
                }
                break;
                
            default:
                break;
        }
    }

    
    trackPageView(pageData) {
        if (typeof gtag !== 'undefined') {
            gtag('config', 'GA_MEASUREMENT_ID', {
                page_title: document.title,
                page_location: window.location.href,
                custom_map: {
                    'stream': pageData.stream,
                    'semester': pageData.semester,
                    'year': pageData.year
                }
            });
        }
    }
}

if (typeof window !== 'undefined') {
    window.SEOManager = SEOManager;
    window.SEO_CONFIG = SEO_CONFIG;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SEOManager, SEO_CONFIG };
}
