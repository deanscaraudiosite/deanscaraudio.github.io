(function () {
  "use strict";

  const Commerce = window.DCACommerce;

  const updateCartBadges = () => {
    const { itemCount } = Commerce.cart.getSummary();
    for (const badge of document.querySelectorAll("[data-cart-count]")) {
      badge.textContent = String(itemCount);
      badge.setAttribute(
        "aria-label",
        `${itemCount} ${itemCount === 1 ? "item" : "items"} in cart`,
      );
    }
  };

  const updateCommerceLinks = () => {
    for (const link of document.querySelectorAll("[data-commerce-link]")) {
      const route = link.dataset.commerceLink;
      if (route === "catalog") link.href = Commerce.url("catalog.html");
      if (route === "cart") link.href = Commerce.url("cart.html");
    }
  };

  const updateStorageNotices = () => {
    for (const note of document.querySelectorAll("[data-cart-storage-note]")) {
      note.textContent = Commerce.cart.persistent
        ? "Planning cart · saved on this device"
        : "Planning cart · available for this visit only";
    }
  };

  const navigation = document.querySelector("[data-store-navigation]");
  const navigationToggle = document.querySelector("[data-nav-toggle]");
  const closeNavigation = ({ returnFocus = false } = {}) => {
    if (!navigation || !navigationToggle) return;
    navigation.classList.remove("is-open");
    navigationToggle.setAttribute("aria-expanded", "false");
    navigationToggle.setAttribute("aria-label", "Open store navigation");
    if (returnFocus) navigationToggle.focus();
  };

  if (navigation && navigationToggle) {
    navigationToggle.setAttribute("aria-label", "Open store navigation");
    navigationToggle.addEventListener("click", () => {
      const open = navigationToggle.getAttribute("aria-expanded") === "true";
      if (open) {
        closeNavigation();
      } else {
        navigation.classList.add("is-open");
        navigationToggle.setAttribute("aria-expanded", "true");
        navigationToggle.setAttribute("aria-label", "Close store navigation");
        navigation.querySelector("a")?.focus();
      }
    });
    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeNavigation();
    });
    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        navigationToggle.getAttribute("aria-expanded") === "true"
      ) {
        closeNavigation({ returnFocus: true });
      }
    });
    const desktop = window.matchMedia?.("(min-width: 1025px)");
    desktop?.addEventListener?.("change", (event) => {
      if (event.matches) closeNavigation();
    });
  }

  Commerce.cart.subscribe(() => {
    updateCartBadges();
    updateStorageNotices();
  });
  Commerce.vehicle.render();
  updateCommerceLinks();
  updateCartBadges();
  updateStorageNotices();
  window.addEventListener("dca:vehicle-change", updateCommerceLinks);

  const year = document.querySelector("[data-current-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
