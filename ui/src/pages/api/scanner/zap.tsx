import axios from 'axios';

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória.' });
    }
    console.log(`Iniciando scan com ZAP para a URL: ${url}`);

    const baseURL = 'http://localhost:8080';
    console.log(`Conectando ao ZAP na URL: ${baseURL}`);
    const zap = axios.create({ baseURL });


    try {
        // 1. Spider scan
        const spider = await zap.get(`/JSON/spider/action/scan/`, {
            params: { url },
        });

        const scanId = spider.data.scan;
        console.log(`Spider iniciado. ID: ${scanId}`);

        // 2. Aguardar spider terminar
        let spiderStatus = '0';
        while (spiderStatus !== '100') {
            await new Promise(r => setTimeout(r, 1000));
            const statusRes = await zap.get(`/JSON/spider/view/status/`, {
                params: { scanId },
            });
            spiderStatus = statusRes.data.status;
            console.log(`Spider status: ${spiderStatus}%`);
        }

        // 3. Ative o scan ativo
        const active = await zap.get(`/JSON/ascan/action/scan/`, {
            params: {
                url,
                recurse: true,
            },
        });

        const activeId = active.data.scan;
        // 4. Aguardar scan ativo terminar
        let activeStatus = '0';
        while (activeStatus !== '100') {
            await new Promise(r => setTimeout(r, 1000));
            const statusRes = await zap.get(`/JSON/ascan/view/status/`, {
                params: { scanId: activeId },
            });
            activeStatus = statusRes.data.status;
            console.log(`Scan Ativo status: ${activeStatus}%`);
        }

        // 5. Pegar os alertas encontrados
        const alertsRes = await zap.get(`/JSON/core/view/alerts/`, {
            params: { baseurl: url },
        });

        res.status(200).json({
            message: 'Scan finalizado com sucesso.',
            alerts: alertsRes.data.alerts,
        });
    } catch (err) {
        if (err instanceof Error) {
            console.error('[ZAP][Erro]', err.message);
        } else {
            console.error('[ZAP][Erro]', err);
        }
        res.status(500).json({ error: 'Falha ao executar o scan com ZAP.' });
    }
}
