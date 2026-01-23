# Guia de Instalação e Configuração da Evolution API

## Visão Geral

Este guia descreve como integrar a **Evolution API** com o **Chatwoot** para permitir conexões WhatsApp via QR Code diretamente na interface do Chatwoot.

## Arquitetura da Solução

A Evolution API possui integração **nativa** com o Chatwoot. O fluxo funciona da seguinte forma:

```
Cliente acessa Chatwoot
    ↓
Evolution API cria automaticamente a inbox no Chatwoot via API
    ↓
Evolution API gera QR Code
    ↓
Cliente escaneia QR Code no WhatsApp
    ↓
Mensagens fluem automaticamente: WhatsApp ↔ Evolution API ↔ Chatwoot
```

## Pré-requisitos

Antes de começar, você precisa ter:

- Docker e Docker Compose instalados
- Chatwoot já rodando
- Acesso ao Coolify ou outro gerenciador de containers
- Token de API de admin do Chatwoot
- Account ID do Chatwoot

## Passo 1: Obter Credenciais do Chatwoot

### 1.1 Obter o Account ID

Acesse o Chatwoot e verifique a URL. O Account ID aparece na URL após `/app/accounts/`:

```
https://talki.thribustech.com/app/accounts/1/dashboard
                                            ↑
                                      Account ID = 1
```

### 1.2 Obter o Token de API

No Chatwoot, vá em:

**Configurações → Perfil → Access Token**

Copie o token de API do usuário administrador.

## Passo 2: Configurar Variáveis de Ambiente

### 2.1 Gerar API Key para Evolution

Execute o comando abaixo para gerar uma API key segura:

```bash
openssl rand -hex 32
```

Exemplo de saída:
```
5c14e61c3bb074ad50f9bdfccd66622c39a37f4b7b9725ecfb682f2cfd0cf947
```

### 2.2 Adicionar Variáveis no Coolify

No Coolify, adicione as seguintes variáveis de ambiente no serviço do Chatwoot:

```bash
# Evolution API Configuration
EVOLUTION_API_URL=http://evolution-api:8080
EVOLUTION_API_KEY=5c14e61c3bb074ad50f9bdfccd66622c39a37f4b7b9725ecfb682f2cfd0cf947
EVOLUTION_CHATWOOT_ACCOUNT_ID=1
EVOLUTION_CHATWOOT_TOKEN=seu_token_de_api_aqui

# Postgres credentials (use as mesmas do Chatwoot)
POSTGRES_USERNAME=HCDLgQ5XcHEauAqM
POSTGRES_PASSWORD=YVxmbwxjokSn84MP8K9GBQ0SpHPrEeKw
```

## Passo 3: Instalar Evolution API no Coolify

### 3.1 Criar Novo Serviço

No Coolify:

1. Vá em **Services → Add Service**
2. Escolha **Docker Compose**
3. Cole o conteúdo do arquivo `docker-compose.evolution.yaml`

### 3.2 Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no serviço Evolution API:

```bash
EVOLUTION_API_KEY=5c14e61c3bb074ad50f9bdfccd66622c39a37f4b7b9725ecfb682f2cfd0cf947
POSTGRES_USERNAME=HCDLgQ5XcHEauAqM
POSTGRES_PASSWORD=YVxmbwxjokSn84MP8K9GBQ0SpHPrEeKw
```

### 3.3 Fazer Deploy

Clique em **Deploy** e aguarde a Evolution API inicializar.

## Passo 4: Criar Instância WhatsApp via API

Após a Evolution API estar rodando, você pode criar uma instância WhatsApp que se conecta automaticamente ao Chatwoot.

### 4.1 Criar Instância com Integração Chatwoot

Faça uma requisição POST para a Evolution API:

```bash
curl -X POST http://evolution-api:8080/instance/create \
  -H "apikey: 5c14e61c3bb074ad50f9bdfccd66622c39a37f4b7b9725ecfb682f2cfd0cf947" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "whatsapp_cliente",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS",
    "chatwootAccountId": "1",
    "chatwootToken": "seu_token_de_api_aqui",
    "chatwootUrl": "https://talki.thribustech.com",
    "chatwootSignMsg": true,
    "chatwootReopenConversation": true,
    "chatwootConversationPending": false,
    "chatwootImportContacts": true,
    "chatwootNameInbox": "WhatsApp - Cliente",
    "chatwootMergeBrazilContacts": true,
    "chatwootImportMessages": false,
    "chatwootOrganization": "Thribus",
    "chatwootLogo": "https://talki.thribustech.com/logo.png"
  }'
```

