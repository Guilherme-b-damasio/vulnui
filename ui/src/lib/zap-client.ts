import axios from 'axios';
import { config } from '../config/environment';

// Centralized ZAP client configuration
export const zapClient = axios.create({
    baseURL: config.zap.baseUrl,
    timeout: config.zap.timeout,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Client for long operations (like starting scans)
export const zapLongOperationClient = axios.create({
    baseURL: config.zap.baseUrl,
    timeout: config.zap.longOperationTimeout,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Client for quick status checks
export const zapStatusClient = axios.create({
    baseURL: config.zap.baseUrl,
    timeout: config.scan.statusCheckTimeout,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Retry logic for failed requests
const retryRequest = async (requestFn: () => Promise<any>, maxRetries: number = 3, delay: number = 1000) => {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await requestFn();
        } catch (error: any) {
            lastError = error;

            // Don't retry on client errors (4xx)
            if (error.response?.status >= 400 && error.response?.status < 500) {
                throw error;
            }

            // Don't retry on timeout errors after max retries
            if (attempt === maxRetries) {
                throw error;
            }

            // Wait before retrying (exponential backoff)
            const waitTime = delay * Math.pow(2, attempt - 1);
            console.log(`[ZAP] Retry attempt ${attempt}/${maxRetries} in ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    throw lastError;
};

// Helper functions for common ZAP operations
export const zapApi = {
    // Spider scan operations
    startSpiderScan: async (url: string) => {
        return retryRequest(async () => {
            const response = await zapLongOperationClient.get('/JSON/spider/action/scan/', {
                params: { url }
            });
            return response.data.scan;
        }, config.zap.retryAttempts);
    },

    getSpiderStatus: async (scanId: string) => {
        return retryRequest(async () => {
            const response = await zapStatusClient.get('/JSON/spider/view/status/', {
                params: { scanId }
            });
            return response.data.status;
        }, config.zap.retryAttempts);
    },

    // Active scan operations
    startActiveScan: async (url: string) => {
        return retryRequest(async () => {
            const response = await zapLongOperationClient.get('/JSON/ascan/action/scan/', {
                params: {
                    url,
                    recurse: 'true',
                    inScopeOnly: 'false'
                }
            });
            return response.data.scan;
        }, config.zap.retryAttempts);
    },

    getActiveScanStatus: async (scanId: string) => {
        return retryRequest(async () => {
            const response = await zapStatusClient.get('/JSON/ascan/view/status/', {
                params: { scanId }
            });
            return response.data.status;
        }, config.zap.retryAttempts);
    },

    // Alerts operations
    getAlerts: async (url: string, start: number = 0, count: number = 1000) => {
        return retryRequest(async () => {
            const response = await zapClient.get('/JSON/core/view/alerts/', {
                params: {
                    baseurl: url,
                    start,
                    count
                }
            });
            return response.data;
        }, config.zap.retryAttempts);
    },

    // Context operations (for future use)
    createContext: async (contextName: string) => {
        return retryRequest(async () => {
            const response = await zapClient.get('/JSON/context/action/newContext/', {
                params: { contextName }
            });
            return response.data.contextId;
        }, config.zap.retryAttempts);
    },

    includeInContext: async (contextId: string, regex: string) => {
        return retryRequest(async () => {
            await zapClient.get('/JSON/context/action/includeInContext/', {
                params: { contextId, regex }
            });
        }, config.zap.retryAttempts);
    }
};

// Error handling wrapper with better timeout handling
export const handleZapError = (error: any, operation: string) => {
    console.error(`[ZAP][${operation}]`, error.response?.data || error.message);

    // Handle timeout errors specifically
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error(`ZAP operation timed out. The operation '${operation}' is taking longer than expected. This is normal for large scans.`);
    }

    if (error.response?.status === 404) {
        throw new Error(`ZAP service not found. Please check if ZAP is running on ${config.zap.baseUrl}`);
    }

    if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to ZAP service at ${config.zap.baseUrl}. Please check if ZAP is running.`);
    }

    if (error.response?.status >= 500) {
        throw new Error(`ZAP server error (${error.response.status}). The ZAP service may be overloaded. Please try again later.`);
    }

    throw new Error(`ZAP operation failed: ${error.response?.data?.message || error.message}`);
};

// Types for ZAP responses
export interface ZapAlert {
    alert: string;
    risk: 'High' | 'Medium' | 'Low' | 'Informational';
    confidence: 'High' | 'Medium' | 'Low' | 'False Positive';
    url: string;
    evidence: string;
    description: string;
    solution: string;
    cweid: string;
    wascid: string;
    [key: string]: any;
}

export interface ZapScanResponse {
    scan: string;
    [key: string]: any;
}

export interface ZapStatusResponse {
    status: string;
    [key: string]: any;
}

export interface ZapAlertsResponse {
    alerts: ZapAlert[];
    [key: string]: any;
} 