class Whatsapp::Providers::WhatsappEvolutionService < Whatsapp::Providers::BaseService
  class ProviderUnavailableError < StandardError; end

  # Valores padrão baseados nas configurações do usuário
  DEFAULT_URL = ENV.fetch('EVOLUTION_API_URL', 'https://evolution.thribustech.com')
  DEFAULT_API_KEY = ENV.fetch('EVOLUTION_API_KEY', '5CKFPNK277oh7ONsNyjG8e0dO9oaqRsD')

  def setup_channel_provider
    Rails.logger.info "[EVOLUTION] Starting setup for instance: #{instance_name}"
    
    # Configura o webhook antes de criar a instância
    webhook_url = "#{chatwoot_base_url}/api/v1/webhooks/evolution"
    
    # Tenta criar a instância na Evolution API v2
    payload = {
      instanceName: instance_name,
      token: instance_token,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      chatwootAccountId: whatsapp_channel.account_id.to_s,
      chatwootToken: admin_access_token,
      chatwootUrl: chatwoot_base_url,
      chatwootSignMsg: true,
      chatwootReopenConversation: true,
      chatwootConversationPending: false,
      chatwootImportContacts: true,
      chatwootNameInbox: whatsapp_channel.inbox&.name || instance_name,
      chatwootMergeBrazilContacts: true,
      chatwootImportMessages: false
    }
    
    Rails.logger.info "[EVOLUTION] Creating instance with payload: #{payload.except(:chatwootToken).to_json}"
    
    response = HTTParty.post(
      "#{provider_url}/instance/create",
      headers: api_headers,
      body: payload.to_json,
      timeout: 30
    )

    Rails.logger.info "[EVOLUTION] Response status: #{response.code}"
    Rails.logger.info "[EVOLUTION] Response body: #{response.body}"

    if response.success?
      data = response.parsed_response
      Rails.logger.info "[EVOLUTION] Instance created successfully"
      
      # Configura o webhook após criar a instância
      setup_webhook(webhook_url)
      
      update_connection_state(data)
      return true
    elsif response.code == 403 || response.code == 409 || (response.parsed_response.is_a?(Hash) && response.parsed_response['message']&.include?('already exists'))
      # Se a instância já existe, busca o estado atual (QR Code ou Conectado)
      Rails.logger.info "[EVOLUTION] Instance already exists, fetching current state"
      setup_webhook(webhook_url)
      return fetch_connection_state
    end

    error_message = response.parsed_response.is_a?(Hash) ? response.parsed_response['message'] : response.body
    Rails.logger.error "[EVOLUTION] Setup failed: #{error_message}"
    raise ProviderUnavailableError, "Failed to create Evolution instance: #{error_message}"
  rescue StandardError => e
    Rails.logger.error "[EVOLUTION] Exception during setup: #{e.class} - #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    raise
  end

  def disconnect_channel_provider
    response = HTTParty.delete(
      "#{provider_url}/instance/logout/#{instance_name}",
      headers: api_headers
    )
    response.success?
  end

  def send_message(recipient_id, message)
    @message = message
    payload = {
      number: recipient_id.delete('+'),
      options: {
        delay: 1200,
        presence: 'composing'
      }
    }

    if message.attachments.present?
      attachment = message.attachments.first
      payload[:mediaMessage] = {
        mediatype: attachment.file_type,
        caption: message.content,
        media: attachment.file_url
      }
      endpoint = "/message/sendMedia/#{instance_name}"
    else
      payload[:textMessage] = { text: message.content }
      endpoint = "/message/sendText/#{instance_name}"
    end

    response = HTTParty.post(
      "#{provider_url}#{endpoint}",
      headers: api_headers,
      body: payload.to_json
    )

    response.success? ? response.parsed_response.dig('key', 'id') : nil
  end

  def api_headers
    { 
      'apikey' => api_key,
      'Content-Type' => 'application/json'
    }
  end

  def validate_provider_config?
    Rails.logger.info "[EVOLUTION] Validating provider config for URL: #{provider_url}"
    response = HTTParty.get(
      "#{provider_url}/instance/fetchInstances",
      headers: api_headers,
      timeout: 10
    )
    
    if response.success?
      Rails.logger.info "[EVOLUTION] Provider config is valid"
      true
    else
      Rails.logger.error "[EVOLUTION] Provider config validation failed: #{response.code} - #{response.body}"
      false
    end
  rescue StandardError => e
    Rails.logger.error "[EVOLUTION] Exception validating provider config: #{e.message}"
    false
  end

  # Evolution API não suporta templates de mensagens como WhatsApp Cloud/360Dialog
  # Este método é chamado pelo Chatwoot mas não faz nada para Evolution
  def sync_templates
    Rails.logger.info "[EVOLUTION] sync_templates called - Evolution API does not support message templates"
    # Marca como atualizado para evitar tentativas repetidas
    whatsapp_channel.mark_message_templates_updated
  end

  def send_template(phone_number, template_info)
    Rails.logger.info "[EVOLUTION] send_template called - Evolution API does not support message templates"
    # Evolution não suporta envio de templates, retorna nil
    nil
  end

  private

  def provider_url
    url = whatsapp_channel.provider_config['provider_url'].presence || DEFAULT_URL
    url.delete_suffix('/')
  end

  def api_key
    whatsapp_channel.provider_config['api_key'].presence || DEFAULT_API_KEY
  end

  def instance_name
    "talki_#{whatsapp_channel.id}"
  end

  def instance_token
    "token_#{whatsapp_channel.id}"
  end

  def fetch_connection_state
    response = HTTParty.get(
      "#{provider_url}/instance/connectionState/#{instance_name}",
      headers: api_headers
    )

    if response.success?
      update_connection_state(response.parsed_response)
      return true
    end
    false
  end

  def update_connection_state(data)
    # Mapeia o status da Evolution API v2 para o Chatwoot
    # Suporta diferentes formatos de resposta da v2
    instance_data = data['instance'] || data
    connection_status = instance_data['state'] || 'close'
    
    # Busca o QR Code se disponível
    qr_data = data['qrcode'] || data['qr'] || {}
    qr_code = qr_data['base64'] || qr_data['code'] || data['base64']

    Rails.logger.info "[EVOLUTION] Updating connection state: #{connection_status}"
    Rails.logger.info "[EVOLUTION] QR Code present: #{qr_code.present?}"

    whatsapp_channel.update_provider_connection!({
      connection: connection_status,
      qr_data_url: qr_code,
      updated_at: Time.now.to_i
    })
  end

  def setup_webhook(webhook_url)
    Rails.logger.info "[EVOLUTION] Setting up webhook: #{webhook_url}"
    
    webhook_payload = {
      webhook: {
        enabled: true,
        url: webhook_url,
        webhook_by_events: false,
        webhook_base64: false,
        events: [
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'SEND_MESSAGE'
        ]
      }
    }
    
    response = HTTParty.post(
      "#{provider_url}/webhook/set/#{instance_name}",
      headers: api_headers,
      body: webhook_payload.to_json,
      timeout: 10
    )
    
    if response.success?
      Rails.logger.info "[EVOLUTION] Webhook configured successfully"
      true
    else
      Rails.logger.warn "[EVOLUTION] Failed to configure webhook: #{response.body}"
      false
    end
  rescue StandardError => e
    Rails.logger.error "[EVOLUTION] Exception setting up webhook: #{e.message}"
    false
  end

  def chatwoot_base_url
    ENV.fetch('FRONTEND_URL', 'https://talki.thribustech.com').delete_suffix('/')
  end

  def admin_access_token
    # Busca o token do primeiro admin da conta
    # Usa o método helper 'administrators' que já faz o join correto com account_users
    admin_user = whatsapp_channel.account.administrators.first || whatsapp_channel.account.users.first
    admin_user&.access_token.presence || raise(ProviderUnavailableError, 'No admin user found with access token')
  end
end
