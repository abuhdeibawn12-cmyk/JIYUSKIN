(function () {
  'use strict';

  var attached = new WeakSet();
  var providerOrigin = 'https://app.thefrontrowhealth.com';

  function attach(section) {
    if (!section || attached.has(section)) return;
    var frame = section.querySelector('iframe[src*="thefrontrowhealth.com"]');
    if (!frame) return;
    attached.add(section);
    section.classList.remove('jcr-ready');
    section.classList.add('jcr-loading');
    section.setAttribute('aria-busy', 'true');

    var ready = false;
    var unavailableTimer = 0;

    function markReady() {
      if (ready) return;
      ready = true;
      window.clearTimeout(unavailableTimer);
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          if (!section.isConnected) return;
          section.classList.remove('jcr-loading');
          section.classList.remove('jcr-unavailable');
          section.classList.add('jcr-ready');
          section.removeAttribute('aria-busy');
          section.removeAttribute('aria-hidden');
        });
      });
    }

    function onMessage(event) {
      if (event.origin !== providerOrigin || !section.isConnected) return;
      var currentFrame = section.querySelector('iframe[src*="thefrontrowhealth.com"]');
      if (!currentFrame || event.source !== currentFrame.contentWindow) return;
      var message = event.data;
      if (!message || message.name !== 'RESIZE_TESTIMONIALS_HEIGHT') return;
      if (!Number.isFinite(message.value) || message.value <= 600) return;
      markReady();
    }

    window.addEventListener('message', onMessage);

    unavailableTimer = window.setTimeout(function () {
      if (ready || !section.isConnected) return;
      section.classList.add('jcr-unavailable');
      section.removeAttribute('aria-busy');
      section.setAttribute('aria-hidden', 'true');
    }, 12000);
  }

  function scan(root) {
    var scope = root && root.querySelectorAll ? root : document;
    if (scope.matches && scope.matches('.j-clinician-reviews')) attach(scope);
    Array.prototype.forEach.call(scope.querySelectorAll('.j-clinician-reviews'), attach);
  }

  scan(document);
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      Array.prototype.forEach.call(record.addedNodes, function (node) {
        if (node.nodeType === 1) scan(node);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
