(function () {
  'use strict';

  var promoMessage = 'USE CODE JIYU FOR AN EXTRA 10% OFF';
  var queued = false;

  function upgradePromo() {
    queued = false;
    var promo = document.querySelector('.j-promo');
    if (!promo || promo.dataset.jiyuCode === 'true') return;

    var icon = promo.querySelector('img');
    var message = document.createElement('span');
    message.className = 'j-promo-code-message';
    message.textContent = promoMessage;

    promo.replaceChildren();
    if (icon) promo.appendChild(icon);
    promo.appendChild(message);
    promo.dataset.jiyuCode = 'true';
  }

  function queueUpgrade() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(upgradePromo);
  }

  new MutationObserver(queueUpgrade).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  queueUpgrade();
  window.setTimeout(upgradePromo, 500);
  window.setTimeout(upgradePromo, 1500);
})();
