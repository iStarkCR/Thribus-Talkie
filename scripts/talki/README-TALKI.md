# Integração Kanban para Talki

Este script adiciona funcionalidades de Kanban e Conexões diretamente na interface do Talki (baseado em Chatwoot).

## Funcionalidades

- **Menu Lateral**: Adiciona botões para "Kanban" e "Conexões".
- **Widget Flutuante**: Atalho rápido nas conversas.
- **Integração de Autenticação**: Repassa os tokens de sessão para o iframe do Kanban.

## Como Instalar

1. Acesse a página de configuração do seu Talki:
   `https://talki.thribustech.com/super_admin/app_config?config=internal`
2. Localize o campo **"Custom Dashboard Script"** ou **"Dashboard Script"**.
3. Copie todo o conteúdo do arquivo `kanban-widget-talki.js`.
4. Cole no campo e clique em **Salvar**.
5. Recarregue a página do dashboard (F5).

## Configurações de Backend

Certifique-se de que o seu `docker-compose.yml` ou variáveis de ambiente do backend estão configuradas corretamente:

```yaml
environment:
  KANBANCW_URL: https://talki.kanban.thribustech.com
  CHATWOOT_API_URL: https://talki.thribustech.com
  CORS_ORIGIN: https://talki.kanban.thribustech.com,https://talki.thribustech.com
```

## Troubleshooting

Se o script não aparecer:
1. Verifique se o script foi salvo corretamente no Super Admin.
2. Abra o console do navegador (F12) e procure por mensagens iniciadas com `[Talki Kanban]`.
3. Limpe o cache do navegador e tente novamente.
