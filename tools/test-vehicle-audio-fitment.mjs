#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const toolsDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(toolsDirectory, "..");
const commerceDirectory = path.join(siteRoot, "assets/js/commerce");
const scriptNames = [
  "catalog-data.js",
  "core.js",
  "vehicle-audio-fitment-data.js",
  "vehicle-context.js",
  "vehicle-specs.js",
  "homepage-fitment.js",
  "fitment-data.js",
  "fitment-engine.js",
  "catalog-page.js",
];
const scriptSources = new Map(
  await Promise.all(
    scriptNames.map(async (name) => [
      name,
      await fs.readFile(path.join(commerceDirectory, name), "utf8"),
    ]),
  ),
);

const EXPECTED_VERIFIED_VEHICLES = Object.freeze([
  { year: "2024", makeName: "Aston Martin", modelName: "DBX" },
  { year: "2023", makeName: "Aston Martin", modelName: "DBX" },
  { year: "2022", makeName: "Aston Martin", modelName: "DBX" },
  { year: "2021", makeName: "Aston Martin", modelName: "DBX" },
  { year: "2020", makeName: "Aston Martin", modelName: "DBX" },
  { year: "2013", makeName: "BMW", modelName: "528i" },
  { year: "2013", makeName: "BMW", modelName: "528i xDrive" },
  { year: "2011", makeName: "Ford", modelName: "Focus" },
  { year: "2011", makeName: "Toyota", modelName: "Camry" },
  { year: "2010", makeName: "Ford", modelName: "Focus" },
  { year: "2010", makeName: "Toyota", modelName: "Camry" },
  { year: "2009", makeName: "Ford", modelName: "Focus" },
  { year: "2009", makeName: "Toyota", modelName: "Camry" },
  { year: "2008", makeName: "Ford", modelName: "Focus" },
  { year: "2008", makeName: "Toyota", modelName: "Camry" },
  { year: "2007", makeName: "Toyota", modelName: "Camry" },
]);

const EXPECTED_YEARS = Object.freeze(
  Array.from({ length: 32 }, (_value, index) => String(2026 - index)),
);

const EXPECTED_MAKES = Object.freeze([
  "Acura",
  "Alfa Romeo",
  "Aston Martin",
  "Audi",
  "Bentley",
  "BMW",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Dodge",
  "Ferrari",
  "FIAT",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Jaguar",
  "Jeep",
  "Kia",
  "Lamborghini",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Maserati",
  "Mazda",
  "McLaren",
  "Mercedes-Benz",
  "MINI",
  "Mitsubishi",
  "Nissan",
  "Polestar",
  "Porsche",
  "RAM",
  "Rolls-Royce",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
]);

const VEHICLE_TYPES = Object.freeze([
  "Passenger Car",
  "Multipurpose Passenger Vehicle",
  "Truck",
]);

const MODEL_RESPONSES = Object.freeze({
  "2024|Aston Martin": Object.freeze({
    "Passenger Car": Object.freeze(["Valkyrie", "DBX", "dbx", ""]),
    "Multipurpose Passenger Vehicle": Object.freeze(["DBX707", "DBX"]),
    Truck: Object.freeze(["DBX 707"]),
    Trailer: Object.freeze(["Unrelated Trailer"]),
  }),
  "2023|Ford": Object.freeze({
    "Passenger Car": Object.freeze(["Mustang"]),
    "Multipurpose Passenger Vehicle": Object.freeze(["Escape", "Mustang"]),
    Truck: Object.freeze(["F-150"]),
    Trailer: Object.freeze(["Affordable Aluminum"]),
  }),
  "2013|BMW": Object.freeze({
    "Passenger Car": Object.freeze(["528i xDrive", "528i", "528i"]),
    "Multipurpose Passenger Vehicle": Object.freeze([]),
    Truck: Object.freeze([]),
    Trailer: Object.freeze(["Unrelated Trailer"]),
  }),
  "2018|Toyota": Object.freeze({
    "Passenger Car": Object.freeze(["Camry"]),
    "Multipurpose Passenger Vehicle": Object.freeze(["RAV4", "Camry"]),
    Truck: Object.freeze(["Tacoma"]),
    Trailer: Object.freeze(["Milford Welding"]),
  }),
  "2011|Ford": Object.freeze({
    "Passenger Car": Object.freeze(["Fusion", "Focus"]),
    "Multipurpose Passenger Vehicle": Object.freeze(["Escape", "Focus"]),
    Truck: Object.freeze(["F-150"]),
    Trailer: Object.freeze(["Affordable Aluminum"]),
  }),
  "2011|Toyota": Object.freeze({
    "Passenger Car": Object.freeze(["Prius", "Camry"]),
    "Multipurpose Passenger Vehicle": Object.freeze(["RAV4", "Camry"]),
    Truck: Object.freeze(["Tacoma"]),
    Trailer: Object.freeze(["Unrelated Trailer"]),
  }),
  "2009|Ford": Object.freeze({
    "Passenger Car": Object.freeze(["Focus"]),
    "Multipurpose Passenger Vehicle": Object.freeze(["Escape"]),
    Truck: Object.freeze(["Ranger", "Focus"]),
    Trailer: Object.freeze(["Milford Welding"]),
  }),
});

