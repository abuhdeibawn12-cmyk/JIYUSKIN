(function () {
  'use strict';

  var config = window.JIYU_CART_DRAWER || {};
  var theme = window.JIYU_THEME || {};
  var root = config.root || theme.root || '/';
  var cart = null;
  var drawer = null;
  var overlay = null;
  var content = null;
  var footer = null;
  var status = null;
  var count = null;
  var busy = false;
  var openTrigger = null;
  var originalOverflow = '';

  function route(path) {
    return root.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function money(cents, currency) {
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'en-US', {
        style: 'currency',
        currency: currency || (window.Shopify && Shopify.currency && Shopify.currency.active) || 'USD'
      }).format((Number(cents) || 0) / 100);
    } catch (_) {
      return '$' + ((Number(cents) || 0) / 100).toFixed(2);
    }
  }

  function request(path, payload) {
    var options = { credentials: 'same-origin', headers: { Accept: 'application/json' } };
    if (payload !== undefined) {
      options.method = 'POST';
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }
    return fetch(route(path), options).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.description || data.message || 'Unable to update your bag.');
        return data;
      });
    });
  }

  function allProducts() {
    return theme.products || {};
  }

  function findVariant(variantId) {
    var products = allProducts();
    var keys = Object.keys(products);
    for (var i = 0; i < keys.length; i += 1) {
      var product = products[keys[i]];
      var variants = (product && product.variants) || [];
      for (var j = 0; j < variants.length; j += 1) {
        if (Number(variants[j].id) === Number(variantId)) {
          return { key: keys[i], product: product, variant: variants[j], pack: j };
        }
      }
    }
    return null;
  }

  function firstPlan(variant) {
    return variant && variant.selling_plan_allocations && variant.selling_plan_allocations[0];
  }

  function planPrice(variant) {
    var allocation = firstPlan(variant);
    return allocation ? allocation.price : variant.price;
  }

  function planId(variant) {
    var allocation = firstPlan(variant);
    return allocation && (allocation.selling_plan_id || (allocation.selling_plan && allocation.selling_plan.id));
  }

  function isSubscription(item) {
    return Boolean(item && item.selling_plan_allocation);
  }

  function variantPrice(variant, subscription) {
    return subscription ? planPrice(variant) : variant.price;
  }

  function setBusy(next) {
    busy = next;
    if (drawer) drawer.classList.toggle('jcd-loading', next);
    if (drawer) {
      Array.prototype.forEach.call(drawer.querySelectorAll('button,input'), function (control) {
        control.disabled = next;
      });
    }
  }

  function announce(message) {
    if (status) status.textContent = message || '';
  }

  function refresh() {
    return request('cart.js').then(function (nextCart) {
      cart = nextCart;
      render();
      document.dispatchEvent(new CustomEvent('jiyu:cart-updated', { detail: nextCart }));
      return nextCart;
    });
  }

  function update(action, successMessage) {
    if (busy) return Promise.resolve();
    setBusy(true);
    announce('');
    return Promise.resolve()
      .then(action)
      .then(refresh)
      .then(function () { announce(successMessage || 'Bag updated.'); })
      .catch(function (error) { announce(error.message || 'Unable to update your bag.'); })
      .finally(function () { setBusy(false); });
  }

  function changeLine(item, quantity) {
    return update(function () {
      return request('cart/change.js', { id: item.key, quantity: Math.max(0, quantity) });
    }, quantity > 0 ? 'Quantity updated.' : 'Item removed.');
  }

  function toggleSubscription(item, checked) {
    var found = findVariant(item.variant_id);
    if (!found) return Promise.resolve();
    var sellingPlan = checked ? planId(found.variant) : null;
    if (checked && !sellingPlan) {
      announce('Automatic refills are not available for this option.');
      render();
      return Promise.resolve();
    }
    return update(function () {
      return request('cart/change.js', {
        id: item.key,
        quantity: item.quantity,
        selling_plan: sellingPlan
      });
    }, checked ? 'Automatic refills added.' : 'Changed to a one-time purchase.');
  }

  function addVariant(variant, subscription) {
    var item = { id: variant.id, quantity: 1 };
    var sellingPlan = subscription ? planId(variant) : null;
    if (sellingPlan) item.selling_plan = sellingPlan;
    return request('cart/add.js', { items: [item] });
  }

  function replaceWithVariant(lineKeys, variant, subscription) {
    return addVariant(variant, subscription).then(function () {
      var updates = {};
      lineKeys.forEach(function (key) { updates[key] = 0; });
      return request('cart/update.js', { updates: updates });
    });
  }

  function createQuantity(item) {
    var quantity = element('div', 'jcd-qty');
    quantity.setAttribute('aria-label', 'Quantity for ' + item.product_title);
    var minus = element('button', '', '−');
    minus.type = 'button';
    minus.setAttribute('aria-label', 'Decrease quantity');
    minus.addEventListener('click', function () { changeLine(item, item.quantity - 1); });
    var value = element('span', '', String(item.quantity));
    value.setAttribute('aria-live', 'polite');
    var plus = element('button', '', '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', 'Increase quantity');
    plus.addEventListener('click', function () { changeLine(item, item.quantity + 1); });
    quantity.append(minus, value, plus);
    return quantity;
  }

  function trashIcon() {
    var namespace = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.7');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    return svg;
  }

  function createItem(item) {
    var card = element('article', 'jcd-item');
    var grid = element('div', 'jcd-item__grid');
    var image = element('img', 'jcd-item__image');
    image.src = item.image || '';
    image.alt = item.product_title || 'JIYU product';
    image.width = 92;
    image.height = 92;

    var details = element('div', 'jcd-item__details');
    details.appendChild(element('h2', 'jcd-item__title', item.product_title));
    if (item.variant_title && item.variant_title !== 'Default Title') {
      details.appendChild(element('p', 'jcd-item__meta', 'Pack size: ' + item.variant_title));
    }
    details.appendChild(createQuantity(item));

    var side = element('div', 'jcd-item__side');
    side.appendChild(element('strong', 'jcd-item__price', money(item.final_line_price, cart.currency)));
    var remove = element('button', 'jcd-icon-button');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove ' + item.product_title);
    remove.appendChild(trashIcon());
    remove.addEventListener('click', function () { changeLine(item, 0); });
    side.appendChild(remove);
    grid.append(image, details, side);
    card.appendChild(grid);

    var found = findVariant(item.variant_id);
    var allocation = found && firstPlan(found.variant);
    if (allocation || isSubscription(item)) {
      var subscribe = element('label', 'jcd-subscribe');
      var checkbox = element('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isSubscription(item);
      checkbox.addEventListener('change', function () { toggleSubscription(item, checkbox.checked); });
      var subscriptionText = element('span');
      var percent = allocation && found.variant.price
        ? Math.max(0, Math.round((1 - allocation.price / found.variant.price) * 100))
        : 0;
      subscriptionText.appendChild(element('strong', '', percent
        ? 'Save ' + percent + '% with automatic refills'
        : 'Automatic refills'));
      var planName = (item.selling_plan_allocation && item.selling_plan_allocation.selling_plan && item.selling_plan_allocation.selling_plan.name)
        || (allocation && allocation.selling_plan && allocation.selling_plan.name)
        || '';
      if (planName) subscriptionText.appendChild(element('small', '', planName));
      subscribe.append(checkbox, subscriptionText);
      card.appendChild(subscribe);
    }

    card.appendChild(element('p', 'jcd-reassurance', '90-day results guarantee included with your order'));
    return card;
  }

  function imageForVariant(product, variant) {
    return (variant && variant.featured_image && variant.featured_image.src)
      || (product && product.featured_image)
      || (product && product.images && product.images[0])
      || '';
  }

  function mappedLines() {
    return (cart.items || []).map(function (item) {
      var found = findVariant(item.variant_id);
      return found ? { item: item, found: found } : null;
    }).filter(Boolean);
  }

  function buildSuggestions() {
    var lines = mappedLines();
    var products = allProducts();
    var suggestions = [];
    var bundleLine = lines.find(function (line) { return line.found.key === 'bundle'; });
    var tonerLine = lines.find(function (line) { return line.found.key === 'toner'; });
    var creamLine = lines.find(function (line) { return line.found.key === 'cream'; });

    if (!bundleLine && products.bundle && products.bundle.variants && products.bundle.variants[0]) {
      var bundleVariant = products.bundle.variants[0];
      var source = tonerLine || creamLine;
      var subscription = Boolean(source && isSubscription(source.item) && planId(bundleVariant));
      var targetPrice = variantPrice(bundleVariant, subscription);
      var bothSingles = tonerLine && creamLine && tonerLine.item.quantity === 1 && creamLine.item.quantity === 1;
      if (bothSingles) {
        var singlesTotal = tonerLine.item.final_line_price + creamLine.item.final_line_price;
        var savings = Math.max(0, singlesTotal - targetPrice);
        suggestions.push({
          eyebrow: 'Smart bundle upgrade',
          heading: 'Switch to the Glow-Up Bundle' + (savings ? ' & Save ' + money(savings, cart.currency) : ''),
          title: 'Anti-Aging Glow-Up Bundle',
          compare: singlesTotal,
          price: targetPrice,
          savings: savings,
          image: imageForVariant(products.bundle, bundleVariant),
          cta: 'SWITCH',
          action: function () {
            return replaceWithVariant([tonerLine.item.key, creamLine.item.key], bundleVariant, subscription);
          }
        });
      } else if (source) {
        var compare = bundleVariant.compare_at_price || (products.toner && products.toner.variants[0].price) + (products.cream && products.cream.variants[0].price);
        suggestions.push({
          eyebrow: 'Complete your ritual',
          heading: source.found.key === 'toner'
            ? 'Bundle the Moisturizer & Save'
            : 'Bundle the Toner Pads & Save',
          title: 'Anti-Aging Glow-Up Bundle',
          compare: compare,
          price: targetPrice,
          savings: Math.max(0, compare - targetPrice),
          image: imageForVariant(products.bundle, bundleVariant),
          cta: 'ADD',
          action: function () { return addVariant(bundleVariant, subscription); }
        });
      }
    }

    var upgradeLine = lines.find(function (line) {
      return line.found.pack < 2 && line.item.quantity === 1;
    });
    if (upgradeLine) {
      var targetVariant = upgradeLine.found.product.variants[upgradeLine.found.pack + 1];
      if (targetVariant && targetVariant.available !== false) {
        var upgradeSubscription = isSubscription(upgradeLine.item) && Boolean(planId(targetVariant));
        var upgradePrice = variantPrice(targetVariant, upgradeSubscription);
        var currentPrice = upgradeLine.item.final_line_price;
        var basePrice = upgradeLine.found.product.variants[0].price;
        var unitCount = upgradeLine.found.pack + 1 === 2 ? 5 : upgradeLine.found.pack + 2;
        var normalTotal = basePrice * unitCount;
        var upgradeSaving = Math.max(0, normalTotal - upgradePrice);
        suggestions.push({
          eyebrow: 'Best-value upgrade',
          heading: upgradeLine.found.pack + 1 === 2
            ? 'Upgrade to Buy 3 + Get 2 Free'
            : 'Upgrade to ' + (upgradeLine.found.pack + 2) + (upgradeLine.found.key === 'bundle' ? ' Bundle Sets' : ' Jars'),
          title: upgradeLine.found.product.title,
          compare: normalTotal,
          price: upgradePrice,
          savings: upgradeSaving,
          difference: Math.max(0, upgradePrice - currentPrice),
          image: imageForVariant(upgradeLine.found.product, targetVariant),
          cta: 'UPGRADE',
          action: function () {
            return replaceWithVariant([upgradeLine.item.key], targetVariant, upgradeSubscription);
          }
        });
      }
    }
    return suggestions.slice(0, 2);
  }

  function createSuggestion(suggestion) {
    var card = element('section', 'jcd-upsell');
    card.appendChild(element('p', 'jcd-upsell__eyebrow', suggestion.eyebrow));
    card.appendChild(element('h2', 'jcd-upsell__heading', suggestion.heading));
    var box = element('div', 'jcd-upsell__box');
    var image = element('img', 'jcd-upsell__image');
    image.src = suggestion.image;
    image.alt = suggestion.title;
    image.width = 74;
    image.height = 74;
    var details = element('div');
    details.appendChild(element('p', 'jcd-upsell__title', suggestion.title));
    if (suggestion.compare > suggestion.price) details.appendChild(element('p', 'jcd-upsell__compare', money(suggestion.compare, cart.currency)));
    details.appendChild(element('p', 'jcd-upsell__price', money(suggestion.price, cart.currency)));
    if (suggestion.savings) details.appendChild(element('span', 'jcd-upsell__save', 'Save ' + money(suggestion.savings, cart.currency)));
    if (suggestion.difference) details.appendChild(element('span', 'jcd-upsell__save', 'Only ' + money(suggestion.difference, cart.currency) + ' more'));
    var button = element('button', 'jcd-upsell__button', suggestion.cta);
    button.type = 'button';
    button.addEventListener('click', function () {
      update(suggestion.action, suggestion.cta === 'ADD' ? 'Bundle added.' : 'Bundle upgraded.');
    });
    box.append(image, details, button);
    card.appendChild(box);
    return card;
  }

  function renderFooter() {
    footer.replaceChildren();
    if (!cart || !cart.item_count) {
      footer.hidden = true;
      return;
    }
    footer.hidden = false;
    var subtotal = element('div', 'jcd-subtotal');
    subtotal.append(element('span', '', 'Subtotal'), element('strong', '', money(cart.total_price, cart.currency)));
    var checkout = element('button', 'jcd-checkout', 'CHECKOUT  →');
    checkout.type = 'button';
    checkout.addEventListener('click', function () { window.location.assign(route('checkout')); });
    footer.append(subtotal, checkout);

    var payments = element('div', 'jcd-payments');
    payments.setAttribute('aria-label', 'Accepted payment methods');
    (config.payments || []).forEach(function (url) {
      var image = element('img');
      image.src = url;
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      payments.appendChild(image);
    });
    footer.appendChild(payments);

    var trust = element('div', 'jcd-trust');
    var guarantee = element('span');
    var guaranteeImage = element('img');
    guaranteeImage.src = config.guaranteeIcon || '';
    guaranteeImage.alt = '';
    guarantee.append(guaranteeImage, element('b', '', '90-day guarantee'));
    var shipping = element('span');
    var shippingImage = element('img');
    shippingImage.src = config.shippingIcon || '';
    shippingImage.alt = '';
    shipping.append(shippingImage, element('b', '', 'Fast shipping'));
    trust.append(guarantee, shipping);
    footer.appendChild(trust);
  }

  function render() {
    if (!content || !cart) return;
    content.replaceChildren(status);
    count.textContent = String(cart.item_count || 0);
    count.setAttribute('aria-label', (cart.item_count || 0) + ((cart.item_count || 0) === 1 ? ' item' : ' items'));

    if (!cart.item_count) {
      var empty = element('div', 'jcd-empty');
      var emptyInner = element('div');
      emptyInner.append(element('h2', '', 'Your bag is ready for a glow-up'), element('p', '', 'Build your ritual with JIYU skincare.'));
      var shop = element('a', 'jcd-shop-button', 'SHOP ALL');
      shop.href = route('collections/all-products');
      emptyInner.appendChild(shop);
      empty.appendChild(emptyInner);
      content.appendChild(empty);
      renderFooter();
      return;
    }

    var items = element('div', 'jcd-items');
    cart.items.forEach(function (item) { items.appendChild(createItem(item)); });
    content.appendChild(items);

    var suggestions = buildSuggestions();
    if (suggestions.length) {
      var upsells = element('div', 'jcd-upsells');
      suggestions.forEach(function (suggestion) { upsells.appendChild(createSuggestion(suggestion)); });
      content.appendChild(upsells);
    }
    renderFooter();
  }

  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    document.body.classList.remove('jcd-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = originalOverflow;
    if (openTrigger && document.contains(openTrigger)) openTrigger.focus();
  }

  function openDrawer(trigger) {
    if (!drawer || busy) return;
    openTrigger = trigger || document.activeElement;
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('jcd-open');
    drawer.classList.add('is-open');
    overlay.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    announce('Loading your bag…');
    setBusy(true);
    refresh()
      .then(function () { announce(''); })
      .catch(function (error) { announce(error.message || 'Unable to load your bag.'); })
      .finally(function () {
        setBusy(false);
        var close = drawer.querySelector('.jcd-close');
        if (close) close.focus();
      });
  }

  function createDrawer() {
    overlay = element('div', 'jcd-overlay');
    overlay.hidden = false;
    overlay.addEventListener('click', closeDrawer);

    drawer = element('aside', 'jcd-drawer');
    drawer.id = 'jiyu-cart-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Your bag');
    drawer.setAttribute('aria-hidden', 'true');

    var header = element('header', 'jcd-header');
    var brand = element('div', 'jcd-header__brand');
    var logo = element('img', 'jcd-header__logo');
    logo.src = config.logo || '';
    logo.alt = 'JIYU';
    logo.width = 68;
    logo.height = 38;
    brand.append(logo, element('h1', 'jcd-header__title', 'Your Bag'));
    count = element('span', 'jcd-count', '0');
    brand.appendChild(count);
    var close = element('button', 'jcd-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close bag');
    close.addEventListener('click', closeDrawer);
    header.append(brand, close);

    content = element('div', 'jcd-content');
    status = element('p', 'jcd-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    content.appendChild(status);
    footer = element('footer', 'jcd-footer');
    footer.hidden = true;
    drawer.append(header, content, footer);
    document.body.append(overlay, drawer);
  }

  function cartTrigger(target) {
    if (!target || !target.closest) return null;
    var control = target.closest('a,button,[role="button"]');
    if (!control || control.closest('#jiyu-cart-drawer')) return null;
    var href = control.getAttribute('href') || '';
    var label = [
      control.getAttribute('aria-label') || '',
      control.getAttribute('title') || '',
      control.textContent || '',
      control.querySelector('img') ? control.querySelector('img').getAttribute('alt') || '' : ''
    ].join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (/\/cart(?:[?#]|$)/.test(href) || /^(cart|bag)( \d+)?$/.test(label)) return control;
    return null;
  }

  function watchForAdd(initialCount, trigger) {
    var attempts = 0;
    function check() {
      attempts += 1;
      request('cart.js').then(function (latest) {
        if (latest.item_count !== initialCount || attempts >= 5) {
          cart = latest;
          openDrawer(trigger);
        } else {
          setTimeout(check, 300);
        }
      }).catch(function () {});
    }
    setTimeout(check, 250);
  }

  document.addEventListener('click', function (event) {
    var trigger = cartTrigger(event.target);
    if (trigger) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openDrawer(trigger);
      return;
    }
    var control = event.target && event.target.closest && event.target.closest('button');
    var text = control && (control.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (text === 'add to cart') {
      request('cart.js').then(function (before) { watchForAdd(before.item_count, control); }).catch(function () {});
    }
  }, true);

  document.addEventListener('keydown', function (event) {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      closeDrawer();
      return;
    }
    if (event.key !== 'Tab') return;
    var focusable = Array.prototype.filter.call(
      drawer.querySelectorAll('a[href],button:not([disabled]),input:not([disabled])'),
      function (node) { return node.offsetParent !== null; }
    );
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
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createDrawer, { once: true });
  } else {
    createDrawer();
  }
})();
