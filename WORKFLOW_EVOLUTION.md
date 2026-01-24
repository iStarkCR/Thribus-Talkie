# Workflow de Integração Evolution API + Chatwoot

## 🎯 Objetivo

Replicar o fluxo do **Fazer.ai** onde a instância é criada primeiro, depois um botão "Conectar dispositivo" aparece, e só quando clicado o QR code é exibido.

---

## ✅ Implementação Atual

### 1️⃣ Criação Automática de Instância

**Quando**: Usuário cria inbox WhatsApp no Chatwoot

**O que acontece**:
- `after_commit` callback dispara `setup_channel_provider_if_supported`
- Método `setup_channel_provider` cria instância na Evolution API
- `provider_connection` é atualizado com:
  ```json
  {
    "connection": "close",
    "instance_id": "6c1fa9e4-05d5-4588-9030-b81e65ae4a8f",
    "qr_data_url": null,
    "updated_at": 1769290703
  }
  ```

**Resultado**: Instância criada, mas **SEM QR code**.

---

### 2️⃣ Busca de QR Code Sob Demanda

**Quando**: Usuário clica em "Conectar dispositivo"

**Como chamar**:
```ruby
# No controller ou service que responde ao clique do botão
channel = Channel::Whatsapp.find(params[:id])
service = Whatsapp::Providers::WhatsappEvolutionService.new(whatsapp_channel: channel)
service.fetch_qr_code
```

**O que acontece**:
1. Chama `GET /instance/connect/{instance_name}` para iniciar conexão
2. Chama `GET /instance/connectionState/{instance_name}` para buscar QR
3. Atualiza `provider_connection` com QR code:
   ```json
   {
     "connection": "connecting",
     "instance_id": "6c1fa9e4-05d5-4588-9030-b81e65ae4a8f",
     "qr_data_url": "data:image/png;base64,iVBORw0KGgoAAAANS...",
     "updated_at": 1769290750
   }
   ```

**Resultado**: QR code disponível para exibição.

---

## 🔧 Métodos Principais

### `setup_channel_provider`
- **Propósito**: Criar instância na Evolution API
- **Parâmetros**: Nenhum
- **Retorno**: `true` se sucesso, `raise` se erro
- **Side effects**: 
  - Cria instância na Evolution
  - Configura webhook
  - Salva `instance_id` no `provider_connection`
  - **NÃO busca QR code**

### `fetch_qr_code`
- **Propósito**: Buscar QR code de instância existente
- **Parâmetros**: Nenhum
- **Retorno**: `true` se sucesso, `false` se erro
- **Side effects**:
  - Conecta instância (se não conectada)
  - Busca QR code
  - Atualiza `provider_connection` com QR

### `update_connection_state(data, fetch_qr: false)`
- **Propósito**: Atualizar estado da conexão no banco
- **Parâmetros**:
  - `data`: Hash com resposta da Evolution API
  - `fetch_qr`: Boolean, se deve extrair QR code do payload
- **Retorno**: Nenhum
- **Side effects**: Atualiza `provider_connection`

---

## 📋 TODO: Frontend

Para completar o workflow, o frontend precisa:

1. **Detectar estado da instância**:
   ```javascript
   if (channel.provider_connection.instance_id && !channel.provider_connection.qr_data_url) {
     // Mostrar botão "Conectar dispositivo"
   }
   ```

2. **Chamar endpoint ao clicar**:
   ```javascript
   POST /api/v1/accounts/:account_id/channels/:id/fetch_qr_code
   ```

3. **Exibir QR code quando disponível**:
   ```javascript
   if (channel.provider_connection.qr_data_url) {
     // Mostrar QR code
   }
   ```

---

## 🧪 Testes

### Teste 1: Criação de Instância
```ruby
account = Account.first
channel = Channel::Whatsapp.create!(
  account_id: account.id,
  phone_number: "+5585999555444",
  provider: "evolution",
  provider_config: {
    "provider_url" => "https://evolution.thribustech.com",
    "api_key" => "5CKFPNK277oh7ONsNyjG8e0dO9oaqRsD"
  }
)

channel.reload
puts channel.provider_connection.inspect
# Esperado: { "connection" => "close", "instance_id" => "...", "qr_data_url" => nil }
```

### Teste 2: Busca de QR Code
```ruby
channel = Channel::Whatsapp.last
service = Whatsapp::Providers::WhatsappEvolutionService.new(whatsapp_channel: channel)
service.fetch_qr_code

channel.reload
puts channel.provider_connection['qr_data_url'].present?
# Esperado: true
```

---

## 🚀 Commits Relacionados

- `68d92a4` - Corrigir query admin_access_token para usar account_users.role
- `67f5d88` - Extrair string do access_token para chatwootToken
- `78ba628` - Separar criação de instância da busca de QR code (workflow Fazer.ai)
