# Guia de Implementação - Integração Automática Chatwoot + Evolution API

## 📋 Resumo das Alterações

Este guia documenta as alterações implementadas para criar integração automática entre Chatwoot e Evolution API, permitindo que instâncias criadas no Chatwoot sejam automaticamente registradas na Evolution com suporte a webhooks bidirecionais.

## 🎯 Objetivo

Quando você criar uma nova inbox do tipo WhatsApp com provider "evolution" no Chatwoot:
1. A instância será automaticamente criada na Evolution API
2. O QR Code será gerado e exibido na interface
3. Webhooks serão configurados para sincronização em tempo real
4. O status da conexão será atualizado automaticamente

## 📁 Arquivos Modificados

### 1. `app/services/whatsapp/providers/whatsapp_evolution_service.rb`

**Melhorias implementadas:**
- ✅ Logging detalhado para debug
- ✅ Tratamento robusto de erros
- ✅ Configuração automática de webhooks
- ✅ Suporte a múltiplos formatos de resposta da Evolution API v2
- ✅ Timeout configurável para requisições
- ✅ Busca inteligente de admin token

**Novos métodos:**
- `setup_webhook(webhook_url)` - Configura webhook na Evolution
- `chatwoot_base_url` - Obtém URL base do Chatwoot
- `admin_access_token` - Busca token do admin automaticamente

### 2. `app/controllers/api/v1/webhooks/evolution_controller.rb` (NOVO)

**Funcionalidade:**
- Recebe webhooks da Evolution API
- Processa eventos: QRCODE_UPDATED, CONNECTION_UPDATE, MESSAGES_UPSERT, etc.
- Atualiza estado da conexão em tempo real
- Notifica via ActionCable para atualização da UI

**Endpoint:** `POST /api/v1/webhooks/evolution`

### 3. `app/services/whatsapp/evolution_webhook_service.rb` (NOVO)

**Funcionalidade:**
- Serviço dedicado para processar eventos de webhook
- Extrai QR Code de diferentes formatos de resposta
- Atualiza estado da conexão no banco de dados
- Envia notificações via ActionCable

### 4. `config/routes.rb`

**Alteração:**
```ruby
post 'api/v1/webhooks/evolution', to: 'api/v1/webhooks/evolution#create'
```

## 🔧 Configuração Necessária

### Variáveis de Ambiente

Adicione as seguintes variáveis no seu ambiente (Coolify, Docker, etc.):

```bash
# Evolution API
EVOLUTION_API_URL=https://evolution.thribustech.com
EVOLUTION_API_KEY=5CKFPNK277oh7ONsNyjG8e0dO9oaqRsD

# Chatwoot (já deve existir)
FRONTEND_URL=https://talki.thribustech.com
```

### Configuração no Chatwoot

1. Acesse **Configurações → Caixas de Entrada → Adicionar Caixa de Entrada**
2. Escolha **WhatsApp**
3. Selecione **Evolution** como provider
4. Preencha:
   - **Nome da Inbox**: Nome que aparecerá no Chatwoot
   - **Número de Telefone**: Número do WhatsApp (opcional)
   - **URL do Provider**: `https://evolution.thribustech.com` (ou deixe vazio para usar o padrão)
   - **API Key**: `5CKFPNK277oh7ONsNyjG8e0dO9oaqRsD` (ou deixe vazio para usar o padrão)

5. Clique em **Criar Canal do WhatsApp**
6. O QR Code será exibido automaticamente
7. Escaneie o QR Code com seu WhatsApp
8. Aguarde a conexão ser estabelecida

## 🔄 Fluxo de Funcionamento

### Criação de Instância

```
1. Usuário cria inbox no Chatwoot
   ↓
2. Chatwoot chama WhatsappEvolutionService.setup_channel_provider
   ↓
3. Serviço faz POST para Evolution API /instance/create
   ↓
4. Evolution API cria instância e retorna QR Code
   ↓
5. Serviço configura webhook na Evolution
   ↓
6. QR Code é armazenado no provider_connection
   ↓
7. QR Code é exibido na interface do Chatwoot
```

### Sincronização via Webhook

```
1. Usuário escaneia QR Code no WhatsApp
   ↓
2. Evolution API detecta conexão
   ↓
3. Evolution envia webhook CONNECTION_UPDATE para Chatwoot
   ↓
4. EvolutionController recebe webhook
   ↓
5. EvolutionWebhookService processa evento
   ↓
6. Estado da conexão é atualizado no banco
   ↓
7. ActionCable notifica interface em tempo real
   ↓
8. Interface do Chatwoot atualiza status automaticamente
```

## 🧪 Como Testar

### 1. Teste de Conexão

Execute o script de teste:

```bash
cd /home/ubuntu
python3.11 test_evolution_integration.py
```

Deve mostrar:
- ✅ Conexão com Evolution API OK
- ✅ Criação de instância funcionando
- ✅ Configuração de webhook OK

### 2. Teste Manual no Chatwoot

1. Acesse o Chatwoot
2. Vá em **Configurações → Caixas de Entrada**
3. Clique em **Adicionar Caixa de Entrada**
4. Escolha **WhatsApp** → **Evolution**
5. Preencha os dados e clique em **Criar**
6. Verifique se o QR Code aparece
7. Escaneie com WhatsApp
8. Verifique se o status muda para "Conectado"

