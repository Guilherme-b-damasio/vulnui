# Usa imagem base leve do Node
FROM node:18

# Define diretório de trabalho
WORKDIR /app

# Copia arquivos de dependência
COPY package.json package-lock.json* ./

# Instala dependências
RUN npm install

# Copia todo o restante do código
COPY . .

# Expõe a porta padrão
EXPOSE 3000

# Comando de desenvolvimento (com hot reload)
CMD ["npm", "run", "dev"]