const EXPECTED_COMPATIBLE_VARIANTS = Object.freeze({
  focus: Object.freeze(["spk-011-variant"]),
  camry: Object.freeze([
    "alpine-s-s69-std",
    "gravity-gr-695-std",
    "kenwood-kfc-6966s-std",
    "pioneer-ts-a6991f-std",
    "rf-p1692-std",
    "rf-r169x2-std",
    "spk-001-variant",
    "spk-002-variant",
    "spk-003-variant",
    "spk-004-variant",
    "spk-005-variant",
    "spk-006-variant",
    "spk-025-variant",
    "spk-026-variant",
  ]),
  dbx: Object.freeze([]),
});

class FakeEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = Boolean(options.bubbles);
    this.cancelable = Boolean(options.cancelable);
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
  }

  preventDefault() {
    if (this.cancelable) this.defaultPrevented = true;
  }
}

class FakeCustomEvent extends FakeEvent {
  constructor(type, options = {}) {
    super(type, options);
    this.detail = options.detail;
  }
}

class FakeEventTarget {
  #listeners = new Map();

  addEventListener(type, listener) {
    const listeners = this.#listeners.get(type) || [];
    listeners.push(listener);
    this.#listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.#listeners.get(type) || [];
    this.#listeners.set(
      type,
      listeners.filter((candidate) => candidate !== listener),
    );
  }

  dispatchEvent(event) {
    assert.ok(event && typeof event.type === "string", "An event type is required");
    event.target ||= this;
    event.currentTarget = this;
    for (const listener of [...(this.#listeners.get(event.type) || [])]) {
      if (typeof listener === "function") listener.call(this, event);
      else listener.handleEvent(event);
    }
    return !event.defaultPrevented;
  }
}

const dataAttributeName = (attribute) =>
  attribute
    .slice(5)
    .replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());

const selectorAttribute = /^\[([^=\]]+)(?:=["']([^"']*)["'])?\]$/;

class FakeNode extends FakeEventTarget {
  constructor(ownerDocument = null) {
    super();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.childNodes = [];
  }

  append(...children) {
    for (let child of children) {
      if (typeof child === "string") {
        child = this.ownerDocument.createTextNode(child);
      }
      if (!(child instanceof FakeNode)) continue;
      if (child.parentNode) {
        const index = child.parentNode.childNodes.indexOf(child);
        if (index >= 0) child.parentNode.childNodes.splice(index, 1);
      }
      child.parentNode = this;
      this.childNodes.push(child);
    }
  }

  appendChild(child) {
    this.append(child);
    return child;
  }

  replaceChildren(...children) {
    for (const child of this.childNodes) child.parentNode = null;
    this.childNodes = [];
    this.append(...children);
  }

  get children() {
    return this.childNodes.filter((child) => child.nodeType === 1);
  }

  get textContent() {
    return this.childNodes.map((child) => child.textContent).join("");
  }

  set textContent(value) {
    this.replaceChildren();
    const text = String(value ?? "");
    if (text) this.append(this.ownerDocument.createTextNode(text));
  }
}

class FakeText extends FakeNode {
  constructor(text, ownerDocument) {
    super(ownerDocument);
    this.nodeType = 3;
    this.data = String(text);
  }

  get textContent() {
    return this.data;
  }

  set textContent(value) {
    this.data = String(value ?? "");
  }
}

class FakeClassList {
  constructor(element) {
    this.element = element;
  }

