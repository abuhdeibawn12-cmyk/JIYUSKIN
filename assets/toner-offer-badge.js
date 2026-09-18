(function () {
  'use strict';

  var currentScript = document.currentScript;
  var tonerImage = currentScript && (
    currentScript.getAttribute('data-toner-image')
    || currentScript.getAttribute('data-jar-image')
  );
  var moisturizerImage = currentScript && currentScript.getAttribute('data-moisturizer-image');
  var queued = false;

  function money(cents) {
    if (window.JIYU_THEME && typeof window.JIYU_THEME.formatMoney === 'function') {
      return window.JIYU_THEME.formatMoney(cents);
    }
    return '$' + ((Number(cents) || 0) / 100).toFixed(2);
  }

  function bestPackPrice(productKey, packIndex) {
    var product = window.JIYU_THEME && window.JIYU_THEME.products
      ? window.JIYU_THEME.products[productKey]
      : null;
    var variant = product && product.variants ? product.variants[packIndex] : null;
    var allocation = variant && variant.selling_plan_allocations
      ? variant.selling_plan_allocations[0]
      : null;

    if (!variant) return 0;
    return Number(allocation && allocation.price != null ? allocation.price : variant.price) || 0;
  }

  function singleRetailPrice(productKey) {
    var product = window.JIYU_THEME && window.JIYU_THEME.products
      ? window.JIYU_THEME.products[productKey]
      : null;
    var variant = product && product.variants ? product.variants[0] : null;
    return Number(variant && variant.price) || 0;
  }

  function maximumSavings(productKey, packIndex, itemCount) {
    var singlePrice = singleRetailPrice(productKey);
    var packPrice = bestPackPrice(productKey, packIndex);
    return Math.max(0, (singlePrice * itemCount) - packPrice);
  }

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

    if (isProductPage(productHandle('bundle', 'test-complete-care-bundle'))) {
      return 'bundle';
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

  function createBundlePair(isFree) {
    var pair = document.createElement('span');
    pair.className = 'j-five-jar j-bundle-pair' + (isFree ? ' is-free' : '');

    [tonerImage, moisturizerImage].forEach(function (imageSource) {
      var image = document.createElement('img');
      image.src = imageSource;
      image.alt = '';
      image.width = 17;
      image.height = 28;
      pair.appendChild(image);
    });

    if (isFree) {
      var ribbon = document.createElement('span');
      ribbon.className = 'j-five-jar-free';
      ribbon.textContent = 'FREE';
      pair.appendChild(ribbon);
    }

    return pair;
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
      jars.appendChild(options.createItem
        ? options.createItem(index >= options.freeFrom)
        : createJar(options.image, index >= options.freeFrom));
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
      option.classList.remove(
        'j-toner-five-pack',
        'j-moisturizer-three-pack',
        'j-bundle-five-pack'
      );
      delete option.dataset.jiyuOfferType;

      var superscript = option.querySelector('.j-five-jar-sup');
      var visual = option.querySelector('.j-five-jar-offer');
      if (superscript) superscript.remove();
      if (visual) visual.remove();
    });
  }

  function setSavings(option, amount, comparison) {
    var savings = option && option.querySelector('small');
    var formattedAmount = money(amount);
    var text = 'Save up to ' + formattedAmount;
    var label = text + ' ' + comparison;
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

    var superscript = document.createElement('sup');
    superscript.className = 'j-five-jar-sup';
    superscript.textContent = '+2 FREE';
    if (packTitle) packTitle.appendChild(superscript);

    insertOffer(option, packTitle, createOffer({
      image: moisturizerImage,
      jarCount: 5,
      freeFrom: 3,
      caption: 'BUY 3 · GET 2 FREE',
      label: 'Buy 3 moisturizer jars and get 2 moisturizer jars free'
    }));
  }

  function buildBundleOffer(option, packTitle) {
    option.classList.add('j-bundle-five-pack');
    option.dataset.jiyuOfferType = 'bundle';

    var superscript = document.createElement('sup');
    superscript.className = 'j-five-jar-sup';
    superscript.textContent = '+2 FREE';
    if (packTitle) packTitle.appendChild(superscript);

    insertOffer(option, packTitle, createOffer({
      jarCount: 5,
      freeFrom: 3,
      createItem: createBundlePair,
      caption: 'BUY 3 · GET 2 FREE · 5 OF EACH',
      label: 'Buy 3 bundle sets and get 2 bundle sets free, for 5 toner and 5 moisturizer jars'
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
        maximumSavings('cream', 1, 2),
        'compared with two individual moisturizer jars'
      );
      setSavings(
        offerOption,
        maximumSavings('cream', 2, 5),
        'compared with five individual moisturizer jars'
      );

      if (
        (offerOption.dataset.jiyuOfferType !== 'moisturizer'
          || !offerOption.querySelector('.j-five-jar-offer'))
        && moisturizerImage
      ) {
        clearOffer(packOptions);
        buildMoisturizerOffer(offerOption, packTitle);
      } else {
        offerOption.classList.remove('j-toner-five-pack');
        offerOption.classList.add('j-moisturizer-three-pack');
      }
      return;
    }

    if (offerType === 'bundle') {
      setSavings(
        packOptions[1],
        maximumSavings('bundle', 1, 2),
        'compared with two individual bundle sets'
      );
      setSavings(
        offerOption,
        maximumSavings('bundle', 2, 5),
        'compared with five individual bundle sets'
      );

      if (
        (offerOption.dataset.jiyuOfferType !== 'bundle'
          || !offerOption.querySelector('.j-five-jar-offer'))
        && tonerImage
        && moisturizerImage
      ) {
        clearOffer(packOptions);
        buildBundleOffer(offerOption, packTitle);
      } else {
        offerOption.classList.remove('j-toner-five-pack', 'j-moisturizer-three-pack');
        offerOption.classList.add('j-bundle-five-pack');
      }
      return;
    }

    setSavings(
      packOptions[1],
      maximumSavings('toner', 1, 2),
      'compared with two individual toner jars'
    );
    setSavings(
      offerOption,
      maximumSavings('toner', 2, 5),
      'compared with five individual toner jars'
    );

    if (
      (offerOption.dataset.jiyuOfferType !== 'toner'
        || !offerOption.querySelector('.j-five-jar-offer'))
      && tonerImage
    ) {
      clearOffer(packOptions);
      buildTonerOffer(offerOption, packTitle);
    } else {
      offerOption.classList.remove('j-moisturizer-three-pack');
      offerOption.classList.add('j-toner-five-pack');
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
