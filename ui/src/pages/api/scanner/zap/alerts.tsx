import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

const zap = axios.create({ baseURL: 'http://host.docker.internal:8080' }); // ajuste para Docker no Windows

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido. Use GET.' });
    }

    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Parâmetro "url" é obrigatório na query.' });
    }

    try {
        const response = await zap.get('/JSON/core/view/alerts/', {
            params: {
                baseurl: url,
                start: 0,
                count: 1000
            }
        });

        // Pega apenas os campos mais importantes e ignora riscos informacionais
        interface ZapAlert {
            alert: string;
            risk: string;
            confidence: string;
            url: string;
            evidence: string;
            description: string;
            solution: string;
            [key: string]: any; // For any additional fields from ZAP
        }

        interface ZapAlertsResponse {
            alerts: ZapAlert[];
            [key: string]: any;
        }

        const filteredAlerts = ((response.data as ZapAlertsResponse).alerts || []).filter(
            (alert: ZapAlert) => alert.risk !== 'Informational'
        ).map((alert: ZapAlert) => ({
            alert: alert.alert,
            risk: alert.risk,
            confidence: alert.confidence,
            url: alert.url,
            evidence: alert.evidence,
            description: alert.description,
            solution: alert.solution
        }));

        res.status(200).json({ alerts: filteredAlerts });

    } catch (err: any) {
        console.error('[ZAP][Erro ao buscar alertas]', err.response?.data || err.message);
        res.status(500).json({ error: 'Falha ao obter alertas do ZAP.' });
    }
}