  add(...tokens) {
    const values = new Set(this.element.className.split(/\s+/).filter(Boolean));
    for (const token of tokens) values.add(token);
    this.element.className = [...values].join(" ");
  }

  contains(token) {
    return this.element.className.split(/\s+/).includes(token);
  }
}

class FakeElement extends FakeNode {
  constructor(tagName, ownerDocument) {
    super(ownerDocument);
    this.nodeType = 1;
    this.tagName = String(tagName).toUpperCase();
    this.attributes = new Map();
    this.dataset = {};
    this.className = "";
    this.classList = new FakeClassList(this);
    this.hidden = false;
    this._disabled = false;
    this.enableAudit = null;
    this.open = false;
    this._value = "";
  }

  get id() {
    return this.getAttribute("id") || "";
  }

  set id(value) {
    this.setAttribute("id", value);
  }

  get value() {
    return this._value;
  }

  set value(value) {
    this._value = String(value ?? "");
  }

  get disabled() {
    return this._disabled;
  }

  set disabled(value) {
    const wasDisabled = this._disabled;
    this._disabled = Boolean(value);
    if (wasDisabled && !this._disabled && typeof this.enableAudit === "function") {
      this.enableAudit();
    }
  }

  get options() {
    return this.tagName === "SELECT" ? this.children : undefined;
  }

  append(...children) {
    const wasEmpty = this.tagName === "SELECT" && this.children.length === 0;
    super.append(...children);
    if (wasEmpty && this.tagName === "SELECT") {
      this._value = this.children[0]?.value || "";
    }
  }

  replaceChildren(...children) {
    super.replaceChildren(...children);
    if (this.tagName === "SELECT") {
      this._value = this.children[0]?.value || "";
    }
  }

  setAttribute(name, value) {
    const normalized = String(name);
    const text = String(value);
    this.attributes.set(normalized, text);
    if (normalized === "class") this.className = text;
    if (normalized.startsWith("data-")) {
      this.dataset[dataAttributeName(normalized)] = text;
    }
  }

  getAttribute(name) {
    if (name === "class") return this.className || null;
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  matches(selector) {
    if (selector.startsWith("#")) return this.id === selector.slice(1);
    if (selector.startsWith(".")) return this.classList.contains(selector.slice(1));
    const attribute = selector.match(selectorAttribute);
    if (attribute) {
      const actual = this.getAttribute(attribute[1]);
      return attribute[2] === undefined ? actual !== null : actual === attribute[2];
    }
    return this.tagName === selector.toUpperCase();
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }
}

class FakeDocument extends FakeNode {
  constructor() {
    super(null);
    this.nodeType = 9;
    this.ownerDocument = this;
    this.activeElement = null;
    this.body = this.createElement("body");
    this.append(this.body);
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  createTextNode(text) {
    return new FakeText(text, this);
  }

  getElementById(id) {
    return this.querySelector(`#${id}`);
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
}

class FakeStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.get(String(key)) ?? null;
  }

  setItem(key, value) {
    this.#values.set(String(key), String(value));
  }

