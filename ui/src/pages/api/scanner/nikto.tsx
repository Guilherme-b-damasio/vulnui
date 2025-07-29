import { spawn } from 'child_process';
import { mkdirSync, createWriteStream } from 'fs';
import { join } from 'path';

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória.' });
    }

    const outputDir = join(process.cwd(), 'relatorios');
    mkdirSync(outputDir, { recursive: true });
    const reportPath = join(outputDir, 'nikto_report.txt');

    const nikto = spawn('nikto', ['-h', url, '-output', reportPath]);

    const outputStream = createWriteStream(reportPath, { flags: 'a' });

    nikto.stdout.on('data', (data) => {
        outputStream.write(data);
    });

    nikto.stderr.on('data', (data) => {
        console.error(`[Nikto][stderr]: ${data}`);
        outputStream.write(data);
    });

    nikto.on('close', (code) => {
        outputStream.end();

        if (code === 0) {
            res.status(200).json({ message: 'Scan finalizado com sucesso.', reportPath });
        } else {
            res.status(500).json({ error: `Erro ao executar Nikto. Código: ${code}` });
        }
    });
}
