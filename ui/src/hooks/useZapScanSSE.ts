import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { config } from '../config/environment';

interface ScanProgress {
    spiderProgress: number;
    activeProgress: number;
}

interface Vulnerability {
    id: string;
    title: string;
    risk: string;
    confidence: string;
    riskScore: number;
    priority: string;
    url: string;
    description: string;
    solution: string;
    evidence: string;
    cweid: string;
    wascid: string;
}

interface ScanResult {
    summary: {
        total: number;
        filtered: number;
        returned: number;
        byRisk: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
        priority: string;
        maxResults: number;
    };
    alerts: Vulnerability[];
    timestamp: string;
    message: string;
}

interface UseZapScanSSEReturn {
    url: string;
    setUrl: (url: string) => void;
    loading: boolean;
    progress: ScanProgress;
    result: ScanResult | null;
    error: string | null;
    priority: string;
    setPriority: (priority: string) => void;
    runScan: () => Promise<void>;
    resetScan: () => void;
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export const useZapScanSSE = (): UseZapScanSSEReturn => {
    const [url, setUrl] = useState("http://testphp.vulnweb.com/");
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<ScanProgress>({ spiderProgress: 0, activeProgress: 0 });
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [priority, setPriority] = useState<string>('high');
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

    // Refs for scan management
    const spiderScanIdRef = useRef<string | null>(null);
    const activeScanIdRef = useRef<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Memoized API URL to prevent unnecessary re-renders
    const alertsApiUrl = useMemo(() => {
        return `/api/scanner/zap/alerts?url=${encodeURIComponent(url)}&priority=${priority}&maxResults=50`;
    }, [url, priority]);

    // Fetch alerts from ZAP with priority filtering
    const fetchAlerts = useCallback(async (targetUrl: string): Promise<ScanResult> => {
        try {
            const res = await fetch(alertsApiUrl);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            return data;
        } catch (err) {
            console.error('Error fetching alerts:', err);
            throw err;
        }
    }, [alertsApiUrl]);

    // Memoized scan API call
    const startScan = useCallback(async (): Promise<{ spiderScanId: string; activeScanId: string }> => {
        const res = await fetch(`/api/scanner/zap/scan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url.trim() }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Failed to start scan');
        }

        return await res.json();
    }, [url]);

    // Setup SSE connection for real-time status updates
    const setupSSEConnection = useCallback((spiderScanId: string, activeScanId: string) => {
        // Close existing connection if any
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        setConnectionStatus('connecting');

        try {
            const eventSource = new EventSource(
                `/api/scanner/zap/status-stream?spiderScanId=${spiderScanId}&activeScanId=${activeScanId}`
            );

            eventSource.onopen = () => {
                setConnectionStatus('connected');
                console.log('SSE connection established');
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    switch (data.type) {
                        case 'connected':
                            console.log('SSE connected:', data.message);
                            break;

                        case 'progress':
                            setProgress({
                                spiderProgress: data.spiderStatus,
                                activeProgress: data.activeStatus
                            });

                            // Check if both scans are complete
                            if (data.spiderStatus === 100 && data.activeStatus === 100) {
                                setLoading(false);
                                setConnectionStatus('disconnected');

                                // Fetch and display results
                                fetchAlerts(url).then(setResult).catch(err => {
                                    setError(`Failed to fetch results: ${err.message}`);
                                });

                                eventSource.close();
                                eventSourceRef.current = null;
                            }
                            break;

                        case 'complete':
                            console.log('Scan completed via SSE');
                            break;

                        default:
                            if (data.error) {
                                setError(data.error);
                                setConnectionStatus('error');
                                eventSource.close();
                                eventSourceRef.current = null;
                            }
                    }
                } catch (err) {
                    console.error('Error parsing SSE data:', err);
                }
            };

            eventSource.onerror = (error) => {
                console.error('SSE connection error:', error);
                setConnectionStatus('error');
                setError('SSE connection failed');
                eventSource.close();
                eventSourceRef.current = null;
            };

            eventSourceRef.current = eventSource;

        } catch (err) {
            console.error('Failed to setup SSE connection:', err);
            setConnectionStatus('error');
            setError('Failed to setup real-time connection');
        }
    }, [url, fetchAlerts]);

    // Start ZAP scan with SSE monitoring
    const runScan = useCallback(async () => {
        if (!url.trim()) {
            setError("Please enter a URL");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setResult(null);
            setProgress({ spiderProgress: 0, activeProgress: 0 });
            setConnectionStatus('disconnected');

            // Start the scan
            const { spiderScanId, activeScanId } = await startScan();
            spiderScanIdRef.current = spiderScanId;
            activeScanIdRef.current = activeScanId;

            // Setup SSE connection for real-time updates
            setupSSEConnection(spiderScanId, activeScanId);

        } catch (err: any) {
            setLoading(false);
            setError(err.message || 'Unknown error occurred');
            console.error('Scan error:', err);
        }
    }, [url, startScan, setupSSEConnection]);

    // Reset scan state
    const resetScan = useCallback(() => {
        // Close SSE connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        // Reset refs
        spiderScanIdRef.current = null;
        activeScanIdRef.current = null;

        // Reset state
        setLoading(false);
        setProgress({ spiderProgress: 0, activeProgress: 0 });
        setResult(null);
        setError(null);
        setConnectionStatus('disconnected');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    return {
        url,
        setUrl,
        loading,
        progress,
        result,
        error,
        priority,
        setPriority,
        runScan,
        resetScan,
        connectionStatus,
    };
}; 