  removeItem(key) {
    this.#values.delete(String(key));
  }
}

const addElement = (document, tag, { id = "", data = "", parent = null } = {}) => {
  const element = document.createElement(tag);
  if (id) element.id = id;
  if (data) element.setAttribute(data, "");
  (parent || document.body).append(element);
  return element;
};

const addOption = (document, select, text, value = text) => {
  const option = document.createElement("option");
  option.textContent = text;
  option.value = value;
  select.append(option);
  return option;
};

const createSelectorFixture = (document) => {
  const form = addElement(document, "form", { id: "fitment-form" });
  const year = addElement(document, "select", { id: "fitment-year", parent: form });
  const make = addElement(document, "select", { id: "fitment-make", parent: form });
  const model = addElement(document, "select", { id: "fitment-model", parent: form });
  const submit = addElement(document, "button", { id: "fitment-submit", parent: form });
  const status = addElement(document, "p", { id: "fitment-status" });
  const panel = addElement(document, "div", { data: "data-vehicle-specs-panel" });
  return { form, year, make, model, submit, status, panel };
};

const createCatalogFixture = (document) => {
  const search = addElement(document, "input", { data: "data-catalog-search" });
  const brand = addElement(document, "select", { data: "data-brand-filter" });
  addOption(document, brand, "All brands", "all");
  const compatibility = addElement(document, "select", {
    data: "data-compatibility-filter",
  });
  for (const value of ["all", "compatible", "conditional", "incompatible", "unknown"]) {
    addOption(document, compatibility, value, value);
  }
  const availability = addElement(document, "select", {
    data: "data-availability-filter",
  });
  for (const value of [
    "all",
    "listed_for_direct_sale",
    "source_unavailable",
    "not_stated",
  ]) {
    addOption(document, availability, value, value);
  }
  const price = addElement(document, "select", { data: "data-price-filter" });
  for (const value of ["all", "under-50", "50-100", "100-200", "200-500", "over-500"]) {
    addOption(document, price, value, value);
  }
  const sort = addElement(document, "select", { data: "data-sort-filter" });
  for (const value of ["featured", "price-asc", "price-desc", "name"]) {
    addOption(document, sort, value, value);
  }
  const count = addElement(document, "p", { data: "data-results-count" });
  const heading = addElement(document, "h1", { data: "data-results-heading" });
  const chips = addElement(document, "div", { data: "data-active-filters" });
  const reset = addElement(document, "button", { data: "data-reset-filters" });
  const categories = addElement(document, "div", { data: "data-category-list" });
  const disclosure = addElement(document, "details", { data: "data-category-disclosure" });
  const grid = addElement(document, "div", { data: "data-product-grid" });
  const panel = addElement(document, "div", { data: "data-vehicle-specs-panel" });
  return {
    search,
    brand,
    compatibility,
    availability,
    price,
    sort,
    count,
    heading,
    chips,
    reset,
    categories,
    disclosure,
    grid,
    panel,
  };
};

const createRuntime = ({
  page = "index.html",
  search = "",
  fixture = "none",
  modelResponses = {},
} = {}) => {
  const document = new FakeDocument();
  const pageFixture =
    fixture === "selector"
      ? createSelectorFixture(document)
      : fixture === "catalog"
        ? createCatalogFixture(document)
        : {};
  const window = new FakeEventTarget();
  const assignedUrls = [];
  const historyUrls = [];
  const fetchCalls = [];
  const enableAudits = [];
  const location = {
    href: `https://example.test/${page}${search}`,
    pathname: `/${page}`,
    search,
    hash: "",
    assign(value) {
      assignedUrls.push(String(value));
    },
  };
  const localStorage = new FakeStorage();
  const sessionStorage = new FakeStorage();

  Object.assign(window, {
    document,
    name: "",
    location,
    localStorage,
    sessionStorage,
    history: {
      replaceState(_state, _title, value) {
        historyUrls.push(String(value));
      },
    },
    matchMedia() {
      return {
        matches: false,
        addEventListener() {},
        removeEventListener() {},
      };
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
    clearTimeout() {},
  });

  const fetch = async (input) => {
    const url = new URL(String(input));
    const segments = url.pathname.split("/").map(decodeURIComponent);
    const valueAfter = (segment) => segments[segments.indexOf(segment) + 1];
    const request = {
      url: url.href,
      make: valueAfter("make"),
      year: valueAfter("modelyear"),
      vehicleType: valueAfter("vehicletype"),
    };
    fetchCalls.push(request);
    const models =
      modelResponses[`${request.year}|${request.make}`]?.[request.vehicleType] || [];
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          Results: models.map((modelName) => ({ Model_Name: modelName })),
        };
      },
    };
  };
  window.fetch = fetch;

  const context = vm.createContext({
    console,
    window,
    document,
    Event: FakeEvent,
    CustomEvent: FakeCustomEvent,
    Node: FakeNode,
    URL,
    URLSearchParams,
    Intl,
    fetch,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
  });
  context.Option = class Option extends FakeElement {
    constructor(text = "", value = "") {
      super("option", document);
      this.textContent = text;
      this.value = value;
    }
  };

  const run = (name) => {
    new vm.Script(scriptSources.get(name), { filename: name }).runInContext(context);
  };

  return {
    ...pageFixture,
    window,
    document,
    context,
    assignedUrls,
    historyUrls,
    fetchCalls,
    enableAudits,
    run,
  };
};

const loadSharedCommerce = (runtime) => {
  runtime.run("catalog-data.js");
  runtime.run("core.js");
  runtime.run("vehicle-audio-fitment-data.js");
};

