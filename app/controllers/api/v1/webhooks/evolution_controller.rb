class Api::V1::Webhooks::EvolutionController < ApplicationController
  # Ignora a verificação de autenticidade para webhooks externos
  skip_before_action :verify_authenticity_token, raise: false
  
  # Ignora a autenticação de usuário (padrão em webhooks)
  skip_before_action :authenticate_user!, raise: false
  
  # Ignora o set_current_user se ele estiver definido (comum em controllers de API)
  # Usamos rescue para evitar que o Rails falhe se o método não estiver definido
  before_action :skip_current_user_check

  def create
    Rails.logger.info "[EVOLUTION WEBHOOK] Received webhook: #{params.to_json}"
    
    event_type = params[:event]
    instance_name = params.dig(:instance, :instanceName) || params[:instanceName]
    
    unless instance_name.present?
      Rails.logger.error "[EVOLUTION WEBHOOK] Missing instance name"
      return render json: { error: 'Missing instance name' }, status: :bad_request
    end

    # Encontra o canal WhatsApp baseado no nome da instância
    channel = find_channel_by_instance_name(instance_name)
    
    unless channel
      Rails.logger.warn "[EVOLUTION WEBHOOK] Channel not found for instance: #{instance_name}"
      return render json: { error: 'Channel not found' }, status: :not_found
    end

    case event_type
    when 'QRCODE_UPDATED'
      handle_qrcode_updated(channel, params)
    when 'CONNECTION_UPDATE'
      handle_connection_update(channel, params)
    when 'MESSAGES_UPSERT'
      handle_messages_upsert(channel, params)
    when 'MESSAGES_UPDATE'
      handle_messages_update(channel, params)
    when 'SEND_MESSAGE'
      handle_send_message(channel, params)
    else
      Rails.logger.info "[EVOLUTION WEBHOOK] Unhandled event type: #{event_type}"
    end

    render json: { status: 'success' }, status: :ok
  rescue StandardError => e
    Rails.logger.error "[EVOLUTION WEBHOOK] Error processing webhook: #{e.class} - #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    render json: { error: e.message }, status: :internal_server_error
  end

  private

  def skip_current_user_check
    # Tenta pular o callback de forma segura
    begin
      self.class.skip_before_action(:set_current_user, raise: false)
    rescue
      nil
    end
  end

  def find_channel_by_instance_name(instance_name)
    # O nome da instância segue o padrão "talki_{channel_id}"
    if instance_name =~ /^talki_(\d+)$/
      channel_id = Regexp.last_match(1)
      Channel::Whatsapp.find_by(id: channel_id, provider: 'evolution')
    else
      # Fallback: busca por provider_config
      Channel::Whatsapp.where(provider: 'evolution').find do |channel|
        channel.provider_service.send(:instance_name) == instance_name
      end
    end
  end

  def handle_qrcode_updated(channel, params)
    Whatsapp::EvolutionWebhookService.new(
      channel: channel,
      event_type: 'QRCODE_UPDATED',
      event_data: params.to_unsafe_h
    ).process
  end

  def handle_connection_update(channel, params)
    Whatsapp::EvolutionWebhookService.new(
      channel: channel,
      event_type: 'CONNECTION_UPDATE',
      event_data: params.to_unsafe_h
    ).process
  end

  def handle_messages_upsert(channel, params)
    Whatsapp::EvolutionWebhookService.new(
      channel: channel,
      event_type: 'MESSAGES_UPSERT',
      event_data: params.to_unsafe_h
    ).process
  end

  def handle_messages_update(channel, params)
    Whatsapp::EvolutionWebhookService.new(
      channel: channel,
      event_type: 'MESSAGES_UPDATE',
      event_data: params.to_unsafe_h
    ).process
  end

  def handle_send_message(channel, params)
    Whatsapp::EvolutionWebhookService.new(
      channel: channel,
      event_type: 'SEND_MESSAGE',
      event_data: params.to_unsafe_h
    ).process
  end
end
