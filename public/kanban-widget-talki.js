// ============================================================
// KANBAN WIDGET PARA TALKI - THRIBUS
// ============================================================
// Versão: 1.0.2
// Data: 2025-01-31
// Sistema: Talki (baseado em Chatwoot com melhorias)
// Descrição: Integração completa do Kanban no Talki
// - Menu lateral com Kanban e Conexões
// - Widget flutuante para configurações
// - Agendamento de mensagens
// ============================================================

// ============================================================
// SCRIPT 1: MENU KANBAN + CONEXÕES NO SIDEBAR
// ============================================================
(function() {
  'use strict';

  const KANBAN_URL = 'https://kanban.thribustech.com';

  var panelOpen = false;
  var menuItemsAdded = false;
  var lastUrl = location.href;
  var observer = null;

  function injectCSS() {
    if (document.getElementById('cw-custom-css')) return;
    var css = document.createElement('style');
    css.id = 'cw-custom-css';
    css.textContent = '#cw-custom-menu-kanban,#cw-custom-menu-conexoes{margin-top:0 !important;margin-bottom:0 !important}#cw-custom-menu-kanban .menu-icon,#cw-custom-menu-conexoes .menu-icon{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}#cw-custom-menu-kanban .menu-icon svg,#cw-custom-menu-conexoes .menu-icon svg{width:16px;height:16px}#cw-custom-panel{position:fixed;top:0;right:0;bottom:0;background:#fff;z-index:100;display:none;flex-direction:column}#cw-custom-panel.visible{display:flex}#cw-custom-panel .panel-body{flex:1;position:relative;background:#fff;overflow:hidden}#cw-custom-panel iframe{width:100%;height:100%;border:none;display:block}#cw-custom-panel .loading-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;z-index:10}#cw-custom-panel .loading-overlay.hidden{display:none}#cw-custom-panel .spinner{width:48px;height:48px;border:4px solid #e0e0e0;border-top-color:#1f93ff;border-radius:50%;animation:cwSpin .8s linear infinite}@keyframes cwSpin{to{transform:rotate(360deg)}}#cw-custom-panel .loading-text{margin-top:16px;color:#6e84a3;font-size:14px}#cw-custom-panel .error-overlay{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:#fff;text-align:center;padding:40px;z-index:10}#cw-custom-panel .error-overlay.visible{display:flex}#cw-custom-panel .error-icon{font-size:64px;margin-bottom:20px}#cw-custom-panel .error-title{font-size:20px;font-weight:600;color:#1f2d3d;margin:0 0 10px}#cw-custom-panel .error-text{color:#6e84a3;margin:0 0 24px;max-width:400px;line-height:1.5}#cw-custom-panel .error-btn{padding:12px 24px;background:#1f93ff;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s}#cw-custom-panel .error-btn:hover{background:#1976d2}';
    document.head.appendChild(css);
  }

  function getSidebarWidth() {
    var aside = document.querySelector('aside.bg-n-solid-2, aside[class*="bg-n-solid"], aside.border-r, aside');
    if (aside) {
      return aside.getBoundingClientRect().right;
    }
    return 200;
  }

  function createPanel() {
    if (document.getElementById('cw-custom-panel')) return;
    var panel = document.createElement('div');
    panel.id = 'cw-custom-panel';
    panel.innerHTML = '<div class="panel-body"><div class="loading-overlay" id="cw-loading"><div class="spinner"></div><p class="loading-text">Carregando...</p></div><div class="error-overlay" id="cw-error"><div class="error-icon">🔒</div><h3 class="error-title">Site Protegido</h3><p class="error-text">Este site possui proteções que impedem a exibição incorporada.</p><button class="error-btn" onclick="window.cwCustomExternal()">↗️ Abrir em Nova Aba</button></div><iframe id="cw-iframe" src="about:blank"></iframe></div>';
    document.body.appendChild(panel);
  }

  function getAuthFromCookie() {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      if (cookie.indexOf('cw_d_session_info=') === 0) {
        try {
          var value = cookie.substring('cw_d_session_info='.length);
          var parsed = JSON.parse(decodeURIComponent(value));
          if (parsed['access-token'] && parsed['client'] && parsed['uid']) {
            return parsed;
          }
        } catch (e) {
          console.log('[Talki Kanban] Erro ao parsear cookie:', e);
        }
      }
    }
    return null;
  }

  window.cwCustomOpen = function(path) {
    path = path || '';
    panelOpen = true;
    var panel = document.getElementById('cw-custom-panel');
    var iframe = document.getElementById('cw-iframe');
    var loading = document.getElementById('cw-loading');
    var error = document.getElementById('cw-error');
    var kanbanItem = document.getElementById('cw-custom-menu-kanban');
    var conexoesItem = document.getElementById('cw-custom-menu-conexoes');

    panel.style.left = getSidebarWidth() + 'px';
    loading.classList.remove('hidden');
    error.classList.remove('visible');
    iframe.src = KANBAN_URL + path;
    panel.classList.add('visible');

    if (path === '/conexoes' && conexoesItem) {
      conexoesItem.classList.add('active');
      if (kanbanItem) kanbanItem.classList.remove('active');
    } else if (kanbanItem) {
      kanbanItem.classList.add('active');
      if (conexoesItem) conexoesItem.classList.remove('active');
    }

    iframe.onload = function() {
      loading.classList.add('hidden');
      var auth = getAuthFromCookie();
      if (auth && iframe.contentWindow) {
        console.log('[Talki Kanban] Enviando token para iframe...');
        iframe.contentWindow.postMessage({
          type: 'AUTH_TOKEN',
          payload: auth
        }, '*');
      }
    };

    setTimeout(function() { if (!loading.classList.contains('hidden')) { loading.classList.add('hidden'); error.classList.add('visible'); } }, 8000);
  };

  window.cwCustomClose = function() {
    panelOpen = false;
    var panel = document.getElementById('cw-custom-panel');
    var iframe = document.getElementById('cw-iframe');
    var kanbanItem = document.getElementById('cw-custom-menu-kanban');
    var conexoesItem = document.getElementById('cw-custom-menu-conexoes');

    panel.classList.remove('visible');
    iframe.src = 'about:blank';
    if (kanbanItem) kanbanItem.classList.remove('active');
    if (conexoesItem) conexoesItem.classList.remove('active');
  };

  window.cwCustomExternal = function() { window.open(KANBAN_URL, '_blank'); };
  window.cwCustomToggleKanban = function() { panelOpen ? window.cwCustomClose() : window.cwCustomOpen(''); };
  window.cwCustomToggleConexoes = function() { panelOpen ? window.cwCustomClose() : window.cwCustomOpen('/conexoes'); };

  function closeOnNavigation() {
    if (panelOpen && location.href !== lastUrl) {
      window.cwCustomClose();
    }
    lastUrl = location.href;
  }

  function setupNavigationDetection() {
    window.addEventListener('popstate', closeOnNavigation);
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function() { origPush.apply(this, arguments); closeOnNavigation(); };
    history.replaceState = function() { origReplace.apply(this, arguments); closeOnNavigation(); };
    document.addEventListener('click', function(e) {
      if (!panelOpen) return;
      var link = e.target.closest('a');
      if (link && !link.closest('#cw-custom-panel')) {
        setTimeout(closeOnNavigation, 100);
      }
    }, true);
  }

  function addMenuItems() {
    if (document.getElementById('cw-custom-menu-kanban')) { menuItemsAdded = true; return true; }

    var mainNav = document.querySelector('aside nav ul.list-none, aside nav > ul, nav.grid ul');
    if (!mainNav) {
      console.log('[Talki Kanban] Não encontrou ul do menu principal');
      return false;
    }

    var allLi = mainNav.querySelectorAll(':scope > li');
    if (allLi.length === 0) {
      console.log('[Talki Kanban] Não encontrou itens li no menu');
      return false;
    }

    var refLi = null;
    var refLink = null;
    for (var i = 0; i < allLi.length; i++) {
      var text = allLi[i].textContent.toLowerCase();
      if (text.includes('relatório') || text.includes('report') || text.includes('campanha') || text.includes('campaign')) {
        refLi = allLi[i];
        refLink = refLi.querySelector('a, div[role="button"]');
        break;
      }
    }

    if (!refLi) {
      refLi = allLi[allLi.length - 1];
      refLink = refLi.querySelector('a, div[role="button"]');
    }

    if (!refLi || !refLink) {
      console.log('[Talki Kanban] Não encontrou item de referência');
      return false;
    }

    // Menu Kanban
    var kanbanLi = document.createElement('li');
    kanbanLi.className = refLi.className;
    var kanbanItem = document.createElement('div');
    kanbanItem.id = 'cw-custom-menu-kanban';
    kanbanItem.className = refLink.className;
    kanbanItem.setAttribute('role', 'button');
    kanbanItem.style.cursor = 'pointer';
    kanbanItem.innerHTML = '<div class="relative flex items-center gap-2"><div class="flex items-center gap-1.5 flex-grow min-w-0"><span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg></span><span class="text-sm font-medium leading-5 truncate">Kanban</span></div></div>';
    kanbanItem.onclick = function(e) { e.preventDefault(); window.cwCustomToggleKanban(); };
    kanbanLi.appendChild(kanbanItem);

    // Menu Conexões
    var conexoesLi = document.createElement('li');
    conexoesLi.className = refLi.className;
    var conexoesItem = document.createElement('div');
    conexoesItem.id = 'cw-custom-menu-conexoes';
    conexoesItem.className = refLink.className;
    conexoesItem.setAttribute('role', 'button');
    conexoesItem.style.cursor = 'pointer';
    conexoesItem.innerHTML = '<div class="relative flex items-center gap-2"><div class="flex items-center gap-1.5 flex-grow min-w-0"><span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span><span class="text-sm font-medium leading-5 truncate">Conexões</span></div></div>';
    conexoesItem.onclick = function(e) { e.preventDefault(); window.cwCustomToggleConexoes(); };
    conexoesLi.appendChild(conexoesItem);

    mainNav.insertBefore(kanbanLi, refLi);
    mainNav.insertBefore(conexoesLi, refLi);

    menuItemsAdded = true;
    if (observer) { observer.disconnect(); observer = null; }
    console.log('[Talki Kanban] Itens Kanban e Conexões adicionados!');
    return true;
  }

  function initMenu() {
    injectCSS();
    createPanel();
    setupNavigationDetection();
    var attempts = 0;
    var maxAttempts = 30;
    function tryAdd() {
      if (menuItemsAdded) return;
      if (addMenuItems()) return;
      attempts++;
      if (attempts < maxAttempts) setTimeout(tryAdd, 500);
    }
    setTimeout(tryAdd, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenu);
  } else {
    initMenu();
  }
})();

