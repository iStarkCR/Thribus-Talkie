class Whatsapp::EvolutionWebhookService
  def initialize(channel:, event_type:, event_data:)
    @channel = channel
    @event_type = event_type
    @event_data = event_data
  end

  def process
    case @event_type
    when 'QRCODE_UPDATED'
      process_qrcode_updated
    when 'CONNECTION_UPDATE'
      process_connection_update
    when 'MESSAGES_UPSERT'
      process_messages_upsert
    when 'MESSAGES_UPDATE'
      process_messages_update
    when 'SEND_MESSAGE'
      process_send_message
    else
      Rails.logger.info "[EVOLUTION WEBHOOK SERVICE] Unhandled event type: #{@event_type}"
    end
  end

  private

  def process_qrcode_updated
    Rails.logger.info "[EVOLUTION WEBHOOK SERVICE] Processing QRCODE_UPDATED for channel #{@channel.id}"
    
    qr_code = extract_qr_code
    
    if qr_code.present?
      # Garante que o QR code esteja no formato data:image/png;base64,
      unless qr_code.start_with?('data:image')
        qr_code = "data:image/png;base64,#{qr_code}"
      end

      # Usa update_columns para evitar validações que travam o salvamento
      @channel.update_columns(
        provider_config: @channel.provider_config.merge({
          connection: 'connecting',
          qr_data_url: qr_code,
          updated_at: Time.now.to_i
        })
      )
      
      # Notifica via ActionCable se necessário
      notify_qrcode_update(qr_code)
      
      Rails.logger.info "[EVOLUTION WEBHOOK SERVICE] QR Code updated successfully"
    else
      Rails.logger.warn "[EVOLUTION WEBHOOK SERVICE] QR Code not found in event data"
    end
  end

  def process_connection_update
    Rails.logger.info "[EVOLUTION WEBHOOK SERVICE] Processing CONNECTION_UPDATE for channel #{@channel.id}"
    
    state = extract_connection_state
    
    if state.present?
      new_config = @channel.provider_config.merge({
        connection: state,
        updated_at: Time.now.to_i
      })
      
      # Se conectado, limpa o QR code
      new_config[:qr_data_url] = nil if state == 'open'
      
      @channel.update_columns(provider_config: new_config)
      
      # Notifica via ActionCable
      notify_connection_update(state)
      
      Rails.logger.info "[EVOLUTION WEBHOOK SERVICE] Connection state updated to: #{state}"
      
      # Se conectado, marca o canal como autorizado
      if state == 'open'
        @channel.reauthorized! if @channel.respond_to?(:reauthorized!)
        Rails.logger.info "[EVOLUTION WEBHOOK SERVICE] Channel reauthorized"
      end
    else
      Rails.logger.warn "[EVOLUTION WEBHOOK SERVICE] Connection state not found in event data"
    end
  end

  def process_messages_upsert
    Rails.logger.info "[EVOLUTION WEBHOOK SERVICE] Processing MESSAGES_UPSERT for channel #{@channel.id}"
    # A Evolution API já envia mensagens diretamente para o Chatwoot via integração nativa
    # Este método é apenas para processamento adicional se necessário
  end

  def process_messages_update
    Rails.logger.info "[EVOLUTION WEBHOOK SERVICE] Processing MESSAGES_UPDATE for channel #{@channel.id}"
    # A Evolution API já gerencia atualizações de mensagens via integração nativa
  end

  def process_send_message
    Rails.logger.info "[EVOLUTION WEBHOOK SERVICE] Processing SEND_MESSAGE for channel #{@channel.id}"
    # A Evolution API já gerencia envio de mensagens via integração nativa
  end

  def extract_qr_code
    # Tenta extrair o QR Code de todas as variações possíveis da Evolution v2
    @event_data.dig('data', 'qrcode', 'base64') ||
      @event_data.dig('data', 'qrcode', 'code') ||
      @event_data.dig('qrcode', 'base64') ||
      @event_data.dig('qrcode', 'code') ||
      @event_data.dig('data', 'base64') ||
      @event_data.dig('data', 'code') ||
      @event_data.dig('qr', 'base64') ||
      @event_data.dig('qr', 'code') ||
      @event_data['base64'] ||
      @event_data['code']
  end

  def extract_connection_state
    @event_data.dig('data', 'state') ||
      @event_data.dig('instance', 'state') ||
      @event_data['state']
  end

  def notify_qrcode_update(qr_code)
    # Notifica via ActionCable para atualizar a UI em tempo real
    inbox = @channel.inbox
    return unless inbox

    ActionCable.server.broadcast(
      "account_#{inbox.account_id}",
      {
        event: 'inbox.qrcode_updated',
        data: {
          inbox_id: inbox.id,
          qr_code: qr_code
        }
      }
    )
  rescue StandardError => e
    Rails.logger.error "[EVOLUTION WEBHOOK SERVICE] Failed to notify QR code update: #{e.message}"
  end

  def notify_connection_update(state)
    # Notifica via ActionCable para atualizar a UI em tempo real
    inbox = @channel.inbox
    return unless inbox

    ActionCable.server.broadcast(
      "account_#{inbox.account_id}",
      {
        event: 'inbox.connection_updated',
        data: {
          inbox_id: inbox.id,
          connection_state: state
        }
      }
    )
  rescue StandardError => e
    Rails.logger.error "[EVOLUTION WEBHOOK SERVICE] Failed to notify connection update: #{e.message}"
  end
end
