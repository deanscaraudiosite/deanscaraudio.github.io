(function () {
  "use strict";

  const Commerce = window.DCACommerce;
  const layout = document.querySelector("[data-checkout-layout]");
  if (!layout) return;

  const empty = document.querySelector("[data-review-empty]");
  const summaryList = document.querySelector("[data-summary-list]");
  const totalItems = document.querySelector("[data-total-items]");
  const totalGrand = document.querySelector("[data-total-grand]");
  const emailLink = document.querySelector("[data-review-email]");

  const fallbackImage = (product) => {
    const category = product?.category || "receivers";
    const name = {
      receivers: "receiver",
      speakers: "speaker",
      subwoofers: "subwoofer",
      amplifiers: "amplifier",
      installation: "installation",
    }[category] || "receiver";
    return `assets/images/${name}.jpg`;
  };

  const formatLinePrice = (variant, quantity) =>
    Number.isInteger(variant?.price?.amountMinor)
      ? Commerce.formatMoney(variant.price.amountMinor * quantity, variant.price.currency)
      : "Price on request";

  const renderSummary = () => {
    const cart = Commerce.cart.getCart();
    const summary = Commerce.cart.getSummary();
    const hasLines = cart.lines.length > 0;

    layout.hidden = !hasLines;
    if (empty) empty.hidden = hasLines;
    summaryList.replaceChildren();

    if (!hasLines) return;

    const emailLines = [];
    for (const line of cart.lines) {
      const product = Commerce.productForVariant.get(line.variantId);
      const variant = Commerce.variantById.get(line.variantId);
      if (!variant) continue;

      const item = Commerce.element("li", { className: "dca-checkout-summary-item" });
      item.append(
        Commerce.element("img", {
          className: "dca-checkout-item-thumb",
          attrs: {
            src: variant.imageUrl || fallbackImage(product),
            alt: "",
            loading: "lazy",
            decoding: "async",
          },
        }),
      );

      const info = Commerce.element("div", { className: "dca-checkout-item-info" });
      info.append(
        Commerce.element("div", {
          className: "dca-checkout-item-name",
          text: product?.name || variant.name || variant.sku,
        }),
        Commerce.element("div", {
          className: "dca-checkout-item-meta",
          text: `Qty ${line.quantity} · SKU ${variant.sku}`,
        }),
      );

      item.append(
        info,
        Commerce.element("div", {
          className: "dca-checkout-item-price",
          text: formatLinePrice(variant, line.quantity),
        }),
      );
      summaryList.append(item);

      const vehicle = line.selectedVehicle
        ? ` · Vehicle: ${line.selectedVehicle.year} ${line.selectedVehicle.makeName} ${line.selectedVehicle.modelName}`
        : "";
      emailLines.push(
        `- ${product?.name || variant.name || variant.sku} · SKU ${variant.sku} · Qty ${line.quantity} · ${formatLinePrice(variant, line.quantity)}${vehicle}`,
      );
    }

    totalItems.textContent = String(summary.itemCount);
    totalGrand.textContent = Commerce.formatMoney(summary.estimatedSubtotalMinor);

    const subject = "Dean's Car Audio build review";
    const body = `Hi Dean's Car Audio,

I'd like to review this car-audio plan with you:

${emailLines.join("\n")}

Reference subtotal: ${Commerce.formatMoney(summary.estimatedSubtotalMinor)}

Please help me confirm vehicle fitment, required installation parts, current availability, final pricing, and next steps.

Thank you.`;
    emailLink.href = `mailto:deanscaraudioinfo@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  Commerce.cart.subscribe(renderSummary);
  window.DCA_CHECKOUT_RENDER = renderSummary;
  renderSummary();
})();
