import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

const baseURL = 'http://localhost:8080';
const zap = axios.create({ baseURL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido. Use GET.' });
    }

    const { spiderScanId, activeScanId } = req.query;

    if (!spiderScanId || !activeScanId) {
        return res.status(400).json({ error: 'Parâmetros spiderScanId e activeScanId são obrigatórios.' });
    }

    try {
        const spiderStatusRes = await zap.get('/JSON/spider/view/status/', { params: { scanId: spiderScanId } });
        const activeStatusRes = await zap.get('/JSON/ascan/view/status/', { params: { scanId: activeScanId } });

        res.status(200).json({
            spiderStatus: spiderStatusRes.data.status,
            activeStatus: activeStatusRes.data.status,
        });
    } catch (err) {
        console.error('[ZAP][Erro]', err);
        res.status(500).json({ error: 'Falha ao consultar status do scan.' });
    }
}
