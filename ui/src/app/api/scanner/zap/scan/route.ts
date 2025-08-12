import { NextRequest, NextResponse } from 'next/server';
import { zapApi } from '../../../../../lib/zap-client';

// Input validation schema
const validateScanRequest = (body: any) => {
    if (!body.url) {
        throw new Error('URL é obrigatória.');
    }

    const url = body.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('URL deve começar com http:// ou https://');
    }

    try {
        new URL(url);
    } catch {
        throw new Error('URL inválida.');
    }

    return url;
};

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();

        // Validate input
        const url = validateScanRequest(body);

        // Start spider scan
        const spiderScanId = await zapApi.startSpiderScan(url);

        // Start active scan
        const activeScanId = await zapApi.startActiveScan(url);

        // Return scan IDs for frontend monitoring
        return NextResponse.json({
            spiderScanId,
            activeScanId,
            message: 'ZAP scan iniciado com sucesso',
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        const errorMessage = error.message || 'Erro desconhecido';
        console.error('[ZAP][Scan]', errorMessage);

        return NextResponse.json({
            error: 'Falha ao iniciar o scan com ZAP.',
            message: errorMessage,
            timestamp: new Date().toISOString()
        }, { status: 400 });
    }
} 