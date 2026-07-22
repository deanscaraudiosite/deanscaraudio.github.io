(() => {
  "use strict";

  const form = document.getElementById("fitment-form");
  if (!form) return;

  const COMMON_MAKES = [
    "Acura", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Buick", "Cadillac",
    "Chevrolet", "Chrysler", "Dodge", "Ferrari", "FIAT", "Ford", "Genesis", "GMC",
    "Honda", "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia", "Lamborghini", "Land Rover",
    "Lexus", "Lincoln", "Maserati", "Mazda", "McLaren", "Mercedes-Benz", "MINI",
    "Mitsubishi", "Nissan", "Polestar", "Porsche", "RAM", "Rolls-Royce", "Subaru",
    "Tesla", "Toyota", "Volkswagen", "Volvo",
  ];
  const VEHICLE_TYPES = [
    "Passenger Car",
    "Multipurpose Passenger Vehicle",
    "Truck",
  ];

  const yearSelect = document.getElementById("fitment-year");
  const makeSelect = document.getElementById("fitment-make");
  const modelSelect = document.getElementById("fitment-model");
  const submitButton = document.getElementById("fitment-submit");
  const status = document.getElementById("fitment-status");
  const Commerce = window.DCACommerce;
  const audioFitment = window.DCA_VEHICLE_AUDIO_FITMENT;
  const collator = new Intl.Collator(undefined, { sensitivity: "base" });
  let modelRequestSequence = 0;

  const years = [];
  for (let year = 2026; year >= 1995; year -= 1) years.push(year);

  const fillSelect = (select, values, placeholder) => {
    select.replaceChildren(
      new Option(placeholder, ""),
      ...values.map((value) => new Option(value, value)),
    );
    select.disabled = values.length === 0;
  };

  const updateSubmitState = () => {
    submitButton.disabled = !(
      yearSelect.value &&
      makeSelect.value &&
      modelSelect.value
    );
  };

  const clearSelectedVehicle = () => {
    Commerce?.vehicle?.select?.(null);
  };

  const toVehicleContext = () => ({
    source: "nhtsa-vpic",
    year: yearSelect.value,
    makeName: makeSelect.value,
    modelName: modelSelect.value,
    makeId: makeSelect.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    modelId: modelSelect.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  });

  const selectCurrentVehicle = () => {
    if (!yearSelect.value || !makeSelect.value || !modelSelect.value) return null;

    const vehicle = toVehicleContext();
    const fitment = audioFitment?.resolve?.(vehicle);
    if (!fitment) {
      status.textContent = "Fitment information could not be loaded.";
      return null;
    }

    const selected = Commerce?.vehicle?.select?.(vehicle);
    if (!selected) {
      status.textContent = "Fitment information could not be loaded.";
      return null;
    }

    status.textContent = `${vehicle.year} ${vehicle.makeName} ${vehicle.modelName} fitment updated.`;
    return selected;
  };

  const loadModels = async (year, makeName, selectedModel = "") => {
    if (!year || !makeName) return;
    const requestId = ++modelRequestSequence;

    modelSelect.replaceChildren(new Option("Loading models...", ""));
    modelSelect.disabled = true;
    submitButton.disabled = true;
    status.textContent = "";

    let payloads;
    try {
      const responses = await Promise.all(
        VEHICLE_TYPES.map((vehicleType) =>
          fetch(
            `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(makeName)}/modelyear/${encodeURIComponent(year)}/vehicletype/${encodeURIComponent(vehicleType)}?format=json`,
          ),
        ),
      );
      if (responses.some((response) => !response.ok)) {
        throw new Error("One or more NHTSA vehicle-model requests failed");
      }
      payloads = await Promise.all(responses.map((response) => response.json()));
    } catch (error) {
      if (
        requestId !== modelRequestSequence ||
        yearSelect.value !== String(year) ||
        makeSelect.value !== makeName
      ) {
        return;
      }
      fillSelect(modelSelect, [], "Models unavailable");
      status.textContent = "Vehicle models could not be loaded. Please try again.";
      updateSubmitState();
      return;
    }

    if (
      requestId !== modelRequestSequence ||
      yearSelect.value !== String(year) ||
      makeSelect.value !== makeName
    ) {
      return;
    }

    const uniqueModels = new Map();
    const results = payloads.flatMap((payload) =>
      Array.isArray(payload?.Results) ? payload.Results : [],
    );
    for (const result of results) {
      const modelName = String(result?.Model_Name || "").trim();
      if (!modelName) continue;
      const key = modelName.toLocaleLowerCase();
      if (!uniqueModels.has(key)) uniqueModels.set(key, modelName);
    }
    const models = Array.from(uniqueModels.values()).sort((left, right) =>
      collator.compare(left, right),
    );

    if (!models.length) {
      fillSelect(modelSelect, [], "Models unavailable");
      status.textContent = `No vehicle models were returned for ${year} ${makeName}.`;
      updateSubmitState();
      return;
    }

    audioFitment?.registerMany?.(
      models.map((modelName) => ({
        year,
        makeName,
        modelName,
      })),
    );

    fillSelect(modelSelect, models, "Model");
    if (selectedModel) {
      const restoredModel = models.find(
        (modelName) => modelName.toLocaleLowerCase() === selectedModel.toLocaleLowerCase(),
      );
      if (restoredModel) {
        modelSelect.value = restoredModel;
      }
    }
    updateSubmitState();
  };

  submitButton.textContent = "Search products";
  fillSelect(yearSelect, years, "Year");
  fillSelect(makeSelect, COMMON_MAKES, "Make");
  makeSelect.disabled = true;
  fillSelect(modelSelect, [], "Pick a make first");
  updateSubmitState();

  yearSelect.addEventListener("change", () => {
    modelRequestSequence += 1;
    status.textContent = "";
    clearSelectedVehicle();
    fillSelect(modelSelect, [], yearSelect.value ? "Pick a make first" : "Pick a year first");
    makeSelect.disabled = !yearSelect.value;
    if (!yearSelect.value) {
      makeSelect.value = "";
    } else if (makeSelect.value) {
      loadModels(yearSelect.value, makeSelect.value);
    }
    updateSubmitState();
  });

  makeSelect.addEventListener("change", () => {
    modelRequestSequence += 1;
    status.textContent = "";
    clearSelectedVehicle();
    if (yearSelect.value && makeSelect.value) {
      loadModels(yearSelect.value, makeSelect.value);
    } else {
      fillSelect(modelSelect, [], "Pick a make first");
      updateSubmitState();
    }
  });

  modelSelect.addEventListener("change", () => {
    updateSubmitState();
    if (modelSelect.value) selectCurrentVehicle();
    else clearSelectedVehicle();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = selectCurrentVehicle();
    if (!selected || typeof Commerce?.urlForVehicle !== "function") return;
    window.location.assign(
      Commerce.urlForVehicle("catalog.html", { fit: "compatible" }, selected),
    );
  });

  const saved = Commerce?.vehicle?.current;
  if (
    saved &&
    years.includes(Number(saved.year)) &&
    COMMON_MAKES.includes(saved.makeName)
  ) {
    yearSelect.value = String(saved.year);
    makeSelect.disabled = false;
    makeSelect.value = saved.makeName;
    loadModels(saved.year, saved.makeName, saved.modelName);
  }
})();
