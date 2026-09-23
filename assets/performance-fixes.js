(function () {
  'use strict';

  var attached = new WeakSet();

  function resourceFinished(url) {
    if (!url || !window.performance || !performance.getEntriesByName) return false;
    return performance.getEntriesByName(url).some(function (entry) {
      return entry.responseEnd > 0 || entry.duration > 0;
    });
  }

  function attach(section) {
    if (!section || attached.has(section)) return;
    var frame = section.querySelector('iframe[src*="thefrontrowhealth.com"]');
    if (!frame) return;
    attached.add(section);
    section.classList.remove('jcr-ready');
    section.classList.add('jcr-loading');
    section.setAttribute('aria-busy', 'true');

    var complete = false;
    var readyTimer = 0;
    var fallbackTimer = 0;

    function markReady() {
      if (complete) return;
      complete = true;
      window.clearTimeout(readyTimer);
      window.clearTimeout(fallbackTimer);
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          section.classList.remove('jcr-loading');
          section.classList.add('jcr-ready');
          section.removeAttribute('aria-busy');
        });
      });
    }

    frame.addEventListener('load', function () {
      readyTimer = window.setTimeout(markReady, 350);
    }, { once: true });

    if (resourceFinished(frame.src)) readyTimer = window.setTimeout(markReady, 180);
    fallbackTimer = window.setTimeout(markReady, 12000);
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
