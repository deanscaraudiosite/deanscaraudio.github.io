(function () {
  "use strict";

  const UNAVAILABLE = "Fitment information unavailable";
  const LOCATIONS = Object.freeze(["front", "rear", "dash"]);

  // Keep evidence with the data, but never expose it in the customer-facing
  // fitment box. Add sizes here only when all covered model years and aliases
  // have been verified to use the same speaker locations.
  const verifiedRecords = Object.freeze([
    Object.freeze({
      id: "aston-martin-dbx-2020-2024",
      make: "aston martin",
      selectorMake: "Aston Martin",
      selectorModels: Object.freeze(["DBX"]),
      models: Object.freeze(["dbx", "dbx707", "dbx 707"]),
      yearStart: 2020,
      yearEnd: 2024,
      sourceStatus: "Manufacturer documented",
      verifiedAt: "2026-07-21",
      speakers: Object.freeze({
        front: "100 mm (3.9 in) + 160 mm (6.3 in)",
        rear: "25 mm (1 in) + 160 mm (6.3 in)",
        dash: "100 mm (3.9 in) + 25 mm (1 in)",
      }),
      sources: Object.freeze([
        Object.freeze({
          label: "Aston Martin DBX Owner's Guide - Media Systems 8.2-8.3",
          url: "https://www.astonmartin.com/guides/MY83-19A321-HA.pdf",
        }),
        Object.freeze({
          label: "Aston Martin DBX technology specification",
          url: "https://media.astonmartin.com/aston-martin-unveils-dbx-an-suv-with-the-soul-of-a-sports-car-3/?lang=eng",
        }),
      ]),
    }),
    Object.freeze({
      id: "ford-focus-2008-2011",
      make: "ford",
      selectorMake: "Ford",
      selectorModels: Object.freeze(["Focus"]),
      models: Object.freeze(["focus"]),
      yearStart: 2008,
      yearEnd: 2011,
      sourceStatus: "Application guide documented",
      verifiedAt: "2026-07-22",
      speakers: Object.freeze({
        front: "6 x 8 in",
        rear: "6 x 8 in",
        dash: UNAVAILABLE,
      }),
      sources: Object.freeze([
        Object.freeze({
          label: "Scosche Car Audio Application Guide - Ford, page 20",
          url: "https://www.scosche.com/media/wysiwyg/PDFs/CA_APP_GUIDE.pdf",
        }),
      ]),
    }),
    Object.freeze({
      id: "toyota-camry-2007-2011",
      make: "toyota",
      selectorMake: "Toyota",
      selectorModels: Object.freeze(["Camry"]),
      models: Object.freeze(["camry"]),
      yearStart: 2007,
      yearEnd: 2011,
      sourceStatus: "Application guide documented",
      verifiedAt: "2026-07-22",
      speakers: Object.freeze({
        front: "6 x 9 in",
        rear: "6 x 9 in",
        dash: UNAVAILABLE,
      }),
      sources: Object.freeze([
        Object.freeze({
          label: "Scosche Car Audio Application Guide - Toyota, page 46",
          url: "https://www.scosche.com/media/wysiwyg/PDFs/CA_APP_GUIDE.pdf",
        }),
      ]),
    }),
  ]);

  // Every model added to the selector is registered here before it becomes
  // selectable. A missing verified source produces a vehicle-specific record
  // with explicit unavailable values instead of borrowed or guessed sizes.
  const applicationRecords = new Map();

  // This is the source-backed coverage inventory, not the full vehicle
  // identity list shown by the selector. The selector registers every model
  // it receives; vehicles outside this list resolve to explicit unavailable
  // values instead of borrowed or guessed sizes.
  const verifiedVehicles = Object.freeze(
    verifiedRecords
      .flatMap((record) =>
        record.selectorModels.flatMap((modelName) =>
          Array.from({ length: record.yearEnd - record.yearStart + 1 }, (_, offset) =>
            Object.freeze({
              year: record.yearStart + offset,
              makeName: record.selectorMake,
              modelName,
            }),
          ),
        ),
      )
      .sort(
        (left, right) =>
          right.year - left.year ||
          left.makeName.localeCompare(right.makeName) ||
          left.modelName.localeCompare(right.modelName),
      ),
  );

  const normalizeForMatch = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const normalizeForIdentity = (value) =>
    String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const normalizeVehicle = (vehicle) => {
    if (!vehicle || typeof vehicle !== "object") return null;
    const year = Number.parseInt(vehicle.year, 10);
    const makeName = String(vehicle.makeName || "").trim();
    const modelName = String(vehicle.modelName || "").trim();
    if (!Number.isInteger(year) || year < 1900 || year > 2100 || !makeName || !modelName) {
      return null;
    }
    return { year, makeName, modelName };
  };

  const makeVehicleKey = (vehicle) => {
    const normalized = normalizeVehicle(vehicle);
    if (!normalized) return "";
    return [
      normalized.year,
      normalizeForIdentity(normalized.makeName),
      normalizeForIdentity(normalized.modelName),
    ].join(":");
  };

  const findVerifiedRecord = (vehicle) => {
    const normalized = normalizeVehicle(vehicle);
    if (!normalized) return null;
    const make = normalizeForMatch(normalized.makeName);
    const model = normalizeForMatch(normalized.modelName);
    return verifiedRecords.find(
      (record) =>
        normalizeForMatch(record.make) === make &&
        normalized.year >= record.yearStart &&
        normalized.year <= record.yearEnd &&
        record.models.some((candidate) => normalizeForMatch(candidate) === model),
    ) || null;
  };

  const createSpeakerSizes = (verifiedRecord) =>
    Object.freeze(
      Object.fromEntries(
        LOCATIONS.map((location) => {
          const value = verifiedRecord?.speakers?.[location];
          return [location, value === null ? null : value || UNAVAILABLE];
        }),
      ),
    );

  const resolve = (vehicle) => {
    const normalized = normalizeVehicle(vehicle);
    if (!normalized) return null;
    const key = makeVehicleKey(normalized);
    const existing = applicationRecords.get(key);
    if (existing) return existing;

    const verifiedRecord = findVerifiedRecord(normalized);
    const application = Object.freeze({
      id: `vehicle:${key}`,
      vehicleKey: key,
      year: normalized.year,
      makeName: normalized.makeName,
      modelName: normalized.modelName,
      status: verifiedRecord ? "verified" : "unavailable",
      verifiedRecordId: verifiedRecord?.id || null,
      speakers: createSpeakerSizes(verifiedRecord),
    });
    applicationRecords.set(key, application);
    return application;
  };

  const registerMany = (vehicles) => {
    if (!Array.isArray(vehicles)) return Object.freeze([]);
    return Object.freeze(vehicles.map(resolve).filter(Boolean));
  };

  const has = (vehicle) => applicationRecords.has(makeVehicleKey(vehicle));

  const getVerifiedVehicles = () => verifiedVehicles;

  const getVerifiedYears = () =>
    Object.freeze([...new Set(verifiedVehicles.map((vehicle) => vehicle.year))]);

  const getVerifiedMakes = (year) => {
    const selectedYear = Number.parseInt(year, 10);
    return Object.freeze([
      ...new Set(
        verifiedVehicles
          .filter((vehicle) => vehicle.year === selectedYear)
          .map((vehicle) => vehicle.makeName),
      ),
    ]);
  };

  const getVerifiedModels = (year, makeName) => {
    const selectedYear = Number.parseInt(year, 10);
    const selectedMake = normalizeForMatch(makeName);
    return Object.freeze([
      ...new Set(
        verifiedVehicles
          .filter(
            (vehicle) =>
              vehicle.year === selectedYear &&
              normalizeForMatch(vehicle.makeName) === selectedMake,
          )
          .map((vehicle) => vehicle.modelName),
      ),
    ]);
  };

  const isVerifiedVehicle = (vehicle) => {
    const key = makeVehicleKey(vehicle);
    return verifiedVehicles.some((candidate) => makeVehicleKey(candidate) === key);
  };

  window.DCA_VEHICLE_AUDIO_FITMENT_DATA = verifiedRecords;
  window.DCA_VEHICLE_AUDIO_FITMENT = Object.freeze({
    unavailableText: UNAVAILABLE,
    locations: LOCATIONS,
    verifiedRecords,
    verifiedVehicles,
    resolve,
    registerMany,
    has,
    getVerifiedVehicles,
    getVerifiedYears,
    getVerifiedMakes,
    getVerifiedModels,
    isVerifiedVehicle,
    getRegisteredCount: () => applicationRecords.size,
    makeVehicleKey,
  });
})();
