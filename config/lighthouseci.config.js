module.exports = {
  ci: {
    collect: {
      staticDistDir: './',
      url: ['http://localhost:8081'],
      numberOfRuns: 3,
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'interactive': ['warn', { maxNumericValue: 3800 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'max-potential-fid': ['warn', { maxNumericValue: 200 }],
      },
    },
  },
};