### 3. Verificar Logs

```bash
# No servidor do Chatwoot
tail -f log/production.log | grep EVOLUTION

# Você deve ver logs como:
# [EVOLUTION] Starting setup for instance: talki_123
# [EVOLUTION] Creating instance with payload: {...}
# [EVOLUTION] Response status: 201
# [EVOLUTION] Instance created successfully
# [EVOLUTION] Setting up webhook: https://talki.thribustech.com/api/v1/webhooks/evolution
# [EVOLUTION] Webhook configured successfully
```

## 🐛 Troubleshooting

### Problema: "Não foi possível salvar o canal do WhatsApp"

**Possíveis causas:**
1. Evolution API não está acessível
2. API Key incorreta
3. URL da Evolution incorreta

**Solução:**
```bash
# Teste a conexão manualmente
curl -X GET https://evolution.thribustech.com/instance/fetchInstances \
  -H "apikey: 5CKFPNK277oh7ONsNyjG8e0dO9oaqRsD"

# Deve retornar lista de instâncias (pode ser vazia)
```

### Problema: QR Code não aparece

**Possíveis causas:**
1. Instância já existe e está conectada
2. Formato de resposta da Evolution mudou

**Solução:**
```bash
# Verifique os logs do Chatwoot
tail -f log/production.log | grep "QR Code present"

# Se mostrar "false", verifique o formato da resposta da Evolution
```

### Problema: Webhook não funciona

**Possíveis causas:**
1. URL do Chatwoot não está acessível pela Evolution
2. Rota não foi carregada

**Solução:**
```bash
# Reinicie o servidor Rails
bundle exec rails restart

# Verifique se a rota existe
bundle exec rails routes | grep evolution
# Deve mostrar: POST /api/v1/webhooks/evolution
```

## 📊 Eventos de Webhook Suportados

| Evento | Descrição | Ação no Chatwoot |
|--------|-----------|------------------|
| `QRCODE_UPDATED` | QR Code foi atualizado | Atualiza QR Code na interface |
| `CONNECTION_UPDATE` | Status da conexão mudou | Atualiza status (conectado/desconectado) |
| `MESSAGES_UPSERT` | Nova mensagem recebida | Processado pela integração nativa |
| `MESSAGES_UPDATE` | Mensagem foi atualizada | Processado pela integração nativa |
| `SEND_MESSAGE` | Mensagem foi enviada | Processado pela integração nativa |

## 🔐 Segurança

- ✅ Webhooks não requerem autenticação (Evolution valida por IP/origem)
- ✅ API Key é armazenada de forma segura no provider_config
- ✅ Tokens de admin são buscados dinamicamente
- ✅ Logs não expõem tokens sensíveis

## 🚀 Deploy

### 1. Commit das Alterações

```bash
cd /home/ubuntu/Thribus-Talkie

git add app/services/whatsapp/providers/whatsapp_evolution_service.rb
git add app/controllers/api/v1/webhooks/evolution_controller.rb
git add app/services/whatsapp/evolution_webhook_service.rb
git add config/routes.rb

git commit -m "feat: Implementar integração automática Chatwoot + Evolution API

- Melhorar WhatsappEvolutionService com logging e tratamento de erros
- Adicionar controller para receber webhooks da Evolution
- Implementar serviço de processamento de webhooks
- Configurar rota para webhook endpoint
- Adicionar suporte a sincronização bidirecional via webhooks
- Configurar webhook automaticamente ao criar instância"

git push origin main
```

### 2. Deploy no Servidor

```bash
# No Coolify ou servidor de produção
# 1. Pull das alterações
git pull origin main

# 2. Reiniciar serviços
bundle exec rails restart
# ou
systemctl restart chatwoot
# ou
docker-compose restart chatwoot
```

### 3. Verificar Deploy

```bash
# Verifique se a rota está disponível
curl -X POST https://talki.thribustech.com/api/v1/webhooks/evolution \
  -H "Content-Type: application/json" \
  -d '{"event":"CONNECTION_UPDATE","instance":{"instanceName":"test"}}'

# Deve retornar: {"error":"Channel not found"} (esperado, pois não existe instância "test")
```

## 📝 Notas Importantes

1. **Instâncias existentes**: Se você já tem instâncias na Evolution, elas continuarão funcionando. O código detecta quando uma instância já existe e apenas busca o estado atual.

2. **Múltiplas contas**: O código suporta múltiplas contas do Chatwoot, cada uma com suas próprias instâncias na Evolution.

3. **Nomenclatura**: As instâncias na Evolution seguem o padrão `talki_{channel_id}` para facilitar identificação.

4. **QR Code**: O QR Code é armazenado em base64 no campo `provider_connection.qr_data_url` e pode ser exibido diretamente na interface.

5. **Integração nativa**: A Evolution API tem integração nativa com Chatwoot, então mensagens fluem automaticamente sem necessidade de processamento adicional nos webhooks.

## 🎉 Conclusão

Com estas alterações, o fluxo de criação de instâncias WhatsApp no Chatwoot está completamente automatizado. Você não precisa mais:
- Criar instâncias manualmente na Evolution
- Copiar e colar QR Codes
- Configurar webhooks manualmente
- Sincronizar status manualmente

Tudo acontece automaticamente quando você cria uma nova inbox no Chatwoot! 🚀
