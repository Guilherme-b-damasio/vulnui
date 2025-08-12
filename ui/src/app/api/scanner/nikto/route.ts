import { NextRequest, NextResponse } from 'next/server';

// Input validation schema
const validateNiktoRequest = (body: any) => {
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
        const url = validateNiktoRequest(body);

        // TODO: Implement actual Nikto scanning logic
        // For now, return a mock response
        const mockResult = {
            url: url,
            scanId: `nikto_${Date.now()}`,
            status: 'completed',
            vulnerabilities: [
                {
                    id: 'NIKTO-001',
                    description: 'Server discloses version information',
                    severity: 'Medium',
                    url: url,
                    evidence: 'Server: Apache/2.4.41 (Ubuntu)'
                }
            ],
            timestamp: new Date().toISOString(),
            message: 'Nikto scan completed successfully'
        };

        return NextResponse.json(mockResult);

    } catch (error: any) {
        const errorMessage = error.message || 'Erro desconhecido';
        console.error('[Nikto][Scan]', errorMessage);

        return NextResponse.json({
            error: 'Falha ao executar scan com Nikto.',
            message: errorMessage,
            timestamp: new Date().toISOString()
        }, { status: 400 });
    }
} 