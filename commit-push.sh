#!/bin/bash

# Vai para a pasta onde o script está
cd "$(dirname "$0")"

# Verifica se é um repositório Git
if [ ! -d ".git" ]; then
    echo "Inicializando repositório Git..."
    git init
    git branch -M main
    git remote add origin https://github.com/Maviael918/DME.git
else
    echo "Repositório Git já está inicializado."
fi

# Mostra o status
echo "--------------------"
git status
echo "--------------------"

# Solicita a mensagem do commit
read -p "Digite a mensagem do commit: " mensagem

# Adiciona todas as mudanças
git add .

# Comita com a mensagem
git commit -m "$mensagem"

# Envia para o GitHub
git push -u origin main
