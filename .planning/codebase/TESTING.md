# Testing Patterns

**Analysis Date:** 2026-02-07

## Test Framework

**Status:** No testing framework detected

**Analysis:**
- No test files found in codebase (zero `.test.ts`, `.spec.ts`, `.test.tsx`, or `.spec.tsx` files)
- No Jest, Vitest, or other test runner configuration files present
- No test-related dependencies in any `package.json` file
- TypeScript compilation and type checking serves as primary quality gate

**Code Quality Measures in Place:**
- TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters` enforcement
- Type system prevents many runtime errors
- Source maps enabled for production debugging (`"sourceMap": true`)

## Testing Approach

**Current State:**
- **Manual Testing Only** - Application relies on manual testing and integration testing in production
- **Type Safety** - Heavy reliance on TypeScript's strict type checking to catch errors at compile time
- **Build-Time Validation** - Type checking happens during `npm run build`

## Recommended Test Patterns (When Tests Are Added)

### Unit Tests

**Scope and approach:**
- Utility functions: `fetchUrl()`, `normalizeUrl()`, `detectWordPress()`, rate limiter, CSV parsing
- Database queries: `upsertSite()`, `listSites()`, filtering logic
- Validation functions: provider config validation

**Example approach for utilities** (`src/utils/http.ts`):
```typescript
describe('http utilities', () => {
  test('normalizeUrl adds https:// prefix', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });

  test('normalizeUrl removes trailing slashes', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
  });

  test('extractDomain extracts hostname', () => {
    expect(extractDomain('https://subdomain.example.com/path')).toBe('subdomain.example.com');
  });
});
```

**Example approach for database operations** (`src/db/queries/sites.ts`):
```typescript
describe('upsertSite', () => {
  test('inserts new site with all fields', () => {
    const site = upsertSite({
      url: 'https://example.com',
      domain: 'example.com',
      is_wordpress: true,
      // ... other fields
    });
    expect(site.id).toBeDefined();
    expect(site.url).toBe('https://example.com');
  });

  test('updates existing site by URL', () => {
    // Create initial
    const site1 = upsertSite({ url: 'https://example.com', domain: 'example.com' });
    // Update
    const site2 = upsertSite({
      url: 'https://example.com',
      domain: 'example.com',
      is_wordpress: true,
    });
    expect(site1.id).toBe(site2.id);
    expect(site2.is_wordpress).toBe(true);
  });
});
```

**Example approach for validation** (discovery providers):
```typescript
describe('ManualProvider validation', () => {
  test('rejects empty URL array', () => {
    const result = new ManualProvider().validate({ urls: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one URL is required');
  });

  test('rejects more than 500 URLs', () => {
    const urls = Array(501).fill('https://example.com');
    const result = new ManualProvider().validate({ urls });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Maximum 500 URLs per batch');
  });
});
```

### Integration Tests

**Scope and approach:**
- Discovery job workflow: create job → process with provider → save sites
- Database transactions: upsert sites, retrieve with filters, export CSV
- API routes: POST /discovery/jobs, GET /sites, DELETE /sites/:id
- Provider end-to-end: config validation → discovery execution → WordPress detection

**Example approach for API routes** (`src/routes/discovery.ts`):
```typescript
describe('Discovery API', () => {
  test('POST /jobs creates and queues job', async () => {
    const response = await request(app)
      .post('/api/discovery/jobs')
      .send({
        provider: 'manual',
        config: { urls: ['https://example.com'] },
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('pending');
  });

  test('GET /jobs lists pending and completed jobs', async () => {
    const response = await request(app).get('/api/discovery/jobs');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('POST /detect runs WordPress detection on URL', async () => {
    const response = await request(app)
      .post('/api/discovery/detect')
      .send({ url: 'https://wordpress.com' });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('is_wordpress');
    expect(response.body.data).toHaveProperty('wp_version');
  });
});
```

**Example approach for discovery workflow**:
```typescript
describe('Discovery workflow', () => {
  test('complete discovery job: create → process → save', async () => {
    // Create job
    const job = createJob({
      id: 'test-job',
      provider: 'manual',
      config: { urls: ['https://example.com', 'https://test.org'] },
    });

    // Process job (mocked or real provider)
    const provider = getProvider('manual');
    const discovered = await provider.discover(job.config, new AbortController().signal, () => {});

    // WordPress detection
    for (const url of discovered) {
      const detection = await detectWordPress(url.url);
      saveSiteFromDetection(detection, 'manual', job.id);
    }

    // Verify saved sites
    const sites = listSites({ job_id: job.id });
    expect(sites.sites.length).toBe(2);
  });
});
```

## Mocking Strategy

**Framework:** Jest or Vitest (when added)

**What to Mock:**
- Network requests: `fetchUrl()` - mock HTTP responses
- External APIs: BuiltWith, Wappalyzer, Google Search - mock API responses
- Rate limiters: mock time-based delays
- Database: in-memory SQLite for integration tests OR mock database calls for unit tests
- File system: mock CSV import/export operations

**What NOT to Mock:**
- Database layer for integration tests (use real in-memory SQLite)
- Discovery provider implementations (test actual logic)
- URL normalization and utility functions (test real implementations)
- WordPress detection logic (test real HTML parsing)

**Example mocking for HTTP** (discovery providers):
```typescript
jest.mock('../utils/http');

describe('GoogleSearchProvider', () => {
  beforeEach(() => {
    (fetchUrl as jest.Mock).mockResolvedValue({
      statusCode: 200,
      body: '<html>...</html>',
      headers: {},
      responseTimeMs: 150,
      sslValid: true,
    });
  });

  test('extracts URLs from search results', async () => {
    const provider = new GoogleSearchProvider();
    const urls = await provider.discover(
      { query: 'test', maxPages: 1 },
      new AbortController().signal,
      () => {}
    );
    expect(urls.length).toBeGreaterThan(0);
  });
});
```

**Example mocking for rate limiter**:
```typescript
jest.mock('../utils/rate-limiter');

beforeEach(() => {
  (rateLimiters.scraping.acquire as jest.Mock).mockResolvedValue(undefined);
});
```

## Test File Organization

**Location:** Co-located with source (preferred modern approach)

**Naming:** `[module].test.ts` or `[module].spec.ts`

**Structure:**
```
src/
├── utils/
│   ├── http.ts
│   ├── http.test.ts
│   ├── rate-limiter.ts
│   └── rate-limiter.test.ts
├── db/
│   ├── index.ts
│   ├── queries/
│   │   ├── sites.ts
│   │   ├── sites.test.ts
│   │   ├── jobs.ts
│   │   └── jobs.test.ts
├── routes/
│   ├── discovery.ts
│   └── discovery.test.ts
└── services/
    └── discovery/
        ├── providers/
        │   ├── base.ts
        │   ├── manual.ts
        │   ├── manual.test.ts
        │   └── ... other providers
```

**Test Suite Structure:**
```typescript
describe('Feature or Module Name', () => {
  beforeEach(() => {
    // Setup (database, mocks, fixtures)
  });

  afterEach(() => {
    // Teardown (close connections, clear mocks)
  });

  describe('specific function or behavior', () => {
    test('should do something specific', () => {
      // Arrange
      const input = ...;

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toEqual(...);
    });
  });
});
```

## Fixtures and Test Data

**Test Data Factories:**
- Build test data in factory functions or utilities
- Store in `src/__fixtures__/` or `tests/fixtures/`

**Example factory for Site**:
```typescript
export function createTestSite(overrides?: Partial<Site>): Site {
  return {
    id: Math.floor(Math.random() * 100000),
    url: 'https://example.com',
    domain: 'example.com',
    is_wordpress: true,
    wp_version: '6.4',
    detected_theme: 'twentytwentyfour',
    detected_plugins: 'jetpack, yoast-seo',
    discovery_source: 'manual',
    discovery_job_id: null,
    discovery_date: new Date().toISOString(),
    country: 'US',
    industry_guess: 'Technology',
    has_contact_page: true,
    contact_page_url: 'https://example.com/contact',
    status: 'active',
    http_status_code: 200,
    ssl_valid: true,
    response_time_ms: 245,
    meta_description: 'Example site',
    page_title: 'Example',
    pipeline_stage: 'discovered',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
```

**Example factory for Job**:
```typescript
export function createTestJob(overrides?: Partial<Job>): Job {
  return {
    id: v4(),
    type: 'discovery',
    status: 'pending',
    provider: 'manual',
    config: { urls: ['https://example.com'] },
    progress: 0,
    total_items: 1,
    processed_items: 0,
    error: null,
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    ...overrides,
  };
}
```

## Coverage

**Requirements:** Not enforced (no coverage configuration)

**When Adding Tests:**
- Aim for 80%+ coverage on critical paths (discovery providers, database, WordPress detection)
- Routes and API handlers: 70%+ (integration tests validate most logic)
- Utilities: 90%+
- Views/Components: 50%+ (integration tests more valuable than unit tests)

**View Coverage:**
```bash
npm run test -- --coverage
```

## Test Types in This Codebase

**Unit Tests (Primary):**
- Utility functions: HTTP client, URL normalization, rate limiting
- Database query builders: filtering, sorting, pagination
- Validation logic: provider configuration validation
- WordPress detection: HTML parsing logic, version extraction

**Integration Tests (Secondary):**
- Discovery job end-to-end: create job → discover URLs → detect WordPress → save sites
- API endpoint behavior: request validation, error handling, response format
- Database transactions: upsert, filter, export workflows
- Provider execution: real provider with mocked external APIs

**Component Tests (Limited without framework):**
- Manual testing of React components for now
- When testing framework added: test form submissions, state changes, conditional rendering
- Focus on props and callbacks, not implementation details

## Common Patterns When Tests Are Added

**Async Testing:**
```typescript
test('async function resolves with correct data', async () => {
  const result = await asyncFunction();
  expect(result).toEqual(expectedValue);
});

test('async function rejects on error', async () => {
  await expect(asyncFunction()).rejects.toThrow('error message');
});
```

**Error Testing:**
```typescript
test('throws error for invalid input', () => {
  expect(() => {
    functionThatThrows(invalidInput);
  }).toThrow('Expected error message');
});

test('validation returns errors array', () => {
  const result = validate(invalidConfig);
  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});
```

**Database Testing with Real In-Memory DB:**
```typescript
describe('Site queries', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    // Initialize schema
    db.exec(readFileSync('./src/db/schema.sql', 'utf-8'));
  });

  test('upsertSite inserts and updates correctly', () => {
    const site1 = upsertSite({ url: 'https://example.com', domain: 'example.com' });
    const site2 = upsertSite({
      url: 'https://example.com',
      domain: 'example.com',
      is_wordpress: true,
    });
    expect(site1.id).toBe(site2.id);
    expect(site2.is_wordpress).toBe(true);
  });
});
```

---

*Testing analysis: 2026-02-07*
