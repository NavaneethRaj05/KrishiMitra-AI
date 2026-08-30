/**
 * KrishiMitra AI — Shared Navigation
 * Portal-aware sidebar, topbar, and portal switcher
 */

const KrishiNav = (() => {
  const PORTALS = {
    farmer: {
      id: 'farmer', label: 'Farmer Portal', icon: '🌱', color: '#10B981',
      basePath: '/farmer/',
      nav: [
        { label: 'Dashboard',           href: '/farmer/',                        icon: 'home' },
        { label: 'My Crops',            href: '/farmer/#crops',                  icon: 'leaf' },
        { label: 'Crop Recommendation', href: '/farmer/recommendation.html',     icon: 'sparkles' },
        { label: 'Disease Scanner',     href: '/farmer/disease-scanner.html',    icon: 'scan' },
        { label: 'Tasks & Calendar',    href: '/farmer/tasks.html',              icon: 'calendar' },
        { label: 'Tools',               href: '/farmer/tools.html',              icon: 'wrench' },
        { label: 'Knowledge Library',   href: '/farmer/library.html',            icon: 'book-open' },
        { label: 'Alerts',              href: '/farmer/alerts.html',             icon: 'bell' },
      ]
    },
    buyer: {
      id: 'buyer', label: 'Buyer & Trader', icon: '🏪', color: '#3b82f6',
      basePath: '/buyer/',
      nav: [
        { label: 'Market Dashboard',    href: '/buyer/',                   icon: 'bar-chart-2' },
        { label: 'Live Mandi',          href: '/buyer/mandi.html',        icon: 'trending-up' },
        { label: 'Direct Sourcing',     href: '/buyer/sourcing.html',     icon: 'package' },
        { label: 'Procurement',         href: '/buyer/procurement.html',  icon: 'shopping-cart' },
        { label: 'Contracts',           href: '/buyer/contracts.html',    icon: 'file-text' },
        { label: 'Fertilizers & Shops', href: '/buyer/fertilizer-finder.html', icon: 'wrench' },
        { label: 'Price Forecast',      href: '/buyer/forecast.html',     icon: 'activity' },
        { label: 'Traceability',        href: '/buyer/traceability.html', icon: 'git-branch' },
        { label: 'Analytics',           href: '/buyer/analytics.html',    icon: 'pie-chart' },
      ]
    },
    ai: {
      id: 'ai', label: 'KrishiMitra AI', icon: '🤖', color: '#8b5cf6',
      basePath: '/ai/',
      nav: [
        // Voice input is now a mic button inside the chat composer — not a separate sidebar page.
        { label: 'New Chat',            href: 'javascript:AIPortal.startNewChat()',                 icon: 'message-square' },
        { label: 'Chat History',        href: 'javascript:AIPortal.showHistoryModal()',             icon: 'clock' },
        { label: 'Knowledge Sources',   href: 'javascript:AIPortal.showKnowledgeSourcesModal()',   icon: 'database' },
        { label: 'Settings',            href: 'javascript:AIPortal.showSettingsModal()',            icon: 'settings' },
      ]
    }
  };

  // Lucide icon SVG paths (subset)
  const ICONS = {
    'home': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
    'leaf': '<path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 20 6 20 6s.7 5-3.7 9.5"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>',
    'sparkles': '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>',
    'scan': '<path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><circle cx="12" cy="12" r="4"></circle>',
    'wrench': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>',
    'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>',
    'bell': '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>',
    'bar-chart-2': '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>',
    'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>',
    'package': '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>',
    'shopping-cart': '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>',
    'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>',
    'activity': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
    'git-branch': '<line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path>',
    'pie-chart': '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path>',
    'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
    'clock': '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
    'mic': '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>',
    'database': '<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>',
    'settings': '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
    'menu': '<line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>',
    'x': '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
    'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>',
    'chevron-down': '<polyline points="6 9 12 15 18 9"></polyline>',
    'grid': '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
    'wifi': '<path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line>',
    'wifi-off': '<line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.56 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line>',
    'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
  };

  function icon(name, size = 18) {
    const path = ICONS[name] || ICONS['home'];
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }

  function detectPortal() {
    const path = window.location.pathname;
    if (path.includes('/farmer')) return 'farmer';
    if (path.includes('/buyer')) return 'buyer';
    if (path.includes('/ai')) return 'ai';
    return 'farmer';
  }

  function isActivePath(href) {
    const current = window.location.pathname + window.location.hash;
    // Exact match for index pages
    if (href.endsWith('/') && current === href) return true;
    if (href.endsWith('/index.html') && (current === href || current === href.replace('index.html', ''))) return true;
    // File match
    if (!href.endsWith('/') && current.includes(href.split('/').pop())) return true;
    return false;
  }

  function renderSidebar(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const portalId = detectPortal();
    const portal = PORTALS[portalId];

    container.className = 'portal-sidebar';
    container.style.cssText = `
      background: ${portalId === 'farmer' ? '#fafdf9' : portalId === 'buyer' ? '#f8fafc' : '#0f0f14'};
      border-right: 1px solid ${portalId === 'ai' ? '#1e1e2e' : '#e2e8f0'};
      padding: 16px 12px;
    `;

    const textColor = portalId === 'ai' ? '#e2e8f0' : '#334155';
    const mutedColor = portalId === 'ai' ? '#64748b' : '#94a3b8';
    const hoverBg = portalId === 'ai' ? 'rgba(139,92,246,0.1)' : portalId === 'buyer' ? 'rgba(59,130,246,0.06)' : 'rgba(16,185,129,0.06)';

    let html = `
      <!-- Logo -->
      <a href="/" style="display:flex;align-items:center;gap:10px;padding:8px;margin-bottom:8px;text-decoration:none;">
        <div style="width:36px;height:36px;border-radius:10px;background:${portal.color};display:flex;align-items:center;justify-content:center;font-size:18px;">${portal.icon}</div>
        <div>
          <div style="font-family:var(--font-display);font-weight:700;font-size:15px;color:${portal.color};letter-spacing:-0.3px;">KrishiMitra</div>
          <div style="font-size:11px;color:${mutedColor};margin-top:-2px;">${portal.label}</div>
        </div>
      </a>
      <div style="height:1px;background:${portalId === 'ai' ? '#1e1e2e' : '#e2e8f0'};margin:8px 0 12px;"></div>
      <!-- Nav -->
      <nav style="display:flex;flex-direction:column;gap:2px;flex:1;">
    `;

    portal.nav.forEach(item => {
      const active = isActivePath(item.href);
      const activeBg = active ? hoverBg : 'transparent';
      const activeColor = active ? portal.color : textColor;
      const weight = active ? '600' : '500';
      html += `
        <a href="${item.href}" class="sidebar-nav-item" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;color:${activeColor};font-weight:${weight};font-size:13px;background:${activeBg};transition:background 0.15s;text-decoration:none;"
           onmouseenter="this.style.background='${hoverBg}'" onmouseleave="this.style.background='${active ? hoverBg : 'transparent'}'">
          <span style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:${active ? portal.color + '18' : 'transparent'};flex-shrink:0;">${icon(item.icon, 18)}</span>
          ${item.label}
          ${active ? `<span style="position:absolute;right:0;top:8px;bottom:8px;width:3px;border-radius:99px;background:${portal.color};"></span>` : ''}
        </a>
      `;
    });

    html += `
      </nav>
      <!-- Bottom: Portal Switch -->
      <div style="margin-top:auto;padding-top:12px;border-top:1px solid ${portalId === 'ai' ? '#1e1e2e' : '#e2e8f0'};">
        <div class="portal-switch" style="position:relative;">
          <button onclick="KrishiNav.togglePortalMenu()" class="portal-switch-btn" style="width:100%;justify-content:flex-start;background:${portalId === 'ai' ? '#1a1a2e' : '#f1f5f9'};border-color:${portalId === 'ai' ? '#2d2d44' : '#e2e8f0'};color:${textColor};">
            ${icon('grid', 16)} <span style="flex:1;text-align:left;">Switch Portal</span> ${icon('chevron-down', 14)}
          </button>
          <div id="portal-switch-menu" class="portal-switch-menu" style="bottom:calc(100% + 4px);top:auto;left:0;right:0;">
            ${Object.values(PORTALS).map(p => `
              <a href="${p.basePath}" class="portal-switch-item ${p.id === portalId ? 'active' : ''}">
                <span class="portal-switch-item-icon">${p.icon}</span>
                <span>${p.label}</span>
              </a>
            `).join('')}
            <div style="height:1px;background:${portalId === 'ai' ? '#2d2d44' : '#e2e8f0'};margin:4px 0;"></div>
            <a href="/" class="portal-switch-item">
              <span class="portal-switch-item-icon">🏠</span>
              <span>Home</span>
            </a>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  function renderTopbar(containerId, title) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const portalId = detectPortal();
    const portal = PORTALS[portalId];

    const currentLang = localStorage.getItem('krishimitra_lang') || 'en';
    const isDark = portalId === 'ai';
    const selectBg = isDark ? '#1a1a2e' : '#ffffff';
    const selectBorder = isDark ? '#2d2d44' : '#e2e8f0';
    const selectColor = isDark ? '#e2e8f0' : '#334155';

    container.className = 'portal-topbar';
    container.innerHTML = `
      <button onclick="KrishiNav.toggleSidebar()" class="btn btn-ghost btn-sm" style="display:none;" id="menu-toggle">
        ${icon('menu', 20)}
      </button>
      <span class="heading-md" style="flex:1;">${title || ''}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <select id="global-lang-select" onchange="localStorage.setItem('krishimitra_lang', this.value); if (window.AIPortal && window.AIPortal.renderWelcomeOrMessages) window.AIPortal.renderWelcomeOrMessages();" style="padding:4px 8px;border-radius:8px;border:1px solid ${selectBorder};font-size:12px;background:${selectBg};color:${selectColor};cursor:pointer;outline:none;">
          <option value="en" ${currentLang === 'en' ? 'selected' : ''}>🌐 English</option>
          <option value="kn" ${currentLang === 'kn' ? 'selected' : ''}>🌐 ಕನ್ನಡ</option>
          <option value="hi" ${currentLang === 'hi' ? 'selected' : ''}>🌐 हिंदी</option>
          <option value="te" ${currentLang === 'te' ? 'selected' : ''}>🌐 తెలుగు</option>
          <option value="ta" ${currentLang === 'ta' ? 'selected' : ''}>🌐 தமிழ்</option>
          <option value="mr" ${currentLang === 'mr' ? 'selected' : ''}>🌐 मराठी</option>
        </select>
        <div id="online-indicator" class="flex items-center gap-2" style="padding:4px 10px;border-radius:99px;font-size:12px;font-weight:600;"></div>
      </div>
    `;

    // Setup responsive menu toggle
    const toggleBtn = document.getElementById('menu-toggle');
    const checkWidth = () => {
      if (window.innerWidth <= 1024) {
        toggleBtn.style.display = 'flex';
      } else {
        toggleBtn.style.display = 'none';
      }
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);

    // Online indicator
    updateOnlineIndicator();
    if (window.KrishiAPI) {
      KrishiAPI.onStatusChange(updateOnlineIndicator);
    }
  }

  function updateOnlineIndicator() {
    const el = document.getElementById('online-indicator');
    if (!el) return;
    const online = window.KrishiAPI ? KrishiAPI.isOnline() : navigator.onLine;
    el.style.background = online ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)';
    el.style.color = online ? '#059669' : '#d97706';
    el.innerHTML = `<span class="status-dot ${online ? 'online' : 'offline'}"></span> ${online ? 'Online' : 'Offline'}`;
  }

  function toggleSidebar() {
    const sidebar = document.querySelector('.portal-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
  }

  function togglePortalMenu() {
    const menu = document.getElementById('portal-switch-menu');
    if (menu) menu.classList.toggle('open');
  }

  // Close portal menu on outside click
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('portal-switch-menu');
    if (menu && menu.classList.contains('open') && !e.target.closest('.portal-switch')) {
      menu.classList.remove('open');
    }
  });

  return {
    PORTALS,
    icon,
    detectPortal,
    renderSidebar,
    renderTopbar,
    toggleSidebar,
    togglePortalMenu,
    updateOnlineIndicator,
  };
})();

window.KrishiNav = KrishiNav;
