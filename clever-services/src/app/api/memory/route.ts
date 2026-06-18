// app/api/memory/route.ts - Updated with integrated health check

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// Authentication middleware
function requireAuth(request: Request): Response | null {
  // Health check bypass
  const url = new URL(request.url);
  if (url.searchParams.get('health') === 'true') return null;
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

// Initialize SQLite database
import type { Database } from 'sqlite';
import type { NextRequest } from 'next/server';

let db: Database | null = null;

async function initDB() {
  if (db) return db;
  
  const dbPath = path.join(process.cwd(), 'memory.db');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS memory_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      value TEXT NOT NULL,
      keywords TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

// Health check handler
async function handleHealthCheck() {
  const startTime = Date.now();
  
  try {
    // Test database connection and basic query
    const database = await initDB();
    
    // Run a simple health check query
    const result = await database.get('SELECT COUNT(*) as count FROM memory_keywords');
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return Response.json({
      status: 'healthy',
      service: 'memory-api',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      database: {
        status: 'connected',
        total_records: result?.count || 0
      },
      version: '1.0.0'
    }, { status: 200 });

  } catch (error: unknown) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.error('Memory API health check failed:', error);
    
    let errorMessage = 'Unknown error';
    let errorType = 'UnknownError';
    if (typeof error === 'object' && error !== null) {
      if ('message' in error && typeof (error as { message?: unknown }).message === 'string') {
        errorMessage = (error as { message: string }).message;
      }
      if ('constructor' in error && typeof (error as { constructor?: { name?: unknown } }).constructor === 'object' &&
        (error as { constructor: { name?: unknown } }).constructor &&
        typeof (error as { constructor: { name?: unknown } }).constructor.name === 'string') {
        errorType = (error as { constructor: { name: string } }).constructor.name;
      }
    }
    return Response.json({
      status: 'unhealthy',
      service: 'memory-api',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      error: {
        message: errorMessage,
        type: errorType
      },
      database: {
        status: 'disconnected'
      },
      version: '1.0.0'
    }, { status: 503 });
  }
}

// For App Router (Next.js 13+)
export async function GET(request: NextRequest) {
  // Health check bypass
  const { searchParams } = new URL(request.url);
  if (searchParams.get('health') === 'true') {
    return handleHealthCheck();
  }
  // Require authentication
  const authResult = requireAuth(request);
  if (authResult) return authResult;

  try {
    const query = searchParams.get('q') || '';
    if (!query.trim()) {
      return Response.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }
    const database = await initDB();
    // Parse query into separate words
    const queryWords = query.toLowerCase().trim().split(/\s+/);
    // Find matching records
    const matchingRecords = [];
    for (const word of queryWords) {
      // Search in both name, value, and keywords fields
      const records = await database.all(`
        SELECT * FROM memory_keywords 
        WHERE LOWER(name) LIKE ? 
        OR LOWER(value) LIKE ? 
        OR LOWER(keywords) LIKE ?
      `, [`%${word}%`, `%${word}%`, `%${word}%`]);
      matchingRecords.push(...records);
    }
    // Remove duplicates based on ID
    const uniqueRecords = matchingRecords.filter((record, index, self) => 
      index === self.findIndex(r => r.id === record.id)
    );
    return Response.json({
      success: true,
      query,
      queryWords,
      matches: uniqueRecords,
      count: uniqueRecords.length
    });
  } catch (error) {
    console.error('GET Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Require authentication
  const authResult = requireAuth(request);
  if (authResult) return authResult;
  try {
    const body = await request.json();
    const { name, value, keywords } = body;
    // Validation
    if (!name || !value || !keywords) {
      return Response.json({ 
        error: 'Missing required fields: name, value, and keywords are required' 
      }, { status: 400 });
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return Response.json({ 
        error: 'Keywords must be a non-empty array' 
      }, { status: 400 });
    }

    const database = await initDB();
    
    // Convert keywords array to comma-separated string
    const keywordsString = keywords.join(', ');
    
    // Insert new record
    const result = await database.run(`
      INSERT INTO memory_keywords (name, value, keywords)
      VALUES (?, ?, ?)
    `, [name, value, keywordsString]);

    // Get the inserted record
    const insertedRecord = await database.get(`
      SELECT * FROM memory_keywords WHERE id = ?
    `, [result.lastID]);

    return Response.json({
      success: true,
      message: 'Memory record saved successfully',
      record: {
        ...insertedRecord,
        keywords: insertedRecord.keywords.split(', ')
      }
    }, { status: 201 });

  } catch (error) {
    console.error('POST Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}