### 4.2 Obter QR Code

A resposta da requisição acima incluirá um campo `qrcode` com o QR Code em base64. Você pode:

1. Decodificar o base64 e exibir a imagem
2. Ou fazer uma nova requisição para obter o QR Code:

```bash
curl -X GET http://evolution-api:8080/instance/connect/whatsapp_cliente \
  -H "apikey: 5c14e61c3bb074ad50f9bdfccd66622c39a37f4b7b9725ecfb682f2cfd0cf947"
```

### 4.3 Escanear QR Code

O cliente deve escanear o QR Code com o WhatsApp:

1. Abrir WhatsApp no celular
2. Ir em **Configurações → Aparelhos conectados**
3. Tocar em **Conectar um aparelho**
4. Escanear o QR Code exibido

## Passo 5: Verificar Integração

Após escanear o QR Code:

1. Acesse o Chatwoot
2. Vá em **Configurações → Caixas de Entrada**
3. Você verá uma nova inbox chamada "WhatsApp - Cliente" criada automaticamente
4. Teste enviando uma mensagem para o número do WhatsApp conectado
5. A mensagem deve aparecer no Chatwoot

## Endpoints Úteis da Evolution API

### Listar Instâncias

```bash
curl -X GET http://evolution-api:8080/instance/fetchInstances \
  -H "apikey: sua_api_key_aqui"
```

### Obter Status da Instância

```bash
curl -X GET http://evolution-api:8080/instance/connectionState/whatsapp_cliente \
  -H "apikey: sua_api_key_aqui"
```

### Desconectar Instância

```bash
curl -X DELETE http://evolution-api:8080/instance/logout/whatsapp_cliente \
  -H "apikey: sua_api_key_aqui"
```

### Deletar Instância

```bash
curl -X DELETE http://evolution-api:8080/instance/delete/whatsapp_cliente \
  -H "apikey: sua_api_key_aqui"
```

## Parâmetros da Integração Chatwoot

Ao criar uma instância com integração Chatwoot, você pode configurar os seguintes parâmetros:

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `chatwootAccountId` | string | ID da conta no Chatwoot |
| `chatwootToken` | string | Token de API do usuário admin |
| `chatwootUrl` | string | URL do Chatwoot (sem `/` no final) |
| `chatwootSignMsg` | boolean | Adiciona assinatura do atendente nas mensagens |
| `chatwootReopenConversation` | boolean | Reabre a mesma conversa ou cria nova |
| `chatwootConversationPending` | boolean | Inicia conversas como pendentes |
| `chatwootImportContacts` | boolean | Importa contatos do WhatsApp |
| `chatwootNameInbox` | string | Nome customizado da inbox |
| `chatwootMergeBrazilContacts` | boolean | Mescla contatos brasileiros com 9º dígito |
| `chatwootImportMessages` | boolean | Importa mensagens antigas do WhatsApp |
| `chatwootDaysLimitImportMessages` | number | Limite de dias para importar mensagens antigas |
| `chatwootOrganization` | string | Nome da organização |
| `chatwootLogo` | string | URL do logo da organização |

## Solução de Problemas

### Erro: "Unauthorized"

Verifique se a API key está correta e configurada tanto na Evolution API quanto nas requisições.

### Erro: "Failed to create inbox in Chatwoot"

Verifique se:
- O token de API do Chatwoot está correto
- O usuário do token é administrador
- A URL do Chatwoot está acessível pela Evolution API
- Não há `/` no final da URL do Chatwoot

### QR Code não aparece

Verifique se:
- O parâmetro `qrcode: true` está na requisição
- A instância foi criada com sucesso
- A Evolution API está rodando corretamente

### Mensagens não chegam no Chatwoot

Verifique se:
- A instância está conectada (status `open`)
- A inbox foi criada no Chatwoot
- O webhook está configurado corretamente

## Próximos Passos

Após a instalação e configuração, você pode:

1. Criar uma interface no Chatwoot para gerenciar instâncias
2. Adicionar botão para criar novas instâncias
3. Exibir QR Code diretamente na interface do Chatwoot
4. Monitorar status das conexões

## Referências

- [Documentação Evolution API](https://doc.evolution-api.com/v2/en/get-started/introduction)
- [Integração Chatwoot](https://doc.evolution-api.com/v2/en/integrations/chatwoot)
- [Repositório GitHub](https://github.com/EvolutionAPI/evolution-api)
