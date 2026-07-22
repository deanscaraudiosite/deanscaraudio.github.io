(function () {
  "use strict";

  const Commerce = window.DCACommerce;
  if (!Commerce) return;
  const audioFitment = window.DCA_VEHICLE_AUDIO_FITMENT;
  const unavailableText = audioFitment?.unavailableText || "Fitment information unavailable";

  const createSpec = (label, value, available = true) => {
    const item = Commerce.element("div", { className: "dca-specs-tile" });
    if (!available) item.classList.add("is-unavailable");
    item.append(
      Commerce.element("dt", { className: "dca-specs-tile-label", text: label }),
      Commerce.element("dd", { className: "dca-specs-tile-value", text: value }),
    );
    return item;
  };

  const renderSizes = (card, application) => {
    const grid = Commerce.element("dl", { className: "dca-specs-grid" });
    const getSize = (location) => {
      const value = application?.speakers?.[location];
      if (value === null) return { value: "Not applicable", available: true };
      return value && value !== unavailableText
        ? { value, available: true }
        : { value: unavailableText, available: false };
    };
    const front = getSize("front");
    const rear = getSize("rear");
    const dash = getSize("dash");
    grid.append(
      createSpec("Front speaker size", front.value, front.available),
      createSpec("Rear speaker size", rear.value, rear.available),
      createSpec("Dash speaker size", dash.value, dash.available),
    );
    card.append(grid);
  };

  const renderVehiclePanel = () => {
    const vehicle = Commerce.vehicle?.current;
    const application = audioFitment?.resolve?.(vehicle) || null;
    document.querySelectorAll("[data-vehicle-specs-panel]").forEach((container) => {
      container.replaceChildren();
      container.hidden = !vehicle;
      if (!vehicle) return;

      const card = Commerce.element("section", {
        className: "dca-specs-card",
        attrs: {
          "aria-label": "Verified Vehicle Audio Fitment",
          "aria-live": "polite",
        },
      });
      const header = Commerce.element("header", { className: "dca-specs-header" });
      header.append(
        Commerce.element("h2", {
          text: "Verified Vehicle Audio Fitment",
        }),
      );
      card.append(header);

      renderSizes(card, application);
      container.append(card);
    });
  };

  window.addEventListener("dca:vehicle-change", renderVehiclePanel);
  renderVehiclePanel();
})();
