(function () {
  'use strict';

  var currentScript = document.currentScript;
  var tonerImage = currentScript && (
    currentScript.getAttribute('data-toner-image')
    || currentScript.getAttribute('data-jar-image')
  );
  var moisturizerImage = currentScript && currentScript.getAttribute('data-moisturizer-image');
  var queued = false;
  var singleJarRetailPrice = 86;
  var fiveJarOfferPrice = 153.42;
  var fiveJarSavings = (singleJarRetailPrice * 5 - fiveJarOfferPrice).toFixed(2);

  function productHandle(productKey, fallbackHandle) {
    var configuredProduct = window.JIYU_THEME && window.JIYU_THEME.products
      ? window.JIYU_THEME.products[productKey]
      : null;

    return configuredProduct && configuredProduct.handle
      ? configuredProduct.handle
      : fallbackHandle;
  }

  function isProductPage(handle) {
    var selectedProduct = new URLSearchParams(window.location.search).get('product');
    return window.location.pathname === '/products/' + handle || selectedProduct === handle;
  }

  function currentOfferType() {
    if (isProductPage(productHandle('toner', 'renewal-rejuvenation-toner-pads'))) {
      return 'toner';
    }

    if (isProductPage(productHandle('cream', 'nad-anti-aging-moisturizing-cream'))) {
      return 'moisturizer';
    }

    return null;
  }

  function createJar(imageSource, isFree) {
    var jar = document.createElement('span');
    jar.className = 'j-five-jar' + (isFree ? ' is-free' : '');

    var image = document.createElement('img');
    image.src = imageSource;
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

  function createOffer(options) {
    var offer = document.createElement('span');
    offer.className = 'j-five-jar-offer';
    offer.setAttribute('role', 'img');
    offer.setAttribute('aria-label', options.label);

    var jars = document.createElement('span');
    jars.className = 'j-five-jar-row';
    jars.setAttribute('aria-hidden', 'true');

    for (var index = 0; index < options.jarCount; index += 1) {
      jars.appendChild(createJar(options.image, index >= options.freeFrom));
    }

    offer.appendChild(jars);

    if (options.caption) {
      var caption = document.createElement('span');
      caption.className = 'j-five-jar-caption';
      caption.textContent = options.caption;
      caption.setAttribute('aria-hidden', 'true');
      offer.appendChild(caption);
    }

    return offer;
  }

  function clearOffer(packOptions) {
    Array.prototype.forEach.call(packOptions, function (option) {
      option.classList.remove('j-toner-five-pack', 'j-moisturizer-three-pack');
      delete option.dataset.jiyuOfferType;

      var superscript = option.querySelector('.j-five-jar-sup');
      var visual = option.querySelector('.j-five-jar-offer');
      if (superscript) superscript.remove();
      if (visual) visual.remove();
    });
  }

  function setSavings(option, amount, label) {
    var savings = option && option.querySelector('small');
    var text = 'Save up to $' + amount;
    if (!savings) return;

    if (savings.textContent !== text) savings.textContent = text;
    if (savings.getAttribute('aria-label') !== label) savings.setAttribute('aria-label', label);
  }

  function insertOffer(option, packTitle, offer) {
    if (packTitle && packTitle.nextSibling) {
      option.insertBefore(offer, packTitle.nextSibling);
    } else {
      option.appendChild(offer);
    }
  }

  function buildTonerOffer(option, packTitle) {
    option.classList.add('j-toner-five-pack');
    option.dataset.jiyuOfferType = 'toner';

    var superscript = document.createElement('sup');
    superscript.className = 'j-five-jar-sup';
    superscript.textContent = '+2 FREE';
    if (packTitle) packTitle.appendChild(superscript);

    insertOffer(option, packTitle, createOffer({
      image: tonerImage,
      jarCount: 5,
      freeFrom: 3,
      caption: 'BUY 3 · GET 2 FREE',
      label: 'Buy 3 toner jars and get 2 toner jars free'
    }));
  }

  function buildMoisturizerOffer(option, packTitle) {
    option.classList.add('j-moisturizer-three-pack');
    option.dataset.jiyuOfferType = 'moisturizer';

    insertOffer(option, packTitle, createOffer({
      image: moisturizerImage,
      jarCount: 3,
      freeFrom: Infinity,
      caption: '3 MOISTURIZER JARS',
      label: 'Three moisturizer jars'
    }));
  }

  function enhanceOffer() {
    queued = false;

    var packSelector = document.querySelector('.j-packs');
    if (!packSelector) return;

    var packOptions = packSelector.querySelectorAll(':scope > label');
    if (packOptions.length < 3) return;

    var offerType = currentOfferType();
    var offerOption = packOptions[2];
    var packTitle = offerOption.querySelector('strong');

    if (!offerType) {
      if (offerOption.dataset.jiyuOfferType) clearOffer(packOptions);
      return;
    }

    if (offerType === 'moisturizer') {
      setSavings(
        packOptions[1],
        '47.97',
        'Save up to 47.97 dollars compared with two individual moisturizer jars'
      );
      setSavings(
        offerOption,
        '95.94',
        'Save up to 95.94 dollars compared with three individual moisturizer jars'
      );

      if (offerOption.dataset.jiyuOfferType !== 'moisturizer' && moisturizerImage) {
        clearOffer(packOptions);
        buildMoisturizerOffer(offerOption, packTitle);
      }
      return;
    }

    setSavings(
      packOptions[1],
      '17.12',
      'Save up to 17.12 dollars compared with two individual toner jars'
    );
    setSavings(
      offerOption,
      fiveJarSavings,
      'Save up to ' + fiveJarSavings + ' dollars compared with five individual toner jars'
    );

    if (offerOption.dataset.jiyuOfferType !== 'toner' && tonerImage) {
      clearOffer(packOptions);
      buildTonerOffer(offerOption, packTitle);
    }
  }

  function queueEnhancement() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(enhanceOffer);
  }

  new MutationObserver(queueEnhancement).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  queueEnhancement();
  window.setTimeout(enhanceOffer, 500);
  window.setTimeout(enhanceOffer, 1500);
})();