const loadSelector = (modelResponses = MODEL_RESPONSES) => {
  const runtime = createRuntime({ fixture: "selector", modelResponses });
  loadSharedCommerce(runtime);
  runtime.run("vehicle-context.js");
  runtime.run("vehicle-specs.js");
  runtime.model.enableAudit = () => {
    const models = optionValues(runtime.model);
    const vehicle = {
      year: runtime.year.value,
      makeName: runtime.make.value,
    };
    runtime.enableAudits.push({
      ...vehicle,
      models,
      unregistered: models.filter(
        (modelName) =>
          !runtime.window.DCA_VEHICLE_AUDIO_FITMENT.has({ ...vehicle, modelName }),
      ),
    });
  };
  runtime.run("homepage-fitment.js");
  return runtime;
};

const loadCatalog = (vehicle, { fit = "compatible" } = {}) => {
  const catalogParams = new URLSearchParams({
    vehicle: JSON.stringify(vehicle),
  });
  if (fit) catalogParams.set("fit", fit);
  const runtime = createRuntime({
    page: "catalog.html",
    search: `?${catalogParams.toString()}`,
    fixture: "catalog",
  });
  loadSharedCommerce(runtime);
  runtime.run("fitment-data.js");
  runtime.run("fitment-engine.js");
  runtime.run("vehicle-context.js");
  runtime.run("vehicle-specs.js");
  runtime.window.DCACommerce.ui = {
    createProductCard(product, { preferredVariant = null } = {}) {
      const card = runtime.document.createElement("article");
      card.setAttribute("data-rendered-product-id", product.id);
      card.setAttribute("data-rendered-variant-id", preferredVariant?.id || "");
      card.textContent = product.name;
      return card;
    },
  };
  runtime.run("catalog-page.js");
  return runtime;
};

const optionValues = (select) =>
  select.options.map((option) => option.value).filter(Boolean);

const setSelect = (select, value) => {
  assert.ok(optionValues(select).includes(String(value)), `${value} should be selectable`);
  select.value = String(value);
  select.dispatchEvent(new FakeEvent("change"));
};

