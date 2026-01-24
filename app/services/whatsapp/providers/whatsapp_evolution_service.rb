class Whatsapp::Providers::WhatsappEvolutionService < Whatsapp::Providers::BaseService
  class ProviderUnavailableError < StandardError; end

  # Valores padrão baseados nas configurações do usuário
  DEFAULT_URL = ENV.fetch('EVOLUTION_API_URL', 'https://evolution.thribustech.com')
  DEFAULT_API_KEY = ENV.fetch('EVOLUTION_API_KEY', '5CKFPNK277oh7ONsNyjG8e0dO9oaqRsD')

  def setup_channel_provider
    # Tenta criar a instância na Evolution API v2
    response = HTTParty.post(
      "#{provider_url}/instance/create",
      headers: api_headers,
      body: {
        instanceName: instance_name,
        token: instance_token,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        chatwootAccountId: whatsapp_channel.account_id.to_s,
        chatwootToken: whatsapp_channel.account.users.first.access_token,
        chatwootUrl: 'https://talki.thribustech.com',
        chatwootSignMsg: true,
        chatwootReopenConversation: true,
        chatwootConversationPending: false,
        chatwootImportContacts: true,
        chatwootNameInbox: whatsapp_channel.inbox.name,
        chatwootMergeBrazilContacts: true,
        chatwootImportMessages: false
      }.to_json
    )

    if response.success?
      data = response.parsed_response
      update_connection_state(data)
      return true
    elsif response.code == 403 || (response.parsed_response.is_a?(Hash) && response.parsed_response['message']&.include?('already exists'))
      # Se a instância já existe, busca o estado atual (QR Code ou Conectado)
      return fetch_connection_state
    end

    Rails.logger.error "[EVOLUTION] Setup failed: #{response.body}"
    false
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
    response = HTTParty.get(
      "#{provider_url}/instance/fetchInstances",
      headers: api_headers
    )
    response.success?
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
    qr_data = data['qrcode'] || {}
    qr_code = qr_data['base64'] || data['base64']

    whatsapp_channel.update_provider_connection!({
      connection: connection_status,
      qr_data_url: qr_code,
      updated_at: Time.now.to_i
    })
  end
end
