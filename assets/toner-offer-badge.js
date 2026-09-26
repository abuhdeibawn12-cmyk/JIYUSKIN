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

  function packPrice(productKey, packIndex) {
    var product = window.JIYU_THEME && window.JIYU_THEME.products
      ? window.JIYU_THEME.products[productKey]
      : null;
    var variant = product && product.variants ? product.variants[packIndex] : null;
    if (!variant) return 0;
    return Number(variant.price) || 0;
  }

  function singleRetailPrice(productKey) {
    var product = window.JIYU_THEME && window.JIYU_THEME.products
      ? window.JIYU_THEME.products[productKey]
      : null;
    var variant = product && product.variants ? product.variants[0] : null;
    return Number(variant && variant.price) || 0;
  }

  function referencePrice(productKey) {
    if (productKey === 'bundle') {
      return singleRetailPrice('toner') + singleRetailPrice('cream');
    }
    return singleRetailPrice(productKey);
  }

  function packDiscount(productKey, packIndex, itemCount) {
    var regularTotal = referencePrice(productKey) * itemCount;
    var currentPrice = packPrice(productKey, packIndex);
    if (!regularTotal || !currentPrice) return 0;
    return Math.max(0, Math.round((1 - (currentPrice / regularTotal)) * 100));
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

  function replaceLegacyOfferImages() {
    var replacements = [
      { fragment: 'fe09b213f879d666.jpg', source: tonerImage },
      { fragment: 'fece1129be5e9dfd.jpg', source: moisturizerImage },
      {
        fragment: 'pdp-02789b7b022c.jpg',
        source: window.JIYU_THEME && typeof window.JIYU_THEME.resolveAssetText === 'function'
          ? window.JIYU_THEME.resolveAssetText('/assets/529ca9c7a5a0a158.png')
          : ''
      }
    ];

    replacements.forEach(function (replacement) {
      if (!replacement.source) return;
      Array.prototype.forEach.call(
        document.querySelectorAll('img[src*="' + replacement.fragment + '"]'),
        function (image) {
          if (image.src !== replacement.source) image.src = replacement.source;
        }
      );
    });
  }

  function createJar(imageSource) {
    var jar = document.createElement('span');
    jar.className = 'j-five-jar';

    var image = document.createElement('img');
    image.src = imageSource;
    image.alt = '';
    image.width = 28;
    image.height = 28;
    jar.appendChild(image);

    return jar;
  }

  function createBundlePair() {
    var pair = document.createElement('span');
    pair.className = 'j-five-jar j-bundle-pair';

    [tonerImage, moisturizerImage].forEach(function (imageSource) {
      var image = document.createElement('img');
      image.src = imageSource;
      image.alt = '';
      image.width = 17;
      image.height = 28;
      pair.appendChild(image);
    });

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
        ? options.createItem()
        : createJar(options.image));
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

  function setSavings(option, percent, comparison) {
    if (!option) return;
    var savings = option.querySelector('small');
    var text = 'Save ' + percent + '%';
    var label = text + ' ' + comparison;
    if (!savings) {
      savings = document.createElement('small');
      option.appendChild(savings);
    }

    if (savings.textContent !== text) savings.textContent = text;
    if (savings.getAttribute('aria-label') !== label) savings.setAttribute('aria-label', label);
  }

  function setBadge(option, text) {
    var badge = option && option.querySelector('.j-badge');
    if (badge && badge.textContent !== text) badge.textContent = text;
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

    insertOffer(option, packTitle, createOffer({
      image: tonerImage,
      jarCount: 3,
      caption: '3-JAR VALUE PACK',
      label: 'Three toner jar value pack'
    }));
  }

  function buildMoisturizerOffer(option, packTitle) {
    option.classList.add('j-moisturizer-three-pack');
    option.dataset.jiyuOfferType = 'moisturizer';

    insertOffer(option, packTitle, createOffer({
      image: moisturizerImage,
      jarCount: 3,
      caption: '3-JAR VALUE PACK',
      label: 'Three moisturizer jar value pack'
    }));
  }

  function buildBundleOffer(option, packTitle) {
    option.classList.add('j-bundle-five-pack');
    option.dataset.jiyuOfferType = 'bundle';

    insertOffer(option, packTitle, createOffer({
      jarCount: 3,
      createItem: createBundlePair,
      caption: '3 COMPLETE SETS · 6 JARS TOTAL',
      label: 'Three complete bundle sets, including three toner and three moisturizer jars'
    }));
  }

  function enhanceOffer() {
    queued = false;
    replaceLegacyOfferImages();

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
      setBadge(offerOption, 'Best Value');
      setSavings(
        packOptions[1],
        packDiscount('cream', 1, 2),
        'compared with two individual moisturizer jars'
      );
      setSavings(
        offerOption,
        packDiscount('cream', 2, 3),
        'compared with three individual moisturizer jars'
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
      setBadge(offerOption, 'Best Value');
      setSavings(
        packOptions[0],
        packDiscount('bundle', 0, 1),
        'compared with buying one toner and one moisturizer separately'
      );
      setSavings(
        packOptions[1],
        packDiscount('bundle', 1, 2),
        'compared with buying two toner and moisturizer sets separately'
      );
      setSavings(
        offerOption,
        packDiscount('bundle', 2, 3),
        'compared with buying three toner and moisturizer sets separately'
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

    setBadge(offerOption, 'Best Value');
    setSavings(
      packOptions[1],
      packDiscount('toner', 1, 2),
      'compared with two individual toner jars'
    );
    setSavings(
      offerOption,
      packDiscount('toner', 2, 3),
      'compared with three individual toner jars'
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
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  });

  queueEnhancement();
  window.setTimeout(enhanceOffer, 500);
  window.setTimeout(enhanceOffer, 1500);
})();
