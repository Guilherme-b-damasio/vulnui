import { NextRequest, NextResponse } from 'next/server';
import { zapApi, ZapAlert } from '../../../../../lib/zap-client';

// Extended ZapAlert with risk score
interface ScoredZapAlert extends ZapAlert {
    riskScore: number;
}

// Input validation schema
const validateAlertsRequest = (searchParams: URLSearchParams) => {
    const url = searchParams.get('url');
    const start = searchParams.get('start') || '0';
    const count = searchParams.get('count') || '1000';

    if (!url) {
        throw new Error('Parâmetro "url" é obrigatório na query.');
    }

    const urlTrimmed = url.trim();
    if (!urlTrimmed.startsWith('http://') && !urlTrimmed.startsWith('https://')) {
        throw new Error('URL deve começar com http:// ou https://');
    }

    const startNum = parseInt(start, 10);
    const countNum = parseInt(count, 10);

    if (isNaN(startNum) || startNum < 0) {
        throw new Error('Parâmetro "start" deve ser um número positivo.');
    }

    if (isNaN(countNum) || countNum <= 0 || countNum > 10000) {
        throw new Error('Parâmetro "count" deve ser um número entre 1 e 10000.');
    }

    return { url: urlTrimmed, start: startNum, count: countNum };
};

// Performance-optimized risk scoring using object lookups
const RISK_SCORES = {
    'High': 100,
    'Medium': 50,
    'Low': 20,
    'Informational': 5
} as const;

const CONFIDENCE_SCORES = {
    'High': 30,
    'Medium': 20,
    'Low': 10,
    'False Positive': -50
} as const;

// Critical vulnerabilities with bonus scoring
const CRITICAL_VULNS = new Set([
    'sql injection',
    'cross-site scripting',
    'xss',
    'remote code execution',
    'rce',
    'authentication bypass',
    'directory traversal',
    'file inclusion',
    'command injection',
    'csrf',
    'open redirect'
]);

// Risk scoring system - higher score = more important
const calculateRiskScore = (alert: ZapAlert): number => {
    let score = 0;

    // Risk level scoring - direct object lookup (faster than switch)
    score += RISK_SCORES[alert.risk] || 0;

    // Confidence level scoring - direct object lookup
    score += CONFIDENCE_SCORES[alert.confidence] || 0;

    // Specific vulnerability type scoring - Set lookup (O(1) performance)
    const alertLower = alert.alert.toLowerCase();
    if (CRITICAL_VULNS.has(alertLower)) {
        score += 50; // Bonus for critical vulnerabilities
    }

    return score;
};

// Priority filters using direct comparisons (faster than switch)
const PRIORITY_FILTERS = {
    critical: (alert: ZapAlert) => alert.risk === 'High' && alert.confidence === 'High',
    high: (alert: ZapAlert) => (alert.risk === 'High' || alert.risk === 'Medium') && alert.confidence !== 'Low',
    medium: (alert: ZapAlert) => alert.confidence !== 'Low',
    all: () => true
} as const;

// Filter and prioritize alerts
const filterAndPrioritizeAlerts = (alerts: ZapAlert[], priority: string = 'high'): ScoredZapAlert[] => {
    // First, filter out informational alerts by default
    let filteredAlerts = alerts.filter(alert => alert.risk !== 'Informational');

    // Apply priority filtering using function lookup
    const filterFn = PRIORITY_FILTERS[priority as keyof typeof PRIORITY_FILTERS] || PRIORITY_FILTERS.high;
    filteredAlerts = filteredAlerts.filter(filterFn);

    // Calculate risk scores and sort by importance
    const scoredAlerts: ScoredZapAlert[] = filteredAlerts.map(alert => ({
        ...alert,
        riskScore: calculateRiskScore(alert)
    }));

    // Sort by risk score (highest first)
    return scoredAlerts.sort((a, b) => b.riskScore - a.riskScore);
};

// Simplify alert data for easier consumption
const simplifyAlert = (alert: ScoredZapAlert) => {
    // Direct comparison instead of multiple ternary operators
    let priority: string;
    if (alert.riskScore >= 130) priority = 'Critical';
    else if (alert.riskScore >= 100) priority = 'High';
    else if (alert.riskScore >= 70) priority = 'Medium';
    else priority = 'Low';

    return {
        id: `${alert.alert.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
        title: alert.alert,
        risk: alert.risk,
        confidence: alert.confidence,
        riskScore: alert.riskScore,
        url: alert.url,
        description: alert.description,
        solution: alert.solution,
        evidence: alert.evidence,
        cweid: alert.cweid,
        wascid: alert.wascid,
        priority
    };
};

export async function GET(request: NextRequest) {
    try {
        // Get query parameters from URL
        const { searchParams } = new URL(request.url);

        // Validate query parameters
        const { url, start, count } = validateAlertsRequest(searchParams);
        const priority = searchParams.get('priority') || 'high';
        const maxResults = searchParams.get('maxResults') || '50';

        // Get alerts from ZAP
        const response = await zapApi.getAlerts(url, start, count);
        const allAlerts = response.alerts || [];

        // Filter and prioritize alerts
        const prioritizedAlerts = filterAndPrioritizeAlerts(allAlerts, priority);

        // Limit results for better performance
        const maxResultsNum = parseInt(maxResults);
        const limitedAlerts = prioritizedAlerts.slice(0, maxResultsNum);

        // Simplify and format alerts
        const formattedAlerts = limitedAlerts.map(simplifyAlert);

        // Generate summary statistics using reduce for better performance
        const summary = {
            total: allAlerts.length,
            filtered: prioritizedAlerts.length,
            returned: formattedAlerts.length,
            byRisk: formattedAlerts.reduce((acc, alert) => {
                acc[alert.priority.toLowerCase() as keyof typeof acc]++;
                return acc;
            }, { critical: 0, high: 0, medium: 0, low: 0 }),
            priority: priority,
            maxResults: maxResultsNum
        };

        return NextResponse.json({
            summary,
            alerts: formattedAlerts,
            timestamp: new Date().toISOString(),
            message: `Found ${formattedAlerts.length} high-priority vulnerabilities out of ${allAlerts.length} total alerts`
        });

    } catch (error: any) {
        const errorMessage = error.message || 'Erro desconhecido';
        console.error('[ZAP][Alerts]', errorMessage);

        return NextResponse.json({
            error: 'Falha ao obter alertas do ZAP.',
            message: errorMessage,
            timestamp: new Date().toISOString()
        }, { status: 400 });
    }
} 