// ============================================================
// SCRIPT 2: WIDGET FLUTUANTE NA CONVERSA (Configurações do Kanban)
// ============================================================
(function() {
  'use strict';

  const KANBAN_URL = 'https://kanban.thribustech.com';
  const KANBAN_API_URL = 'https://api-kanban.thribustech.com';

  var WIDGET_CONFIG = {
    apiUrl: KANBAN_API_URL
  };

  var currentConversationId = null;
  var widgetModalState = {
    view: 'main',
    funnels: [],
    selectedFunnel: null,
    currentStage: null,
    scheduledMessages: []
  };

  function getAuthHeaders() {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      if (cookie.indexOf('cw_d_session_info=') === 0) {
        try {
          var value = cookie.substring('cw_d_session_info='.length);
          var parsed = JSON.parse(decodeURIComponent(value));
          if (parsed['access-token'] && parsed['client'] && parsed['uid']) {
            return {
              'access-token': parsed['access-token'],
              'token-type': parsed['token-type'] || 'Bearer',
              'client': parsed['client'],
              'expiry': parsed['expiry'] || '',
              'uid': parsed['uid']
            };
          }
        } catch (e) {
          console.log('[Kanban Widget] Erro ao parsear cookie:', e);
        }
      }
    }
    return null;
  }

  function getConversationIdFromUrl() {
    var match = location.pathname.match(/\/conversations\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  function injectWidgetCSS() {
    if (document.getElementById('cw-kanban-widget-css')) return;
    var css = document.createElement('style');
    css.id = 'cw-kanban-widget-css';
    css.textContent = '#cw-kanban-header-btn{display:inline-flex;align-items:center;min-w-0;gap:2px;transition:all 100ms ease-out;border:0;border-radius:8px;outline:1px solid transparent;opacity:50;cursor:pointer;background:transparent;height:32px;width:32px;padding:0;justify-content:center;color:var(--s-600)}#cw-kanban-header-btn:hover{opacity:100;background:rgba(0,0,0,0.05)}#cw-kanban-header-btn.has-stage{opacity:100;color:#059669}#cw-kanban-header-btn svg{width:16px;height:16px}#cw-kanban-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;z-index:1000}#cw-kanban-modal-overlay.visible{display:flex}#cw-kanban-modal{background:#fff;border-radius:12px;width:90%;max-width:500px;max-height:85vh;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.2)}#cw-kanban-modal .modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e5e7eb}#cw-kanban-modal .modal-header h3{margin:0;font-size:16px;font-weight:600;color:#111827}#cw-kanban-modal .close-btn{background:none;border:none;font-size:24px;color:#6b7280;cursor:pointer;padding:0;line-height:1}#cw-kanban-modal .close-btn:hover{color:#111827}#cw-kanban-modal .modal-body{padding:16px 20px;max-height:65vh;overflow-y:auto}#cw-kanban-modal .loading{display:flex;align-items:center;justify-content:center;gap:12px;padding:32px;color:#6b7280}#cw-kanban-modal .loading .spinner{width:20px;height:20px;border:2px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:cwWidgetSpin .8s linear infinite}@keyframes cwWidgetSpin{to{transform:rotate(360deg)}}#cw-kanban-modal .error-msg{padding:12px;background:#fef2f2;color:#dc2626;border-radius:8px;font-size:14px;margin-bottom:12px}#cw-kanban-modal .success-msg{padding:12px;background:#f0fdf4;color:#059669;border-radius:8px;font-size:14px;margin-bottom:12px}#cw-kanban-modal .current-stage{display:flex;align-items:center;gap:8px;padding:12px;background:#f0fdf4;border-radius:8px;margin-bottom:16px;flex-wrap:wrap}#cw-kanban-modal .current-stage .label{font-size:12px;color:#6b7280}#cw-kanban-modal .current-stage .value{font-size:14px;font-weight:500;color:#059669;flex:1}#cw-kanban-modal .remove-btn{padding:4px 12px;background:#fee2e2;color:#dc2626;border:none;border-radius:4px;font-size:12px;cursor:pointer}#cw-kanban-modal .remove-btn:hover{background:#fecaca}#cw-kanban-modal .section-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:500;color:#374151;margin-bottom:12px}#cw-kanban-modal .section-divider{border:0;border-top:1px solid #e5e7eb;margin:20px 0}#cw-kanban-modal .back-btn{background:none;border:none;color:#3b82f6;font-size:14px;cursor:pointer;padding:0;margin-bottom:12px;display:flex;align-items:center;gap:4px}#cw-kanban-modal .back-btn:hover{text-decoration:underline}#cw-kanban-modal .list{display:flex;flex-direction:column;gap:8px}#cw-kanban-modal .list-item{display:flex;align-items:center;gap:12px;padding:12px;background:#f9fafb;border-radius:8px;cursor:pointer;transition:background .15s ease;border:none;width:100%;text-align:left;font-family:inherit}#cw-kanban-modal .list-item:hover{background:#f3f4f6}#cw-kanban-modal .list-item.selected{background:#dbeafe;border:1px solid #3b82f6}#cw-kanban-modal .color-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}#cw-kanban-modal .item-name{flex:1;font-size:14px;color:#111827}#cw-kanban-modal .item-count{font-size:12px;color:#9ca3af}#cw-kanban-modal .empty-state{padding:24px;text-align:center;color:#9ca3af;font-size:14px}#cw-kanban-modal .form-group{margin-bottom:12px}#cw-kanban-modal .form-label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px}#cw-kanban-modal .form-input,#cw-kanban-modal .form-textarea{width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;font-family:inherit;box-sizing:border-box}#cw-kanban-modal .form-textarea{resize:vertical;min-height:80px}#cw-kanban-modal .form-input:focus,#cw-kanban-modal .form-textarea:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.1)}#cw-kanban-modal .btn-primary{width:100%;padding:10px 16px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer;transition:background .15s}#cw-kanban-modal .btn-primary:hover{background:#2563eb}#cw-kanban-modal .btn-primary:disabled{background:#9ca3af;cursor:not-allowed}#cw-kanban-modal .scheduled-item{padding:12px;background:#f9fafb;border-radius:8px;margin-bottom:8px}#cw-kanban-modal .scheduled-header{display:flex;justify-content:space-between;align-items:start;margin-bottom:8px}#cw-kanban-modal .scheduled-date{font-size:12px;font-weight:500;color:#3b82f6}#cw-kanban-modal .scheduled-status{font-size:11px;padding:2px 8px;border-radius:4px;font-weight:500}#cw-kanban-modal .status-pending{background:#fef3c7;color:#92400e}#cw-kanban-modal .status-sent{background:#d1fae5;color:#065f46}#cw-kanban-modal .status-cancelled{background:#fee2e2;color:#991b1b}#cw-kanban-modal .status-failed{background:#fee2e2;color:#991b1b}#cw-kanban-modal .scheduled-message{font-size:13px;color:#4b5563;margin-bottom:8px;word-wrap:break-word}#cw-kanban-modal .scheduled-attachment{font-size:12px;color:#6b7280;margin-bottom:8px;padding:6px 8px;background:#fff;border-radius:4px;display:inline-block}#cw-kanban-modal .scheduled-actions{display:flex;gap:8px}#cw-kanban-modal .btn-small{padding:4px 10px;border:none;border-radius:4px;font-size:12px;cursor:pointer;font-weight:500}#cw-kanban-modal .btn-edit{background:#dbeafe;color:#1e40af}#cw-kanban-modal .btn-edit:hover{background:#bfdbfe}#cw-kanban-modal .btn-cancel{background:#fee2e2;color:#dc2626}#cw-kanban-modal .btn-cancel:hover{background:#fecaca}#cw-kanban-modal .current-attachment{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f0fdf4;border-radius:6px;font-size:13px;color:#059669}#cw-kanban-modal .menu-option{display:flex;align-items:center;gap:12px;padding:14px 16px;background:#f9fafb;border-radius:8px;cursor:pointer;transition:all .15s;border:2px solid transparent;margin-bottom:10px}#cw-kanban-modal .menu-option:hover{background:#f3f4f6;border-color:#e5e7eb}#cw-kanban-modal .menu-option-icon{width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#fff;font-size:20px}#cw-kanban-modal .menu-option-content{flex:1}#cw-kanban-modal .menu-option-title{font-size:14px;font-weight:500;color:#111827;margin-bottom:2px}#cw-kanban-modal .menu-option-desc{font-size:12px;color:#6b7280}';
    document.head.appendChild(css);
  }

  function createHeaderButton() {
    console.log('[Kanban Widget] === createHeaderButton iniciado ===');

    var existing = document.getElementById('cw-kanban-header-btn');
    if (existing) return true;

    var header = document.querySelector('header.bg-white, header[class*="bg-white"], .conversation-header');
    if (!header) {
      console.log('[Kanban Widget] Header não encontrado');
      return false;
    }

    var actionGroup = header.querySelector('.flex.items-center.gap-1, .flex.items-center.gap-2, .flex.items-center');
    if (!actionGroup) {
      console.log('[Kanban Widget] Grupo de ações não encontrado');
      return false;
    }

    var btn = document.createElement('button');
    btn.id = 'cw-kanban-header-btn';
    btn.type = 'button';
    btn.title = 'Configurações do Kanban';
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>';
    btn.onclick = function() {
      widgetModalState.view = 'main';
      document.getElementById('cw-kanban-modal-overlay').classList.add('visible');
      renderWidgetModalContent();
    };

    actionGroup.prepend(btn);
    return true;
  }

  function createWidgetModal() {
    if (document.getElementById('cw-kanban-modal-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'cw-kanban-modal-overlay';
    overlay.innerHTML = '<div id="cw-kanban-modal"><div class="modal-header"><h3>Kanban & Agendamento</h3><button class="close-btn" onclick="document.getElementById(\'cw-kanban-modal-overlay\').classList.remove(\'visible\')">&times;</button></div><div class="modal-body" id="cw-kanban-modal-body"></div></div>';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.classList.remove('visible'); };
    document.body.appendChild(overlay);
  }

  async function renderWidgetModalContent() {
    var body = document.getElementById('cw-kanban-modal-body');
    if (!body) return;

    if (widgetModalState.view === 'main') {
      body.innerHTML = '<div class="list"><div class="menu-option" onclick="window.setWidgetView(\'funnels\')"><div class="menu-option-icon">📊</div><div class="menu-option-content"><div class="menu-option-title">Mover no Funil</div><div class="menu-option-desc">Alterar o estágio desta conversa no Kanban</div></div></div><div class="menu-option" onclick="window.setWidgetView(\'scheduling\')"><div class="menu-option-icon">⏰</div><div class="menu-option-content"><div class="menu-option-title">Agendar Mensagem</div><div class="menu-option-desc">Programar mensagens para envio futuro</div></div></div></div>';
    } else if (widgetModalState.view === 'funnels') {
      body.innerHTML = '<button class="back-btn" onclick="window.setWidgetView(\'main\')">← Voltar</button><div class="loading"><div class="spinner"></div><span>Carregando funis...</span></div>';
      try {
        var authHeaders = getAuthHeaders();
        if (!authHeaders) throw new Error('Sessão não encontrada');
        var res = await fetch(WIDGET_CONFIG.apiUrl + '/kanban/funnels', { headers: authHeaders });
        if (!res.ok) throw new Error('Erro ao carregar funis');
        var data = await res.json();
        widgetModalState.funnels = data.data;
        if (widgetModalState.funnels.length === 0) {
          body.innerHTML = '<button class="back-btn" onclick="window.setWidgetView(\'main\')">← Voltar</button><div class="empty-state">Nenhum funil configurado.</div>';
          return;
        }
        var html = '<button class="back-btn" onclick="window.setWidgetView(\'main\')">← Voltar</button><div class="section-title">Selecione o Funil</div><div class="list">';
        widgetModalState.funnels.forEach(function(f) {
          html += '<button class="list-item" onclick="window.selectFunnel(' + f.id + ')"><div class="item-name">' + f.name + '</div><div class="item-count">' + f.stages.length + ' estágios</div></button>';
        });
        html += '</div>';
        body.innerHTML = html;
      } catch (err) {
        body.innerHTML = '<button class="back-btn" onclick="window.setWidgetView(\'main\')">← Voltar</button><div class="error-msg">' + err.message + '</div>';
      }
    } else if (widgetModalState.view === 'stages') {
      var funnel = widgetModalState.selectedFunnel;
      var html = '<button class="back-btn" onclick="window.setWidgetView(\'funnels\')">← Voltar para Funis</button><div class="section-title">Estágios de ' + funnel.name + '</div>';
      if (widgetModalState.currentStage) {
        html += '<div class="current-stage"><div class="label">Estágio Atual:</div><div class="value">' + widgetModalState.currentStage.stageName + '</div><button class="remove-btn" onclick="window.removeFromKanban()">Remover</button></div>';
      }
      html += '<div class="list">';
      funnel.stages.forEach(function(s) {
        var isCurrent = widgetModalState.currentStage && widgetModalState.currentStage.stageId === s.id;
        html += '<button class="list-item' + (isCurrent ? ' selected' : '') + '" onclick="window.moveToStage(' + s.id + ')"><div class="color-dot" style="background:' + (s.color || '#e5e7eb') + '"></div><div class="item-name">' + s.name + '</div></button>';
      });
      html += '</div>';
      body.innerHTML = html;
    } else if (widgetModalState.view === 'scheduling') {
      body.innerHTML = '<button class="back-btn" onclick="window.setWidgetView(\'main\')">← Voltar</button><div class="loading"><div class="spinner"></div><span>Carregando agendamentos...</span></div>';
      try {
        var authHeaders = getAuthHeaders();
        if (!authHeaders) throw new Error('Sessão não encontrada');
        var res = await fetch(WIDGET_CONFIG.apiUrl + '/conversations/' + currentConversationId + '/scheduled-messages', { headers: authHeaders });
        if (!res.ok) throw new Error('Erro ao carregar mensagens');
        var data = await res.json();
        widgetModalState.scheduledMessages = data.data;
        var html = '<button class="back-btn" onclick="window.setWidgetView(\'main\')">← Voltar</button><div class="section-title">Agendamentos</div><button class="btn-primary" style="margin-bottom:16px" onclick="window.setWidgetView(\'create_schedule\')">+ Novo Agendamento</button>';
        if (widgetModalState.scheduledMessages.length === 0) {
          html += '<div class="empty-state">Nenhuma mensagem agendada.</div>';
        } else {
          html += '<div class="list">';
          widgetModalState.scheduledMessages.forEach(function(m) {
            var date = new Date(m.scheduledAt).toLocaleString();
            html += '<div class="scheduled-item"><div class="scheduled-header"><div class="scheduled-date">' + date + '</div><div class="scheduled-status status-' + m.status + '">' + m.status.toUpperCase() + '</div></div><div class="scheduled-message">' + m.content + '</div>';
            if (m.attachments && m.attachments.length > 0) {
              html += '<div class="scheduled-attachment">📎 ' + m.attachments[0].fileName + '</div>';
            }
            if (m.status === 'pending') {
              html += '<div class="scheduled-actions"><button class="btn-small btn-edit" onclick="window.editScheduledMessage(' + m.id + ')">Editar</button><button class="btn-small btn-cancel" onclick="window.cancelScheduledMessage(' + m.id + ')">Cancelar</button></div>';
            }
            html += '</div>';
          });
          html += '</div>';
        }
        body.innerHTML = html;
      } catch (err) {
        body.innerHTML = '<button class="back-btn" onclick="window.setWidgetView(\'main\')">← Voltar</button><div class="error-msg">' + err.message + '</div>';
      }
    } else if (widgetModalState.view === 'create_schedule') {
      var html = '<button class="back-btn" onclick="window.setWidgetView(\'scheduling\')">← Voltar</button><div class="section-title">Novo Agendamento</div><div class="form-group"><label class="form-label">Data e Hora</label><input type="datetime-local" id="schedule-date" class="form-input"></div><div class="form-group"><label class="form-label">Mensagem</label><textarea id="schedule-content" class="form-textarea" placeholder="Digite sua mensagem..."></textarea></div><div class="form-group"><label class="form-label">Anexo (Opcional)</label><input type="file" id="schedule-file" class="form-input"></div><button class="btn-primary" onclick="window.submitSchedule()">Agendar Mensagem</button>';
      body.innerHTML = html;
    } else if (widgetModalState.view === 'edit_schedule') {
      var m = widgetModalState.editingMessage;
      var date = new Date(m.scheduledAt).toISOString().slice(0, 16);
      var html = '<button class="back-btn" onclick="window.setWidgetView(\'scheduling\')">← Voltar</button><div class="section-title">Editar Agendamento</div><div class="form-group"><label class="form-label">Data e Hora</label><input type="datetime-local" id="schedule-date" class="form-input" value="' + date + '"></div><div class="form-group"><label class="form-label">Mensagem</label><textarea id="schedule-content" class="form-textarea">' + m.content + '</textarea></div>';
      if (m.attachments && m.attachments.length > 0 && !widgetModalState.removeAttachmentFlag) {
        html += '<div class="form-group"><label class="form-label">Anexo Atual</label><div class="current-attachment"><span>📎 ' + m.attachments[0].fileName + '</span><button class="remove-btn" onclick="window.removeAttachment()">Remover</button></div></div>';
      }
      html += '<div class="form-group"><label class="form-label">Substituir Anexo (Opcional)</label><input type="file" id="schedule-file" class="form-input"></div><button class="btn-primary" onclick="window.submitUpdateSchedule()">Salvar Alterações</button>';
      body.innerHTML = html;
    }
  }

  window.setWidgetView = function(view) {
    widgetModalState.view = view;
    renderWidgetModalContent();
  };

  window.selectFunnel = function(id) {
    widgetModalState.selectedFunnel = widgetModalState.funnels.find(function(f) { return f.id === id; });
    widgetModalState.view = 'stages';
    renderWidgetModalContent();
  };

  window.moveToStage = async function(stageId) {
    var body = document.getElementById('cw-kanban-modal-body');
    body.innerHTML = '<div class="loading"><div class="spinner"></div><span>Movendo conversa...</span></div>';
    try {
      var authHeaders = getAuthHeaders();
      if (!authHeaders) throw new Error('Sessão não encontrada');
      var res = await fetch(WIDGET_CONFIG.apiUrl + '/kanban/move', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
        body: JSON.stringify({ conversationId: currentConversationId, stageId: stageId })
      });
      if (!res.ok) throw new Error('Erro ao mover conversa');
      var data = await res.json();
      widgetModalState.currentStage = data.data;
      updateHeaderButton();
      body.innerHTML = '<div class="success-msg">✓ Conversa movida com sucesso!</div>';
      setTimeout(function() {
        widgetModalState.view = 'stages';
        renderWidgetModalContent();
      }, 1500);
    } catch (err) {
      body.innerHTML = '<button class="back-btn" onclick="window.setWidgetView(\'stages\')">← Voltar</button><div class="error-msg">' + err.message + '</div>';
    }
  };

  window.removeFromKanban = async function() {
    if (!confirm('Deseja realmente remover esta conversa do Kanban?')) return;
    var body = document.getElementById('cw-kanban-modal-body');
    body.innerHTML = '<div class="loading"><div class="spinner"></div><span>Removendo...</span></div>';
    try {
      var authHeaders = getAuthHeaders();
      if (!authHeaders) throw new Error('Sessão não encontrada');
      var res = await fetch(WIDGET_CONFIG.apiUrl + '/kanban/conversation/' + currentConversationId, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) throw new Error('Erro ao remover do Kanban');
      widgetModalState.currentStage = null;
      updateHeaderButton();
      body.innerHTML = '<div class="success-msg">✓ Removida com sucesso!</div>';
      setTimeout(function() {
        widgetModalState.view = 'stages';
        renderWidgetModalContent();
      }, 1500);
    } catch (err) {
      body.innerHTML = '<button class="back-btn" onclick="window.setWidgetView(\'stages\')">← Voltar</button><div class="error-msg">' + err.message + '</div>';
    }
  };

  window.submitSchedule = async function() {
    var date = document.getElementById('schedule-date').value;
    var content = document.getElementById('schedule-content').value;
    var fileInput = document.getElementById('schedule-file');
    var body = document.getElementById('cw-kanban-modal-body');

    if (!date || !content) {
      alert('Preencha a data e a mensagem');
      return;
    }

    body.innerHTML = '<div class="loading"><div class="spinner"></div><span>Agendando...</span></div>';

    try {
      var authHeaders = getAuthHeaders();
      if (!authHeaders) throw new Error('Sessão não encontrada');

      var formData = new FormData();
      formData.append('scheduledAt', new Date(date).toISOString());
      formData.append('content', content);
      if (fileInput.files.length > 0) {
        formData.append('attachment', fileInput.files[0]);
      }

      var res = await fetch(WIDGET_CONFIG.apiUrl + '/conversations/' + currentConversationId + '/scheduled-messages', {
        method: 'POST',
        headers: authHeaders,
        body: formData
      });

      if (!res.ok) {
        var errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao agendar mensagem');
      }

      body.innerHTML = '<div class="success-msg">✓ Mensagem agendada com sucesso!</div>';
      setTimeout(function() {
        widgetModalState.view = 'scheduling';
        renderWidgetModalContent();
      }, 1500);
    } catch (err) {
      body.innerHTML = '<button class="back-btn" onclick="window.setWidgetView(\'create_schedule\')">← Voltar</button><div class="error-msg">' + err.message + '</div>';
    }
  };

  window.cancelScheduledMessage = async function(id) {
    if (!confirm('Deseja realmente cancelar este agendamento?')) return;
    try {
      var authHeaders = getAuthHeaders();
      if (!authHeaders) throw new Error('Sessão não encontrada');
      var res = await fetch(WIDGET_CONFIG.apiUrl + '/conversations/' + currentConversationId + '/scheduled-messages/' + id, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) throw new Error('Erro ao cancelar agendamento');
      widgetModalState.scheduledMessages = widgetModalState.scheduledMessages.filter(function(m) { return m.id !== id; });
      renderWidgetModalContent();
    } catch (err) {
      alert(err.message);
    }
  };

  window.editScheduledMessage = function(id) {
    var msg = widgetModalState.scheduledMessages.find(function(m) { return m.id === id; });
    if (!msg) return;
    widgetModalState.editingMessage = JSON.parse(JSON.stringify(msg));
    widgetModalState.removeAttachmentFlag = false;
    widgetModalState.view = 'edit_schedule';
    renderWidgetModalContent();
  };

  window.submitUpdateSchedule = async function() {
    var date = document.getElementById('schedule-date').value;
    var content = document.getElementById('schedule-content').value;
    var fileInput = document.getElementById('schedule-file');
    var body = document.getElementById('cw-kanban-modal-body');

    body.innerHTML = '<div class="loading"><div class="spinner"></div><span>Salvando...</span></div>';

    try {
      var authHeaders = getAuthHeaders();
      if (!authHeaders) throw new Error('Sessão não encontrada');

      var formData = new FormData();
      formData.append('scheduledAt', new Date(date).toISOString());
      formData.append('content', content);
      if (fileInput.files.length > 0) {
        formData.append('attachment', fileInput.files[0]);
      }

      if (widgetModalState.removeAttachmentFlag) {
        formData.append('removeAttachment', 'true');
      }

      var res = await fetch(WIDGET_CONFIG.apiUrl + '/conversations/' + currentConversationId + '/scheduled-messages/' + widgetModalState.editingMessage.id, {
        method: 'PATCH',
        headers: authHeaders,
        body: formData
      });

      if (!res.ok) {
        var errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao atualizar mensagem');
      }

      var result = await res.json();

      var index = widgetModalState.scheduledMessages.findIndex(function(m) { return m.id === result.data.id; });
      if (index !== -1) {
        widgetModalState.scheduledMessages[index] = result.data;
      }

      widgetModalState.editingMessage = null;
      body.innerHTML = '<div class="success-msg">✓ Mensagem atualizada com sucesso!</div>';
      setTimeout(function() {
        widgetModalState.view = 'scheduling';
        renderWidgetModalContent();
      }, 1500);
    } catch (err) {
      body.innerHTML = '<div class="error-msg">' + err.message + '</div><button class="btn-primary" style="margin-top:12px" onclick="window.editScheduledMessage(' + widgetModalState.editingMessage.id + ')">Voltar</button>';
    }
  };

  window.removeAttachment = function() {
    if (!confirm('Deseja realmente remover o anexo?')) return;
    widgetModalState.removeAttachmentFlag = true;
    widgetModalState.editingMessage.attachments = null;
    renderWidgetModalContent();
  };

  function updateHeaderButton() {
    var btn = document.getElementById('cw-kanban-header-btn');
    if (!btn) return;

    if (widgetModalState.currentStage) {
      btn.classList.add('has-stage');
      btn.title = 'Kanban: ' + widgetModalState.currentStage.stageName;
    } else {
      btn.classList.remove('has-stage');
      btn.title = 'Configurações do Kanban';
    }
  }

  async function checkCurrentStageWidget() {
    var authHeaders = getAuthHeaders();
    if (!authHeaders || !currentConversationId) return;

    try {
      var res = await fetch(WIDGET_CONFIG.apiUrl + '/kanban/conversation/' + currentConversationId + '/stage', {
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders)
      });

      if (res.ok) {
        var data = await res.json();
        widgetModalState.currentStage = data.data;
        updateHeaderButton();
      }
    } catch (err) {
      // Ignore
    }
  }

  function checkConversationPageWidget() {
    var convId = getConversationIdFromUrl();

    if (convId) {
      currentConversationId = convId;
      var attempts = 0;
      var maxAttempts = 30;

      function tryAddButton() {
        console.log('[Kanban Widget] Tentativa ' + (attempts + 1) + ' de ' + maxAttempts);
        if (createHeaderButton()) {
          console.log('[Kanban Widget] Botão criado com sucesso!');
          checkCurrentStageWidget();
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(tryAddButton, 500);
          } else {
            console.log('[Kanban Widget] Falhou após ' + maxAttempts + ' tentativas');
          }
        }
      }

      setTimeout(tryAddButton, 500);
    } else {
      currentConversationId = null;
      widgetModalState.currentStage = null;
      var btn = document.getElementById('cw-kanban-header-btn');
      if (btn) btn.remove();
    }
  }

  function setupWidgetNavigationDetection() {
    var widgetLastUrl = location.href;

    function onWidgetUrlChange() {
      if (location.href !== widgetLastUrl) {
        widgetLastUrl = location.href;
        checkConversationPageWidget();
      }
    }

    window.addEventListener('popstate', onWidgetUrlChange);

    setInterval(function() {
      if (location.href !== widgetLastUrl) {
        onWidgetUrlChange();
      }
    }, 500);
  }

  function initWidget() {
    injectWidgetCSS();
    createWidgetModal();
    setupWidgetNavigationDetection();
    checkConversationPageWidget();
    console.log('[Kanban Widget] Inicializado');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    setTimeout(initWidget, 100);
  }
})();
