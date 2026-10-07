(function () {
  'use strict';

  var theme = window.JIYU_THEME || {};
  var nativeFetch = window.fetch.bind(window);
  var cartRoutes = {
    'cart.js': 'get',
    'cart/add.js': 'add',
    'cart/change.js': 'change',
    'cart/update.js': 'update'
  };

  function cartAction(input) {
    var raw = typeof input === 'string' ? input : (input && input.url) || '';
    var url;
    try {
      url = new URL(raw, window.location.origin);
    } catch (_) {
      return null;
    }

    if (url.origin !== window.location.origin) return null;
    var path = url.pathname.replace(/^\/+|\/+$/g, '');
    return cartRoutes[path] || null;
  }

  window.fetch = function (input, init) {
    var action = cartAction(input);
    if (!action || !theme.cartApi) return nativeFetch(input, init);

    var source = init || {};
    var headers = new Headers(source.headers || {});
    headers.set('Accept', 'application/json');
    headers.set('X-WP-Nonce', theme.restNonce || '');
    if (action !== 'get') headers.set('Content-Type', 'application/json');

    return nativeFetch(theme.cartApi.replace(/\/$/, '') + '/' + action, {
      method: action === 'get' ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: headers,
      body: action === 'get' ? undefined : source.body
    });
  };

  function rewritePath(pathname) {
    var paths = {
      '/checkout': theme.checkoutUrl,
      '/checkout/': theme.checkoutUrl,
      '/account': theme.accountUrl,
      '/account/': theme.accountUrl,
      '/apps/parcelpanel': theme.trackingUrl,
      '/apps/parcelpanel/': theme.trackingUrl
    };
    return paths[pathname] || null;
  }

  function isLegacyStoreHost(hostname) {
    return ['jiyuskin.com', 'www.jiyuskin.com', 'getjiyuskin.com', 'www.getjiyuskin.com'].indexOf(hostname) !== -1;
  }

  function normalizeLegacyLinks(root) {
    var scope = root && root.querySelectorAll ? root : document;
    Array.prototype.forEach.call(scope.querySelectorAll('a[href]'), function (link) {
      var url;
      try {
        url = new URL(link.href, window.location.origin);
      } catch (_) {
        return;
      }
      if (isLegacyStoreHost(url.hostname) && url.origin !== window.location.origin) {
        link.href = window.location.origin + url.pathname + url.search + url.hash;
      }
    });
  }

  function enforcePurchaseAvailability(root) {
    if (theme.subscriptionsEnabled) return;
    var scope = root && root.querySelectorAll ? root : document;
    Array.prototype.forEach.call(scope.querySelectorAll('.j-modes'), function (modes) {
      var labels = modes.querySelectorAll(':scope > label');
      if (labels.length < 2) return;
      labels[0].hidden = true;
      labels[0].setAttribute('aria-hidden', 'true');
      var oneTime = labels[1].querySelector('input[type="radio"]');
      if (oneTime && !oneTime.checked) oneTime.click();
      modes.classList.add('j-modes--one-time-only');
    });
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;
    var url;
    try {
      url = new URL(link.href, window.location.origin);
    } catch (_) {
      return;
    }
    if (url.origin !== window.location.origin) return;
    var destination = rewritePath(url.pathname);
    if (!destination) return;
    event.preventDefault();
    window.location.assign(destination);
  }, true);

  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
        if (node.nodeType === 1) {
          normalizeLegacyLinks(node);
          enforcePurchaseAvailability(node);
        }
      });
    });
  }).observe(document.documentElement, {childList: true, subtree: true});

  normalizeLegacyLinks(document);
  enforcePurchaseAvailability(document);

  if (window.location.pathname === '/checkout' || window.location.pathname === '/checkout/') {
    window.location.replace(theme.checkoutUrl || '/checkout/');
  }
})();

