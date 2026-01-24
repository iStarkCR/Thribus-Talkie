class Whatsapp::Providers::WhatsappEvolutionService < Whatsapp::Providers::BaseService
  class ProviderUnavailableError < StandardError; end

  DEFAULT_URL = ENV.fetch('EVOLUTION_API_URL', nil)
  DEFAULT_API_KEY = ENV.fetch('EVOLUTION_API_KEY', nil)

  def setup_channel_provider
    # Na Evolution API, "setup" significa criar a instância se ela não existir
    # ou retornar o QR Code se ela já existir mas estiver desconectada.
    
    # Primeiro, tentamos criar a instância
    response = HTTParty.post(
      "#{provider_url}/instance/create",
      headers: api_headers,
      body: {
        instanceName: instance_name,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        chatwootAccountId: whatsapp_channel.account_id.to_s,
        chatwootToken: whatsapp_channel.account.users.first.access_token, # Simplificação, idealmente seria um token de sistema
        chatwootUrl: ENV.fetch('FRONTEND_URL', ''),
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
    elsif response.code == 403 # Instância já existe
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

    if response.success?
      # Atualizar ID da mensagem externa se necessário
      return response.parsed_response.dig('key', 'id')
    end
    
    nil
  end

  def api_headers
    { 
      'apikey' => api_key,
      'Content-Type' => 'application/json'
    }
  end

  def validate_provider_config?
    # Verifica se a API está online e a chave é válida
    response = HTTParty.get(
      "#{provider_url}/instance/fetchInstances",
      headers: api_headers
    )
    response.success?
  end

  private

  def provider_url
    whatsapp_channel.provider_config['provider_url'].presence || DEFAULT_URL
  end

  def api_key
    whatsapp_channel.provider_config['api_key'].presence || DEFAULT_API_KEY
  end

  def instance_name
    # Usamos o ID do canal ou número de telefone como nome da instância
    "cw_#{whatsapp_channel.id}"
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
    # Mapeia o status da Evolution API para o formato do Chatwoot
    # Evolution: open, connecting, close
    # Chatwoot espera: connection, qr_data_url
    
    connection_status = data.dig('instance', 'state') || data['state'] || 'close'
    qr_code = data.dig('qrcode', 'base64') || data['base64']

    whatsapp_channel.update_provider_connection!({
      connection: connection_status,
      qr_data_url: qr_code,
      updated_at: Time.now.to_i
    })
  end
end
