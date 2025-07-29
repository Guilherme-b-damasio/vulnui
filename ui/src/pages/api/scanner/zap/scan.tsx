import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

const baseURL = 'http://localhost:8080';
const zap = axios.create({ baseURL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória.' });
    }

    try {
        // Inicia o spider scan
        const spider = await zap.get('/JSON/spider/action/scan/', { params: { url } });
        const spiderScanId = spider.data.scan;

        // Inicia o active scan
        const active = await zap.get('/JSON/ascan/action/scan/', { params: { url, recurse: true } });
        const activeScanId = active.data.scan;

        // Retorna os scanIds para o frontend consultar depois
        res.status(200).json({ spiderScanId, activeScanId });
    } catch (err) {
        console.error('[ZAP][Erro]', err);
        res.status(500).json({ error: 'Falha ao iniciar o scan com ZAP.' });
    }
}
