#!/bin/bash

# Vai para a pasta onde o script está
cd "$(dirname "$0")"

# Inicializa Git se ainda não estiver inicializado
if [ ! -d ".git" ]; then
    echo "Inicializando repositório Git..."
    git init
    git branch -M main
    git remote add origin https://github.com/Maviael918/DME.git
fi

# Pergunta a mensagem de commit no terminal
read -p "Digite a mensagem do commit: " mensagem

# Adiciona todos os arquivos modificados
git add .

# Realiza o commit com a mensagem digitada
git commit -m "$mensagem"

# Faz push para o repositório
git push -u origin main
