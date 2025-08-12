import { NextRequest } from 'next/server';
import { zapApi } from '../../../../../lib/zap-client';

// Input validation for SSE endpoint
const validateStreamRequest = (searchParams: URLSearchParams) => {
    const spiderScanId = searchParams.get('spiderScanId');
    const activeScanId = searchParams.get('activeScanId');

    if (!spiderScanId || !activeScanId) {
        throw new Error('Parâmetros "spiderScanId" e "activeScanId" são obrigatórios.');
    }

    return { spiderScanId, activeScanId };
};

// SSE endpoint for real-time scan status updates
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const { spiderScanId, activeScanId } = validateStreamRequest(searchParams);

        // Set SSE headers
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                let isComplete = false;

                const sendEvent = (data: any) => {
                    const event = `data: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(encoder.encode(event));
                };

                const sendError = (error: string) => {
                    const event = `data: ${JSON.stringify({ error, timestamp: new Date().toISOString() })}\n\n`;
                    controller.enqueue(encoder.encode(event));
                };

                const sendComplete = () => {
                    const event = `data: ${JSON.stringify({
                        type: 'complete',
                        timestamp: new Date().toISOString()
                    })}\n\n`;
                    controller.enqueue(encoder.encode(event));
                    controller.close();
                };

                // Send initial connection event
                sendEvent({
                    type: 'connected',
                    message: 'SSE connection established',
                    timestamp: new Date().toISOString()
                });

                // Start monitoring loop
                const monitorInterval = setInterval(async () => {
                    try {
                        // Get both scan statuses concurrently
                        const [spiderStatus, activeStatus] = await Promise.all([
                            zapApi.getSpiderStatus(spiderScanId),
                            zapApi.getActiveScanStatus(activeScanId)
                        ]);

                        const progress = {
                            type: 'progress',
                            spiderStatus: Number(spiderStatus),
                            activeStatus: Number(activeStatus),
                            timestamp: new Date().toISOString()
                        };

                        sendEvent(progress);

                        // Check if both scans are complete
                        if (Number(spiderStatus) === 100 && Number(activeStatus) === 100) {
                            isComplete = true;
                            clearInterval(monitorInterval);
                            sendComplete();
                        }

                    } catch (error: any) {
                        console.error('[ZAP][Status Stream]', error.message);
                        sendError(`Failed to fetch scan status: ${error.message}`);
                        clearInterval(monitorInterval);
                        controller.close();
                    }
                }, 1000); // Update every second

                // Handle client disconnect
                request.signal.addEventListener('abort', () => {
                    clearInterval(monitorInterval);
                    controller.close();
                });

                // Cleanup on error or completion
                if (isComplete) {
                    clearInterval(monitorInterval);
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control'
            }
        });

    } catch (error: any) {
        const errorMessage = error.message || 'Erro desconhecido';
        console.error('[ZAP][Status Stream]', errorMessage);

        return new Response(
            `data: ${JSON.stringify({
                error: 'Falha ao estabelecer stream de status.',
                message: errorMessage,
                timestamp: new Date().toISOString()
            })}\n\n`,
            {
                status: 400,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache'
                }
            }
        );
    }
} 