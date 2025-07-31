from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import uuid

app = Flask(__name__)
CORS(app)

@app.route('/scan', methods=['POST'])
def scan():
    data = request.get_json()
    url = data.get('url')
    if not url:
        return jsonify({'error': 'URL é obrigatória.'}), 400

    # Gera um nome único para o arquivo de saída
    output_file = f"/app/relatorios/nikto_report_{uuid.uuid4().hex}.txt"

    # Executa o Nikto
    try:
        cmd = ['nikto', '-h', url, '-output', output_file]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

        if result.returncode != 0:
            return jsonify({'error': 'Erro ao executar Nikto', 'details': result.stderr}), 500

        # Lê o conteúdo do relatório
        with open(output_file, 'r') as f:
            report = f.read()

        # Opcional: deletar o arquivo após leitura
        os.remove(output_file)

        return jsonify({'message': 'Scan finalizado com sucesso.', 'report': report})

    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Timeout ao executar Nikto'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
