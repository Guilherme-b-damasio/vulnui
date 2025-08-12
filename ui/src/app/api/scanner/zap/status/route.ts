import { NextRequest, NextResponse } from 'next/server';
import { zapApi } from '../../../../../lib/zap-client';

// Input validation schema
const validateStatusRequest = (searchParams: URLSearchParams) => {
    const spiderScanId = searchParams.get('spiderScanId');
    const activeScanId = searchParams.get('activeScanId');

    if (!spiderScanId) {
        throw new Error('spiderScanId é obrigatório.');
    }

    if (!activeScanId) {
        throw new Error('activeScanId é obrigatório.');
    }

    return { spiderScanId, activeScanId };
};

export async function GET(request: NextRequest) {
    try {
        // Get query parameters from URL
        const { searchParams } = new URL(request.url);

        // Validate query parameters
        const { spiderScanId, activeScanId } = validateStatusRequest(searchParams);

        // Get both scan statuses concurrently
        const [spiderStatus, activeStatus] = await Promise.all([
            zapApi.getSpiderStatus(spiderScanId),
            zapApi.getActiveScanStatus(activeScanId)
        ]);

        return NextResponse.json({
            spiderStatus,
            activeStatus,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        const errorMessage = error.message || 'Erro desconhecido';
        console.error('[ZAP][Status]', errorMessage);

        return NextResponse.json({
            error: 'Falha ao consultar status do scan.',
            message: errorMessage,
            timestamp: new Date().toISOString()
        }, { status: 400 });
    }
} 