const settle = async () => {
  for (let index = 0; index < 6; index += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

const selectVehicle = async (runtime, vehicle) => {
  runtime.make.value = "";
  setSelect(runtime.year, vehicle.year);
  setSelect(runtime.make, vehicle.makeName);
  await settle();
  setSelect(runtime.model, vehicle.modelName);
};

const getCard = (runtime) => {
  const card = runtime.panel.querySelector(".dca-specs-card");
  assert.ok(card, "The vehicle fitment card should render immediately");
  return card;
};

const getCardLabels = (card) =>
  card.querySelectorAll(".dca-specs-tile-label").map((node) => node.textContent);

const getCardValues = (card) =>
  card.querySelectorAll(".dca-specs-tile-value").map((node) => node.textContent);

const createEngineRuntime = () => {
  const runtime = createRuntime();
  loadSharedCommerce(runtime);
  runtime.run("fitment-data.js");
  runtime.run("fitment-engine.js");
  return runtime;
};

const compatibleVariantIds = (runtime, vehicle) =>
  [...runtime.window.DCACommerce.variantById.keys()]
    .filter(
      (variantId) =>
        runtime.window.DCACommerce.fitment.evaluate(variantId, vehicle).status ===
        "compatible",
    )
    .sort();

const compatibleProductIds = (runtime, vehicle) =>
  Array.from(runtime.window.DCACommerce.catalog.products)
    .filter((product) =>
      product.variants.some(
        (variant) =>
          runtime.window.DCACommerce.fitment.evaluate(variant.id, vehicle).status ===
          "compatible",
      ),
    )
    .map((product) => product.id)
    .sort();

const tests = [];
const test = (name, callback) => tests.push({ name, callback });

test("all selector, vehicle fitment, and catalog fitment scripts parse", () => {
  for (const [name, source] of scriptSources) {
    assert.doesNotThrow(() => new vm.Script(source, { filename: name }), `${name} syntax`);
  }
});

test("the complete verified coverage inventory is exact and vehicle-specific", () => {
  const runtime = createRuntime();
  runtime.run("vehicle-audio-fitment-data.js");
  const api = runtime.window.DCA_VEHICLE_AUDIO_FITMENT;
  const inventory = Array.from(api.getVerifiedVehicles(), (vehicle) => ({
      year: String(vehicle.year),
      makeName: vehicle.makeName,
      modelName: vehicle.modelName,
    }));

  assert.deepEqual(inventory, EXPECTED_VERIFIED_VEHICLES);
  assert.equal(new Set(inventory.map((item) => JSON.stringify(item))).size, inventory.length);

  const applications = inventory.map((vehicle) => api.resolve(vehicle));
  assert.ok(applications.every((application) => application?.status === "verified"));
  assert.ok(inventory.every((vehicle) => api.isVerifiedVehicle(vehicle)));
  assert.equal(new Set(applications).size, inventory.length);
  assert.equal(new Set(applications.map((application) => application.id)).size, inventory.length);
  assert.equal(
    new Set(applications.map((application) => application.vehicleKey)).size,
    inventory.length,
  );
  for (const application of applications) {
    assert.equal(application.id, `vehicle:${application.vehicleKey}`);
    assert.ok(application.verifiedRecordId);
    assert.deepEqual(Object.keys(application.speakers).sort(), ["dash", "front", "rear"]);
  }
});

test("the selector exposes every configured year and make and registers every returned model", async () => {
  const expectedModels = {
    "2024|Aston Martin": ["DBX", "DBX 707", "DBX707", "Valkyrie"],
    "2023|Ford": ["Escape", "F-150", "Mustang"],
    "2013|BMW": ["528i", "528i xDrive"],
    "2018|Toyota": ["Camry", "RAV4", "Tacoma"],
  };

  for (const [key, models] of Object.entries(expectedModels)) {
    const [year, makeName] = key.split("|");
    const runtime = loadSelector({ [key]: MODEL_RESPONSES[key] });
    assert.deepEqual(optionValues(runtime.year), EXPECTED_YEARS);
    assert.deepEqual(optionValues(runtime.make), EXPECTED_MAKES);
    assert.equal(runtime.make.disabled, true, "Make stays disabled until a year is selected");

    setSelect(runtime.year, year);
    assert.equal(runtime.make.disabled, false);
    setSelect(runtime.make, makeName);
    await settle();

    assert.deepEqual(optionValues(runtime.model), models, `${key} models must be complete`);
    assert.equal(runtime.model.disabled, false);
    assert.equal(
      runtime.fetchCalls.length,
      VEHICLE_TYPES.length,
      `${key} should make one request per supported vehicle type`,
    );
    assert.deepEqual(
      runtime.fetchCalls.map(({ vehicleType }) => vehicleType).sort(),
      [...VEHICLE_TYPES].sort(),
    );
    for (const call of runtime.fetchCalls) {
      assert.equal(call.year, year);
      assert.equal(call.make, makeName);
      assert.match(call.url, /\/GetModelsForMakeYear\/make\//);
      assert.match(call.url, /\/vehicletype\//);
    }
    for (const unrelatedModel of MODEL_RESPONSES[key].Trailer) {
      assert.ok(!optionValues(runtime.model).includes(unrelatedModel));
    }
    assert.equal(runtime.enableAudits.length, 1);
    assert.deepEqual(
      runtime.enableAudits[0].unregistered,
      [],
      `${key} models must be registered before the control is enabled`,
    );

    const applications = models.map((modelName) =>
      runtime.window.DCA_VEHICLE_AUDIO_FITMENT.resolve({
        year,
        makeName,
        modelName,
      }),
    );
    assert.equal(new Set(applications).size, models.length);
    assert.equal(new Set(applications.map(({ id }) => id)).size, models.length);
    assert.equal(new Set(applications.map(({ vehicleKey }) => vehicleKey)).size, models.length);
    assert.ok(
      applications.every((application) =>
        ["verified", "unavailable"].includes(application.status),
      ),
    );
  }
});

test("model selection immediately renders only Front, Rear, and Dash sizes", async () => {
  const runtime = loadSelector();
  await selectVehicle(runtime, { year: "2011", makeName: "Ford", modelName: "Focus" });
  let card = getCard(runtime);
  assert.equal(card.getAttribute("aria-label"), "Verified Vehicle Audio Fitment");
  assert.deepEqual(getCardLabels(card), [
    "Front speaker size",
    "Rear speaker size",
    "Dash speaker size",
  ]);
  assert.deepEqual(getCardValues(card), [
    "6 x 8 in",
    "6 x 8 in",
    "Fitment information unavailable",
  ]);
  assert.equal(card.querySelectorAll("dt").length, 3);
  assert.equal(card.querySelectorAll("dd").length, 3);
  assert.equal(card.querySelectorAll("p").length, 0);
  assert.equal(card.querySelectorAll("ul").length, 0);

  setSelect(runtime.make, "Toyota");
  await settle();
  setSelect(runtime.model, "Camry");
  card = getCard(runtime);
  assert.deepEqual(getCardLabels(card), [
    "Front speaker size",
    "Rear speaker size",
    "Dash speaker size",
  ]);
  assert.deepEqual(getCardValues(card), [
    "6 x 9 in",
    "6 x 9 in",
    "Fitment information unavailable",
  ]);
  assert.equal(runtime.fetchCalls.length, VEHICLE_TYPES.length * 2);
  assert.deepEqual(
    runtime.fetchCalls.map(({ vehicleType }) => vehicleType).sort(),
    [...VEHICLE_TYPES, ...VEHICLE_TYPES].sort(),
  );
  assert.ok(!optionValues(runtime.model).includes("Unrelated Trailer"));
});

test("2013 BMW 528i renders its verified front and rear sizes without guessing dash fitment", async () => {
  const runtime = loadSelector({ "2013|BMW": MODEL_RESPONSES["2013|BMW"] });
  await selectVehicle(runtime, { year: "2013", makeName: "BMW", modelName: "528i" });

  const card = getCard(runtime);
  assert.equal(card.getAttribute("aria-label"), "Verified Vehicle Audio Fitment");
  assert.deepEqual(getCardLabels(card), [
    "Front speaker size",
    "Rear speaker size",
    "Dash speaker size",
  ]);
  assert.deepEqual(getCardValues(card), [
    "4 in (100 mm)",
    "4 in (100 mm)",
    "Fitment information unavailable",
  ]);
  assert.equal(card.querySelectorAll("dt").length, 3);
  assert.equal(card.querySelectorAll("dd").length, 3);
  assert.equal(card.querySelectorAll("p").length, 0);
  assert.equal(card.querySelectorAll("ul").length, 0);
});

test("selector submit redirects to the unfiltered shop with the selected vehicle", async () => {
  const runtime = loadSelector({ "2013|BMW": MODEL_RESPONSES["2013|BMW"] });
  await selectVehicle(runtime, { year: "2013", makeName: "BMW", modelName: "528i" });
  const submitEvent = new FakeEvent("submit", { cancelable: true });
  runtime.form.dispatchEvent(submitEvent);

  assert.equal(submitEvent.defaultPrevented, true);
  assert.equal(runtime.assignedUrls.length, 1);
  const redirect = new URL(runtime.assignedUrls[0], "https://example.test/");
  assert.equal(redirect.pathname, "/catalog.html");
  assert.equal(redirect.searchParams.has("fit"), false);
  const vehicle = JSON.parse(redirect.searchParams.get("vehicle"));
  assert.equal(vehicle.year, "2013");
  assert.equal(vehicle.makeName, "BMW");
  assert.equal(vehicle.modelName, "528i");
  assert.equal(runtime.fetchCalls.length, VEHICLE_TYPES.length);
  assert.deepEqual(
    runtime.fetchCalls.map(({ vehicleType }) => vehicleType).sort(),
    [...VEHICLE_TYPES].sort(),
  );
  assert.ok(!optionValues(runtime.model).includes("Unrelated Trailer"));
});

test("fitment rules return exact, different product sets for Focus, Camry, and DBX", () => {
  const runtime = createEngineRuntime();
  const vehicles = {
    focus: { year: "2011", makeName: "Ford", modelName: "Focus" },
    camry: { year: "2011", makeName: "Toyota", modelName: "Camry" },
    dbx: { year: "2024", makeName: "Aston Martin", modelName: "DBX" },
  };

  for (const [name, vehicle] of Object.entries(vehicles)) {
    assert.deepEqual(
      compatibleVariantIds(runtime, vehicle),
      [...EXPECTED_COMPATIBLE_VARIANTS[name]].sort(),
      `${name} compatible variants`,
    );
  }
  assert.notDeepEqual(
    compatibleVariantIds(runtime, vehicles.focus),
    compatibleVariantIds(runtime, vehicles.camry),
  );
  assert.deepEqual(compatibleProductIds(runtime, vehicles.dbx), []);
  assert.equal(runtime.fetchCalls.length, 0);
});

test("catalog fit=compatible renders only compatible product families and keeps fitment visible", () => {
  const vehicle = { year: "2011", makeName: "Toyota", modelName: "Camry" };
  const runtime = loadCatalog(vehicle);
  const expectedProducts = compatibleProductIds(runtime, vehicle);
  const renderedProducts = runtime.grid.children
    .map((card) => card.getAttribute("data-rendered-product-id"))
    .filter(Boolean)
    .sort();

  assert.ok(expectedProducts.length > 0, "The fixture vehicle needs compatible products");
  assert.deepEqual(renderedProducts, expectedProducts);
  assert.equal(runtime.compatibility.value, "compatible");
  assert.match(runtime.heading.textContent, /^Products for 2011 Toyota Camry$/);
  assert.match(runtime.count.textContent, /^\d+ product famil(?:y|ies)$/);

  for (const productId of renderedProducts) {
    const product = runtime.window.DCACommerce.productById.get(productId);
    assert.ok(
      product.variants.some(
        (variant) =>
          runtime.window.DCACommerce.fitment.evaluate(variant.id, vehicle).status ===
          "compatible",
      ),
      `${productId} must contain a compatible variant`,
    );
  }
  const unknownOnlyProduct = runtime.window.DCACommerce.catalog.products.find((product) =>
    product.variants.every(
      (variant) =>
        runtime.window.DCACommerce.fitment.evaluate(variant.id, vehicle).status === "unknown",
    ),
  );
  assert.ok(unknownOnlyProduct, "The catalog fixture should contain an unknown-only product");
  assert.ok(!renderedProducts.includes(unknownOnlyProduct.id));

  const card = getCard(runtime);
  assert.deepEqual(getCardLabels(card), [
    "Front speaker size",
    "Rear speaker size",
    "Dash speaker size",
  ]);
  assert.deepEqual(getCardValues(card), [
    "6 x 9 in",
    "6 x 9 in",
    "Fitment information unavailable",
  ]);
  assert.equal(runtime.fetchCalls.length, 0);
});

test("catalog reached from the selector shows every product by default and keeps fitment visible", () => {
  const vehicle = { year: "2013", makeName: "BMW", modelName: "528i" };
  const runtime = loadCatalog(vehicle, { fit: null });
  const renderedProducts = runtime.grid.children
    .map((card) => card.getAttribute("data-rendered-product-id"))
    .filter(Boolean)
    .sort();
  const allProducts = Array.from(
    runtime.window.DCACommerce.catalog.products,
    (product) => product.id,
  ).sort();

  assert.deepEqual(renderedProducts, allProducts);
  assert.equal(runtime.compatibility.value, "all");
  assert.equal(runtime.heading.textContent, "All products");

  const card = getCard(runtime);
  assert.deepEqual(getCardLabels(card), [
    "Front speaker size",
    "Rear speaker size",
    "Dash speaker size",
  ]);
  assert.deepEqual(getCardValues(card), [
    "4 in (100 mm)",
    "4 in (100 mm)",
    "Fitment information unavailable",
  ]);
  assert.equal(runtime.fetchCalls.length, 0);
});

test("an unsupported external vehicle remains explicitly unavailable", () => {
  const runtime = createRuntime();
  runtime.run("vehicle-audio-fitment-data.js");
  const api = runtime.window.DCA_VEHICLE_AUDIO_FITMENT;
  const unsupported = { year: "2019", makeName: "Honda", modelName: "Accord" };
  const application = api.resolve(unsupported);

  assert.equal(api.isVerifiedVehicle(unsupported), false);
  assert.equal(application.status, "unavailable");
  assert.equal(application.verifiedRecordId, null);
  assert.deepEqual(
    Object.values(application.speakers),
    Array(3).fill("Fitment information unavailable"),
  );
  assert.equal(runtime.fetchCalls.length, 0);
});

let failures = 0;
for (const { name, callback } of tests) {
  try {
    await callback();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
  }
}

if (failures) {
  console.error(`\n${failures} vehicle audio fitment test${failures === 1 ? "" : "s"} failed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${tests.length} vehicle audio fitment tests passed.`);
}
