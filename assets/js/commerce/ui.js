(function () {
  "use strict";

  const Commerce = window.DCACommerce;
  const el = Commerce.element;

  const CATEGORY_IMAGES = {
    receivers: "assets/images/receiver.jpg",
    speakers: "assets/images/speaker.jpg",
    subwoofers: "assets/images/subwoofer.jpg",
    amplifiers: "assets/images/amplifier.jpg",
    installation: "assets/images/installation.jpg",
  };

  const isPlaceholder = (url) =>
    !url || url.includes("placehold.co") || url.includes("placeholder");

  const createProductVisual = (product, variant = null, large = false) => {
    const visual = el("div", {
      className: `dca-commerce-product-visual is-${product.visualType}${large ? " is-large" : ""}`,
    });
    
    const selectedVariant = variant || product.variants[0];
    const rawUrl = selectedVariant?.imageUrl;
    const imageUrl = isPlaceholder(rawUrl)
      ? CATEGORY_IMAGES[product.category] || "assets/images/receiver.jpg"
      : rawUrl;
    
    const img = el("img", {
      className: "dca-commerce-product-image",
      attrs: {
        src: imageUrl,
        alt: `${product.brand} ${product.name}, ${selectedVariant.sku}`,
        loading: large ? "eager" : "lazy",
        decoding: "async",
        ...(large ? { fetchpriority: "high" } : {}),
      },
    });
    visual.append(img);
    
    const category = Commerce.categoryById.get(product.category);
    let labelText = category?.shortLabel || product.category;
    if (product.tags) {
      if (product.tags.includes("tweeter")) {
        labelText = "Tweeters";
      } else if (product.tags.includes("epicenter") || product.tags.includes("equalizer") || product.tags.includes("eq") || product.tags.includes("processor")) {
        labelText = "Processors";
      } else if (product.tags.includes("enclosure") || product.tags.includes("box")) {
        labelText = "Enclosures";
      } else if (product.tags.includes("wiring") || product.tags.includes("power-wire")) {
        labelText = "Wiring Kits";
      }
    }
    const label = el("span", {
      className: "dca-commerce-product-visual-label",
      text: labelText,
    });
    visual.append(label);
    return visual;
  };


  const createPrice = (value, { prefix = "", compact = false } = {}) => {
    const root = el("div", {
      className: `dca-commerce-price${compact ? " is-compact" : ""}`,
    });
    if (prefix) root.append(el("span", { className: "dca-commerce-price-prefix", text: prefix }));
    if (!Number.isInteger(value.amountMinor)) {
      root.append(el("strong", { text: "Price on request" }));
      return root;
    }
    root.append(el("strong", { text: Commerce.formatMoney(value.amountMinor, value.currency) }));
    if (
      Number.isInteger(value.compareAtMinor) &&
      value.compareAtMinor > value.amountMinor
    ) {
      root.append(
        el("s", {
          text: Commerce.formatMoney(value.compareAtMinor, value.currency),
          attrs: { "aria-label": `Previously ${Commerce.formatMoney(value.compareAtMinor, value.currency)}` },
        }),
      );
    }
    return root;
  };

  const createSourceStatus = (status) => {
    const root = el("span", {
      className: `dca-commerce-source-status is-${status}`,
    });
    root.append(
      el("span", { attrs: { "aria-hidden": "true" }, text: "•" }),
      el("span", { text: Commerce.sourceStatusLabel(status) }),
    );
    return root;
  };

  // Compatibility shim for older page modules. Unknown fitment remains unknown
  // until a real rule or an installer review confirms it.
  const overrideUnknownFit = (result) => result;

  const createProductCard = (product, { preferredVariant = null } = {}) => {
    const productFit = Commerce.fitment.evaluateProduct(product);
    const selectedVariant = product.variants.includes(preferredVariant)
      ? preferredVariant
      : null;
    const selectedFit = selectedVariant
      ? Commerce.fitment.evaluate(selectedVariant.id)
      : null;

    const activeFit = selectedVariant
      ? overrideUnknownFit(selectedFit, selectedVariant.id)
      : overrideUnknownFit(productFit.best, product.variants[0].id);

    const destination = Commerce.productUrl(product, selectedVariant?.id || "");
    const priceFloor = selectedVariant
      ? selectedVariant.price.amountMinor
      : Commerce.minVariantPrice(product);
    const allQuoted = priceFloor === null;
    const card = el("article", {
      className: "dca-commerce-product-card",
      data: { category: product.category, productId: product.id },
    });
    const visualLink = el("a", {
      className: "dca-commerce-product-visual-link",
      attrs: {
        href: destination,
        "aria-label": selectedVariant
          ? `View ${product.name}, ${selectedVariant.sku}`
          : `View ${product.name}`,
      },
    }, createProductVisual(product, selectedVariant));
    const body = el("div", { className: "dca-commerce-product-card-body" });
    const meta = el("div", { className: "dca-commerce-product-meta" });
    meta.append(
      el("span", { text: product.brand }),
      el("span", {
        text: `${product.variants.length} ${product.variants.length === 1 ? "option" : "options"}`,
      }),
    );
    const title = el("h3");
    title.append(
      el("a", { text: product.name, attrs: { href: destination } }),
    );
    const fitRow = el("div", { className: "dca-commerce-card-fit" });
    if (activeFit.status !== "unknown") {
      const badge = Commerce.fitment.createBadge(activeFit, true);
      if (selectedVariant) {
        badge.lastElementChild.textContent = `${activeFit.label}`;
      } else if (product.variants.length > 1 && productFit.counts.compatible > 0) {
        badge.lastElementChild.textContent = `${productFit.counts.compatible} compatible ${
          productFit.counts.compatible === 1 ? "option" : "options"
        }`;
      } else if (product.variants.length > 1 && productFit.counts.conditional > 0) {
        badge.lastElementChild.textContent = `${productFit.counts.conditional} conditional ${
          productFit.counts.conditional === 1 ? "option" : "options"
        }`;
      } else if (activeFit.status === "compatible") {
        badge.lastElementChild.textContent = activeFit.label;
      }
      fitRow.append(badge);
    }

    const pricing = allQuoted
      ? createPrice({ amountMinor: null, currency: "USD" }, { compact: true })
      : createPrice(
          { amountMinor: priceFloor, currency: "USD" },
          {
            compact: true,
            prefix:
              selectedVariant
                ? selectedVariant.price.kind === "msrp"
                  ? "MSRP"
                  : "Reference"
                : product.variants.length > 1
                ? "From"
                : product.variants[0].price.kind === "msrp"
                  ? "MSRP"
                  : "Reference",
          },

        );
    const actions = el("div", { className: "dca-commerce-card-actions" });
    actions.append(
      pricing,
      el("a", {
        className: "dca-commerce-button dca-commerce-button-card",
        text: product.variants.length > 1
          ? "View options"
          : "View product",
        attrs: { href: destination },
      }),
    );
    body.append(
      meta,
      title,
      fitRow,
      actions,
    );
    card.append(visualLink, body);
    return card;
  };

  const createFitmentPanel = (result, { heading = "Compatibility status" } = {}) => {
    const panel = el("div", {
      className: `dca-commerce-fit-panel is-${result.status}`,
    });
    const copy = el("div");
    copy.append(
      el("span", { className: "dca-commerce-fit-panel-kicker", text: heading }),
      el("h2", {
        text:
          result.status === "unknown" && !Commerce.vehicle.current
            ? "Select a vehicle to check fitment"
            : Commerce.vehicle.current
              ? `${result.label} for ${Commerce.vehicle.getLabel()}`
              : result.label,
        attrs: { id: "product-fitment-heading" },
      }),
    );
    if (result.status === "unknown") {
      panel.append(copy);
    } else {
      panel.append(copy, Commerce.fitment.createBadge(result));
    }
    return panel;
  };

  const toast = (message) => {
    let root = document.querySelector("[data-commerce-toast]");
    if (!root) {
      root = el("div", {
        className: "dca-commerce-toast",
        attrs: {
          role: "status",
          "aria-live": "polite",
          "aria-atomic": "true",
        },
        data: { commerceToast: "" },
      });
      document.body.append(root);
    }
    root.textContent = message;
    root.classList.add("is-visible");
    window.clearTimeout(toast.timeout);
    toast.timeout = window.setTimeout(() => root.classList.remove("is-visible"), 3600);
  };

  Commerce.ui = {
    createProductVisual,
    createPrice,
    createSourceStatus,
    createProductCard,
    createFitmentPanel,
    overrideUnknownFit,
    toast,
  };
})();
