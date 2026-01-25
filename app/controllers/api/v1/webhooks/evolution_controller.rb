class Api::V1::Webhooks::EvolutionController < ApplicationController
  # Forma recomendada para APIs/Webhooks: trata a sessão como nula se o token CSRF falhar
  protect_from_forgery with: :null_session
  
  # Ignora a autenticação de usuário (padrão em webhooks)
  skip_before_action :authenticate_user!, raise: false
  
  # Ignora o set_current_user se ele estiver definido (comum em controllers de API)
  # Usamos rescue para evitar que o Rails falhe se o método não estiver definido
  before_action :skip_current_user_check

  def create
    # Converte params para hash para evitar problemas com ActionController::Parameters
    payload = params.to_unsafe_h
    event_type = payload['event']
    
    # Tenta extrair o nome da instância de várias formas comuns na Evolution v2
    # Usamos verificações seguras para evitar TypeError se 'instance' ou 'data' forem Strings
    instance_name = nil
    
    if payload['instance'].is_a?(Hash)
      instance_name ||= payload.dig('instance', 'instanceName')
    end
    
    if payload['data'].is_a?(Hash)
      instance_name ||= payload.dig('data', 'instance')
    end
    
    instance_name ||= payload['instanceName']
    instance_name ||= payload['instance'] if payload['instance'].is_a?(String)
    
    unless instance_name.present?
      return render json: { error: 'Missing instance name' }, status: :ok
    end

    # Encontra o canal WhatsApp baseado no nome da instância
    channel = find_channel_by_instance_name(instance_name)
    
    unless channel
      return render json: { error: 'Channel not found' }, status: :ok
    end

    begin
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
      end
    rescue StandardError => e
      Rails.logger.error "[EVOLUTION WEBHOOK] Error processing: #{e.message}"
    end

    render json: { status: 'success' }, status: :ok
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
    # 1. Se o nome for apenas um número, tenta buscar diretamente pelo ID
    if instance_name =~ /^\d+$/
      channel = Channel::Whatsapp.find_by(id: instance_name, provider: 'evolution')
      return channel if channel
    end

    # 2. Tenta extrair o ID do padrão "talki_{id}"
    if instance_name =~ /talki_(\d+)/
      channel_id = $1
      channel = Channel::Whatsapp.find_by(id: channel_id, provider: 'evolution')
      return channel if channel
    end

    # 3. Fallback: Busca por qualquer canal Evolution onde o nome da instância coincida
    Channel::Whatsapp.where(provider: 'evolution').find do |c|
      c.provider_service.send(:instance_name) == instance_name ||
      c.provider_config['instance_name'] == instance_name
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
