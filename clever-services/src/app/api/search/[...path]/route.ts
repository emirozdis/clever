// app/api/search/[...path]/route.ts - Updated with health check
import { load} from 'cheerio';

// Authentication middleware
function requireAuth(request: Request): Response | null {
  // Health check bypass (already handled in GET)
  const authHeader = request.headers.get('authorization') || request.headers.get('x-auth-key');
  const validKey = process.env.AUTH_KEY || (globalThis as { process?: { env?: { AUTH_KEY?: string } } }).process?.env?.AUTH_KEY;
  if (!authHeader || authHeader !== validKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return null;
}
export async function GET(request: Request, context: { params: Promise<{ path?: string | string[] }> }) {
  const params = await context.params;
  // Health check bypass
  if (params.path && params.path[0] === 'health') {
    return handleHealthCheck();
  }
  // Require authentication
  const authResult = requireAuth(request);
  if (authResult) return authResult;
  return handleProxy(request, params, 'GET');
}

export async function POST(request: Request, context: { params: Promise<{ path?: string | string[] }> }) {
  const params = await context.params;
  const authResult = requireAuth(request);
  if (authResult) return authResult;
  return handleProxy(request, params, 'POST');
}

export async function PUT(request: Request, context: { params: Promise<{ path?: string | string[] }> }) {
  const params = await context.params;
  const authResult = requireAuth(request);
  if (authResult) return authResult;
  return handleProxy(request, params, 'PUT');
}

export async function DELETE(request: Request, context: { params: Promise<{ path?: string | string[] }> }) {
  const params = await context.params;
  const authResult = requireAuth(request);
  if (authResult) return authResult;
  return handleProxy(request, params, 'DELETE');
}

export async function PATCH(request: Request, context: { params: Promise<{ path?: string | string[] }> }) {
  const params = await context.params;
  const authResult = requireAuth(request);
  if (authResult) return authResult;
  return handleProxy(request, params, 'PATCH');
}

export async function HEAD(request: Request, context: { params: Promise<{ path?: string | string[] }> }) {
  const params = await context.params;
  const authResult = requireAuth(request);
  if (authResult) return authResult;
  return handleProxy(request, params, 'HEAD');
}

export async function OPTIONS(request: Request, context: { params: Promise<{ path?: string | string[] }> }) {
  const params = await context.params;
  const authResult = requireAuth(request);
  if (authResult) return authResult;
  return handleProxy(request, params, 'OPTIONS');
// Authentication middleware
function requireAuth(request: Request): Response | null {
  // Health check bypass (already handled in GET)
  const authHeader = request.headers.get('authorization') || request.headers.get('x-auth-key');
  const validKey = process.env.AUTH_KEY || (globalThis as { process?: { env?: { AUTH_KEY?: string } } }).process?.env?.AUTH_KEY;
  if (!authHeader || authHeader !== validKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return null;
}
}

async function handleHealthCheck() {
  const startTime = Date.now();
  
  try {
    // Test connection to SearXNG instance
    const response = await fetch('http://localhost:8080/config', {
      method: 'GET',
      headers: {
        'User-Agent': 'Clever-AI-Health-Check/1.0'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout for health check
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (response.ok) {
      return Response.json({
        status: 'healthy',
        service: 'search-api',
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime,
        searxng: {
          status: 'connected',
          endpoint: 'http://localhost:8080',
          response_status: response.status
        },
        version: '1.0.0'
      }, { status: 200 });
    } else {
      return Response.json({
        status: 'degraded',
        service: 'search-api',
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime,
        searxng: {
          status: 'responding_with_errors',
          endpoint: 'http://localhost:8080',
          response_status: response.status,
          status_text: response.statusText
        },
        version: '1.0.0'
      }, { status: 200 }); // Still return 200 for degraded service
    }

  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.error('Search API health check failed:', error);
    let errorMessage = 'Unknown error';
    let errorType = 'Unknown';
    if (error instanceof Error) {
      errorMessage = error.message;
      errorType = error.constructor.name;
    }
    return Response.json({
      status: 'unhealthy',
      service: 'search-api',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      error: {
        message: errorMessage,
        type: errorType
      },
      searxng: {
        status: 'unreachable',
        endpoint: 'http://localhost:8080'
      },
      version: '1.0.0'
    }, { status: 503 });
  }
}

async function handleProxy(
  request: Request,
  params: { path?: string | string[] },
  method: string
) {
  const { path } = params;
  
  // Reconstruct the full path
  const targetPath = Array.isArray(path) ? path.join('/') : (path || '');
  const url = new URL(request.url);
  // Remove any user-provided format param and force format=json
  const searchParams = new URLSearchParams(url.search);
  searchParams.delete('format');
  searchParams.set('format', 'json');
  const targetUrl = `http://localhost:8080/${targetPath}?${searchParams.toString()}`;
  
  try {
    // Get request body if it exists
    const body = method !== 'GET' && method !== 'HEAD' ? await request.arrayBuffer() : undefined;
    // Forward the request to SearXNG
    // Prepare headers, force accept: application/json
    const userHeaders = Object.fromEntries(request.headers.entries());
    userHeaders['accept'] = 'application/json';
    userHeaders['format'] = 'json';
    // Remove any duplicate Accept/format headers (case-insensitive)
    for (const key of Object.keys(userHeaders)) {
      if (key.toLowerCase() === 'accept' && key !== 'accept') delete userHeaders[key];
      if (key.toLowerCase() === 'format' && key !== 'format') delete userHeaders[key];
    }
    const response = await fetch(targetUrl, {
      method: method,
      headers: {
        ...userHeaders,
        host: 'localhost:8080'
      },
      body: body,
    });

    // Only intercept search queries (assume /search path)
    if (targetPath.startsWith('search')) {
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // Not JSON, return error and partial body for debugging
        const body = await response.text();
        return new Response(
          JSON.stringify({
            error: 'SearXNG did not return JSON',
            contentType,
            bodyPreview: body.slice(0, 500)
          }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const data = await response.json();
      // SearXNG returns results in data.results
      const results = Array.isArray(data.results) ? data.results.slice(0, 3) : [];
      const extracted = [];
      for (const result of results) {
        if (!result.url) continue;
        try {
          const pageResp = await fetch(result.url, {
            headers: { 'User-Agent': 'Clever-AI-Search-Proxy/1.0' },
            signal: AbortSignal.timeout(7000)
          });
          if (!pageResp.ok) {
            extracted.push({ url: result.url, error: `Failed to fetch: ${pageResp.status}` });
            continue;
          }
          const html = await pageResp.text();
          // Extract text from p, h1, h2, h3, h4, h5, h6
          const snippet = extractBodyText(html);
          extracted.push({ url: result.url, title: result.title, snippet });
        } catch (err) {
          extracted.push({ url: result.url, error: 'Fetch error' });
        }
      }
      return Response.json({
        status: 'ok',
        count: extracted.length,
        results: extracted
      }, { status: 200 });
    }

    // Default: proxy as before
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });
    const responseBody = await response.arrayBuffer();
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Bad Gateway - Could not reach SearXNG instance' }),
      { 
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
function extractBodyText(html: string): string {
  const $ = load(html);
  // Remove unwanted tags from body
  $('body footer, body header, body nav, body aside').remove();
  // Get all p and h1-h6 elements under body, in order
  let snippet = '';
  $('body').find('p, h1, h2, h3, h4, h5, h6').each((_, el) => {
    const t = $(el).text().trim();
    if (t) snippet += t + '\n';
  });
  return snippet.trim();
}