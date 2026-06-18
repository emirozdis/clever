"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

// Type definitions
type MemoryDetails = {
  database: {
    status: string;
    total_records?: number;
  };
};

type SearxngDetails = {
  searxng: {
    status: string;
    endpoint: string;
    response_status?: number;
  };
};

type ServiceStatus<TDetails = unknown> = {
  status: 'checking' | 'operational' | 'degraded' | 'down';
  response_time: number | null;
  error: { message: string; type?: string } | null;
  details: TDetails | null;
};

type Statuses = {
  memory: ServiceStatus<MemoryDetails>;
  searxng: ServiceStatus<SearxngDetails>;
};

const StatusPage: React.FC = () => {
  const [statuses, setStatuses] = useState<Statuses>({
    memory: { status: 'checking', response_time: null, error: null, details: null },
    searxng: { status: 'checking', response_time: null, error: null, details: null }
  });
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function checkApiStatus<T>(endpoint: string): Promise<ServiceStatus<T>> {
    const startTime = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.ok) {
        // Try to parse health check response for additional details
        try {
          const healthData = await response.json();
          return { 
            status: healthData.status === 'healthy' ? 'operational' : 
                   healthData.status === 'degraded' ? 'degraded' : 'down', 
            response_time: responseTime,
            error: null,
            details: healthData as T
          };
        } catch {
          return { status: 'operational', response_time: responseTime, error: null, details: null };
        }
      } else {
        // Handle non-200 responses
        let errorDetails: { message: string; type?: string } | null = null;
        try {
          errorDetails = await response.json();
        } catch {
          errorDetails = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        return { 
          status: response.status >= 500 ? 'down' : 'degraded', 
          response_time: responseTime,
          error: errorDetails,
          details: null
        };
      }
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError') {
        return {
          status: 'down',
          response_time: null,
          error: { message: 'Request timeout (>10s)', type: 'TimeoutError' },
          details: null
        };
      }
      return {
        status: 'down',
        response_time: responseTime,
        error: {
          message: error && typeof error === 'object' && 'message' in error ? String((error as { message?: string }).message) : 'Unknown error',
          type: error && typeof error === 'object' && 'name' in error ? String((error as { name?: string }).name) : undefined
        },
        details: null
      };
    }
  };

  const checkAllServices = React.useCallback(async () => {
    setIsRefreshing(true);

    const memoryResult = await checkApiStatus<MemoryDetails>('/api/memory?health=true');
    const searxngResult = await checkApiStatus<SearxngDetails>('/api/search/health');

    setStatuses(prev => ({
      ...prev,
      memory: memoryResult,
      searxng: searxngResult
    }));
    setLastChecked(new Date());
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    checkAllServices();
    // Check every 5 minutes
    const interval = setInterval(checkAllServices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkAllServices]);

  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'checking':
      default:
        return <div className="w-5 h-5 bg-gray-300 rounded-full animate-pulse" />;
    }
  };

  const getStatusText = (status: ServiceStatus["status"]) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded':
        return 'Degraded Performance';
      case 'down':
        return 'Down';
      case 'checking':
      default:
        return 'Checking...';
    }
  };

  const getStatusColor = (status: ServiceStatus["status"]) => {
    switch (status) {
      case 'operational':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'down':
        return 'text-red-600';
      case 'checking':
      default:
        return 'text-gray-500';
    }
  };

  const getOverallStatus = (): ServiceStatus["status"] => {
    const statusValues = Object.values(statuses);
    if (statusValues.some(s => s.status === 'down')) return 'down';
    if (statusValues.some(s => s.status === 'degraded')) return 'degraded';
    if (statusValues.every(s => s.status === 'operational')) return 'operational';
    return 'checking';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Clever AI Assistant
          </h1>
          <p className="text-lg text-gray-600">API Status Dashboard</p>
        </div>

        {/* Overall Status */}
        <div className="bg-white rounded-lg shadow-sm border mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(overallStatus)}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Overall System Status
                </h2>
                <p className={`text-sm font-medium ${getStatusColor(overallStatus)}`}>
                  {getStatusText(overallStatus)}
                </p>
              </div>
            </div>
            
            <button
              onClick={checkAllServices}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
          
          {lastChecked && (
            <p className="text-sm text-gray-500">
              Last checked: {lastChecked instanceof Date ? lastChecked.toLocaleString() : ''}
            </p>
          )}
        </div>

        {/* Individual Services */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Status</h3>
          
          {/* Memory API */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(statuses.memory.status)}
                <div>
                  <h4 className="font-medium text-gray-900">Memory API</h4>
                  <p className="text-sm text-gray-500">
                    Keyword-based memory storage and retrieval
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`text-sm font-medium ${getStatusColor(statuses.memory.status)}`}>
                  {getStatusText(statuses.memory.status)}
                </p>
                {statuses.memory.response_time && (
                  <p className="text-xs text-gray-500">
                    {statuses.memory.response_time}ms
                  </p>
                )}
              </div>
            </div>
            
            {/* Error Details */}
            {statuses.memory.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">Issue Detected:</p>
                <p className="text-sm text-red-700 mt-1">{statuses.memory.error?.message}</p>
                {statuses.memory.error?.type && (
                  <p className="text-xs text-red-600 mt-1">Error Type: {statuses.memory.error.type}</p>
                )}
              </div>
            )}
            
            {/* Health Details */}
            {statuses.memory.details && (statuses.memory.details as MemoryDetails).database && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-700">Database:</span>
                  <span className={`font-medium ${(statuses.memory.details as MemoryDetails).database.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                    {(statuses.memory.details as MemoryDetails).database.status}
                  </span>
                </div>
                {(statuses.memory.details as MemoryDetails).database.total_records !== undefined && (
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-blue-700">Records:</span>
                    <span className="text-blue-800 font-medium">{(statuses.memory.details as MemoryDetails).database.total_records}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SearXNG API */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(statuses.searxng.status)}
                <div>
                  <h4 className="font-medium text-gray-900">Search API</h4>
                  <p className="text-sm text-gray-500">
                    SearXNG search engine proxy and aggregation service
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`text-sm font-medium ${getStatusColor(statuses.searxng.status)}`}>
                  {getStatusText(statuses.searxng.status)}
                </p>
                {statuses.searxng.response_time && (
                  <p className="text-xs text-gray-500">
                    {statuses.searxng.response_time}ms
                  </p>
                )}
              </div>
            </div>
            
            {/* Error Details */}
            {statuses.searxng.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">Issue Detected:</p>
                <p className="text-sm text-red-700 mt-1">{statuses.searxng.error?.message}</p>
                {statuses.searxng.error?.type && (
                  <p className="text-xs text-red-600 mt-1">Error Type: {statuses.searxng.error.type}</p>
                )}
              </div>
            )}
            
            {/* Health Details */}
            {statuses.searxng.details && (statuses.searxng.details as SearxngDetails).searxng && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-700">SearXNG:</span>
                  <span className={`font-medium ${
                    (statuses.searxng.details as SearxngDetails).searxng.status === 'connected' ? 'text-green-600' :
                    (statuses.searxng.details as SearxngDetails).searxng.status === 'responding_with_errors' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(statuses.searxng.details as SearxngDetails).searxng.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-blue-700">Endpoint:</span>
                  <span className="text-blue-800 font-mono text-xs">{(statuses.searxng.details as SearxngDetails).searxng.endpoint}</span>
                </div>
                {(statuses.searxng.details as SearxngDetails).searxng.response_status && (
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-blue-700">HTTP Status:</span>
                    <span className="text-blue-800 font-medium">{(statuses.searxng.details as SearxngDetails).searxng.response_status}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            This page automatically refreshes every 5 minutes.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Powered by Clever AI Assistant
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatusPage;