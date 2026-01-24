#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Deploy - Integração Automática Chatwoot + Evolution    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "config/routes.rb" ]; then
    echo -e "${RED}✗ Erro: Execute este script no diretório raiz do Thribus-Talkie${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/5] Verificando arquivos modificados...${NC}"
git status --short

echo ""
echo -e "${YELLOW}[2/5] Adicionando arquivos ao Git...${NC}"
git add app/services/whatsapp/providers/whatsapp_evolution_service.rb
git add app/controllers/api/v1/webhooks/evolution_controller.rb
git add app/services/whatsapp/evolution_webhook_service.rb
git add config/routes.rb
git add GUIA_IMPLEMENTACAO.md
git add COMMIT_SUMMARY.md
git add RESUMO_IMPLEMENTACAO.md
git add deploy.sh

echo -e "${GREEN}✓ Arquivos adicionados${NC}"

echo ""
echo -e "${YELLOW}[3/5] Fazendo commit...${NC}"
git commit -m "feat: Implementar integração automática Chatwoot + Evolution API

- Melhorar WhatsappEvolutionService com logging detalhado e tratamento de erros
- Adicionar EvolutionController para receber webhooks da Evolution API
- Implementar EvolutionWebhookService para processar eventos
- Configurar webhook automaticamente ao criar instância
- Adicionar rota /api/v1/webhooks/evolution
- Suportar sincronização bidirecional via webhooks
- Adicionar documentação completa

Funcionalidades:
- Criação automática de instâncias na Evolution ao criar inbox no Chatwoot
- Geração e exibição de QR Code automaticamente
- Configuração automática de webhooks
- Sincronização de status em tempo real
- Notificações via ActionCable para atualização da UI
- Logging detalhado para troubleshooting

Testado com Evolution API v2"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Commit realizado com sucesso${NC}"
else
    echo -e "${RED}✗ Erro ao fazer commit${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[4/5] Fazendo push para o GitHub...${NC}"
git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Push realizado com sucesso${NC}"
else
    echo -e "${RED}✗ Erro ao fazer push${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[5/5] Resumo do Deploy${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Arquivos commitados e enviados para o GitHub${NC}"
echo ""
echo "Próximos passos no servidor de produção:"
echo "  1. git pull origin main"
echo "  2. bundle exec rails restart (ou systemctl restart chatwoot)"
echo "  3. Testar criação de inbox no Chatwoot"
echo ""
echo "Para mais detalhes, consulte:"
echo "  - RESUMO_IMPLEMENTACAO.md"
echo "  - GUIA_IMPLEMENTACAO.md"
echo ""
echo -e "${GREEN}Deploy concluído com sucesso! 🚀${NC}"
