(function () {
  'use strict';

  var currentScript = document.currentScript;
  var jarImage = currentScript && currentScript.getAttribute('data-jar-image');
  var queued = false;
  var singleJarRetailPrice = 86;
  var fiveJarOfferPrice = 153.42;
  var fiveJarSavings = (singleJarRetailPrice * 5 - fiveJarOfferPrice).toFixed(2);

  function isTonerPage() {
    var configuredProduct = window.JIYU_THEME && window.JIYU_THEME.products
      ? window.JIYU_THEME.products.toner
      : null;
    var handle = configuredProduct && configuredProduct.handle
      ? configuredProduct.handle
      : 'renewal-rejuvenation-toner-pads';

    return window.location.pathname === '/products/' + handle;
  }

  function createJar(isFree) {
    var jar = document.createElement('span');
    jar.className = 'j-five-jar' + (isFree ? ' is-free' : '');

    var image = document.createElement('img');
    image.src = jarImage;
    image.alt = '';
    image.width = 28;
    image.height = 28;
    jar.appendChild(image);

    if (isFree) {
      var ribbon = document.createElement('span');
      ribbon.className = 'j-five-jar-free';
      ribbon.textContent = 'FREE';
      jar.appendChild(ribbon);
    }

    return jar;
  }

  function createOffer() {
    var offer = document.createElement('span');
    offer.className = 'j-five-jar-offer';
    offer.setAttribute('role', 'img');
    offer.setAttribute('aria-label', 'Buy 3 jars and get 2 jars free');

    var jars = document.createElement('span');
    jars.className = 'j-five-jar-row';
    jars.setAttribute('aria-hidden', 'true');

    for (var index = 0; index < 5; index += 1) {
      jars.appendChild(createJar(index >= 3));
    }

    var caption = document.createElement('span');
    caption.className = 'j-five-jar-caption';
    caption.textContent = 'BUY 3 · GET 2 FREE';
    caption.setAttribute('aria-hidden', 'true');

    offer.appendChild(jars);
    offer.appendChild(caption);
    return offer;
  }

  function enhanceOffer() {
    queued = false;
    if (!isTonerPage() || !jarImage) return;

    var packSelector = document.querySelector('.j-packs');
    if (!packSelector) return;

    var packOptions = packSelector.querySelectorAll(':scope > label');
    if (packOptions.length < 3) return;

    var offerOption = packOptions[2];
    offerOption.classList.add('j-toner-five-pack');
    var packTitle = offerOption.querySelector('strong');
    var savings = offerOption.querySelector('small');

    if (packTitle && !packTitle.querySelector('.j-five-jar-sup')) {
      var superscript = document.createElement('sup');
      superscript.className = 'j-five-jar-sup';
      superscript.textContent = '+2 FREE';
      packTitle.appendChild(superscript);
    }

    if (savings) {
      savings.textContent = 'Save up to $' + fiveJarSavings;
      savings.setAttribute('aria-label', 'Save up to ' + fiveJarSavings + ' dollars compared with five individual jars');
    }

    if (offerOption.querySelector('.j-five-jar-offer')) return;

    var offer = createOffer();

    if (packTitle && packTitle.nextSibling) {
      offerOption.insertBefore(offer, packTitle.nextSibling);
    } else {
      offerOption.appendChild(offer);
    }
  }

  function queueEnhancement() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(enhanceOffer);
  }

  if (!isTonerPage()) return;

  new MutationObserver(queueEnhancement).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  queueEnhancement();
  window.setTimeout(enhanceOffer, 500);
  window.setTimeout(enhanceOffer, 1500);
})();
