(function () {
  var overlay;
  var previousFocus;
  var previousOverflow;

  var tabs = {
    'For You': 'Sign in to your account',
    Orders: 'Manage orders, track shipments, and easily start a return',
    Profile: 'Manage addresses, contact info, and personal preferences'
  };

  function accountUrl() {
    return window.JIYU_THEME && window.JIYU_THEME.accountUrl
      ? window.JIYU_THEME.accountUrl
      : '/account';
  }

  function money(cents) {
    if (window.JIYU_THEME && typeof window.JIYU_THEME.formatMoney === 'function') {
      return window.JIYU_THEME.formatMoney(cents);
    }
    return '$' + ((Number(cents) || 0) / 100).toFixed(2);
  }

  function addAccountActions(container) {
    var signIn = document.createElement('button');
    signIn.className = 'j-button';
    signIn.type = 'button';
    signIn.textContent = 'SIGN IN OR SIGN UP';
    signIn.addEventListener('click', function () {
      window.location.assign(accountUrl());
    });
    container.appendChild(signIn);

    var signInWithShop = document.createElement('button');
    signInWithShop.className = 'j-button';
    signInWithShop.type = 'button';
    signInWithShop.append('SIGN IN WITH ');
    var shopWord = document.createElement('b');
    shopWord.className = 'j-shop-word';
    shopWord.textContent = 'shop';
    signInWithShop.appendChild(shopWord);
    signInWithShop.addEventListener('click', function () {
      window.location.assign(accountUrl());
    });
    container.appendChild(signInWithShop);

    var terms = document.createElement('p');
    terms.className = 'j-account-terms';
    terms.append('By signing in, you agree to our ');
    var privacy = document.createElement('a');
    privacy.href = '/policies/privacy-policy';
    privacy.textContent = 'privacy policy';
    terms.appendChild(privacy);
    terms.append(' and ');
    var termsLink = document.createElement('a');
    termsLink.href = '/policies/terms-of-service';
    termsLink.textContent = 'terms of service';
    terms.appendChild(termsLink);
    container.appendChild(terms);
  }

  function addForYouContent(container) {
    container.appendChild(document.createElement('hr'));

    var heading = document.createElement('h2');
    heading.textContent = 'Recently Viewed';
    container.appendChild(heading);

    var products = document.createElement('div');
    products.className = 'j-account-products';
    var configured = window.JIYU_THEME && window.JIYU_THEME.products
      ? Object.values(window.JIYU_THEME.products).filter(Boolean)
      : [];

    configured.forEach(function (product) {
      var link = document.createElement('a');
      link.href = product.url || ('/products/' + product.handle);

      var image = document.createElement('img');
      image.src = product.featured_image || (product.images && product.images[0]) || '';
      image.alt = product.title || '';
      image.loading = 'lazy';
      link.appendChild(image);

      var title = document.createElement('h3');
      title.textContent = product.title || '';
      link.appendChild(title);

      if (product.price != null) {
        var price = document.createElement('small');
        price.textContent = money(product.price);
        link.appendChild(price);
      }

      products.appendChild(link);
    });

    if (configured.length) {
      container.appendChild(products);
    }

    var links = document.createElement('div');
    links.className = 'j-account-links';
    [
      ['/pages/faq-page', 'FAQ'],
      ['/pages/about-us', 'Our Story'],
      ['/blogs/news', 'Resources']
    ].forEach(function (item) {
      var link = document.createElement('a');
      link.href = item[0];
      link.textContent = item[1];
      links.appendChild(link);
    });
    container.appendChild(links);
  }

  function renderPanel(panel, tabName) {
    panel.replaceChildren();
    var heading = document.createElement('h2');
    heading.id = 'j-account-panel-heading';
    heading.textContent = tabs[tabName];
    panel.appendChild(heading);
    addAccountActions(panel);
    if (tabName === 'For You') {
      addForYouContent(panel);
    }
  }

  function closeDrawer() {
    if (!overlay) return;
    var focusTarget = previousFocus;
    var trigger = document.querySelector('button[aria-label="Account"]');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = previousOverflow || '';
    overlay.remove();
    overlay = null;
    requestAnimationFrame(function () {
      if (focusTarget && focusTarget.isConnected) focusTarget.focus();
    });
  }

  function keepFocusInside(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key !== 'Tab' || !overlay) return;
    var focusable = Array.from(
      overlay.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')
    ).filter(function (element) {
      return !element.disabled && element.getClientRects().length;
    });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openDrawer(trigger) {
    if (overlay) return;
    previousFocus = trigger;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-controls', 'j-account-drawer');

    overlay = document.createElement('div');
    overlay.className = 'j-backdrop j-account-backdrop';
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeDrawer();
    });
    overlay.addEventListener('keydown', keepFocusInside);

    var dialog = document.createElement('div');
    dialog.id = 'j-account-drawer';
    dialog.className = 'j-dialog j-account-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Customer account');
    overlay.appendChild(dialog);

    var close = document.createElement('button');
    close.className = 'j-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close account menu');
    close.textContent = '×';
    close.addEventListener('click', closeDrawer);
    dialog.appendChild(close);

    var accountPanel = document.createElement('div');
    accountPanel.className = 'j-account-panel';
    dialog.appendChild(accountPanel);

    var logo = document.createElement('img');
    logo.className = 'j-account-logo';
    logo.src = document.querySelector('.j-logo img')?.src || '';
    logo.alt = 'JIYU';
    accountPanel.appendChild(logo);

    var body = document.createElement('div');
    body.className = 'j-account-body';
    body.id = 'j-account-tabpanel';
    body.setAttribute('role', 'tabpanel');
    body.setAttribute('aria-labelledby', 'j-account-tab-for-you');
    accountPanel.appendChild(body);

    var tabList = document.createElement('div');
    tabList.className = 'j-account-tabs';
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Account sections');
    accountPanel.appendChild(tabList);

    Object.keys(tabs).forEach(function (tabName, index) {
      var tab = document.createElement('button');
      tab.id = 'j-account-tab-' + tabName.toLowerCase().replace(/\s+/g, '-');
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'j-account-tabpanel');
      tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      tab.tabIndex = index === 0 ? 0 : -1;
      tab.textContent = tabName.toUpperCase();
      tab.addEventListener('click', function () {
        if (tabName === 'Orders') {
          closeDrawer();
          window.location.assign('/apps/parcelpanel');
          return;
        }
        tabList.querySelectorAll('[role="tab"]').forEach(function (item) {
          var selected = item === tab;
          item.setAttribute('aria-selected', selected ? 'true' : 'false');
          item.tabIndex = selected ? 0 : -1;
        });
        body.setAttribute('aria-labelledby', tab.id);
        renderPanel(body, tabName);
      });
      tabList.appendChild(tab);
    });

    renderPanel(body, 'For You');
    document.body.appendChild(overlay);
    close.focus();
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('button[aria-label="Account"]');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openDrawer(trigger);
  }, true);
})();
