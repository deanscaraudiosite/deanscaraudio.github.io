(function () {
  "use strict";

  const metraSource = {
    id: "metra-official-product-pages-2026-07-17",
    name: "Metra official product pages",
    authority: "manufacturer",
    coverage: "partial",
    checkedAt: "2026-07-17",
    notice:
      "Manually curated from the cited official product pages. This is not an exhaustive Metra application feed.",
  };

  const scoscheUrl =
    "https://www.scosche.com/media/wysiwyg/PDFs/CA_APP_GUIDE.pdf";

  const scoscheSource = {
    id: "scosche-car-audio-application-guide-2026-07-22",
    name: "Scosche Car Audio Application Guide",
    authority: "manufacturer_application_guide",
    coverage: "partial",
    checkedAt: "2026-07-22",
    notice:
      "Used only for the cited Ford Focus and Toyota Camry speaker-size applications represented in the verified vehicle dataset.",
  };

  // These are exact nominal sizes stated by the current catalog variants.
  // Mixed-size lots and products without an explicit matching size are
  // deliberately excluded.
  const catalogSpeakerSizes = Object.freeze([
    Object.freeze({ variantId: "spk-011-variant", size: "6x8" }),
    Object.freeze({ variantId: "spk-001-variant", size: "6x9" }),
    Object.freeze({ variantId: "spk-002-variant", size: "6x9" }),
    Object.freeze({ variantId: "spk-003-variant", size: "6x9" }),
    Object.freeze({ variantId: "spk-004-variant", size: "6x9" }),
    Object.freeze({ variantId: "spk-005-variant", size: "6x9" }),
    Object.freeze({ variantId: "spk-006-variant", size: "6x9" }),
    Object.freeze({ variantId: "spk-025-variant", size: "6x9" }),
    Object.freeze({ variantId: "spk-026-variant", size: "6x9" }),
    Object.freeze({ variantId: "rf-r169x2-std", size: "6x9" }),
    Object.freeze({ variantId: "rf-p1692-std", size: "6x9" }),
    Object.freeze({ variantId: "alpine-s-s69-std", size: "6x9" }),
    Object.freeze({ variantId: "pioneer-ts-a6991f-std", size: "6x9" }),
    Object.freeze({ variantId: "kenwood-kfc-6966s-std", size: "6x9" }),
    Object.freeze({ variantId: "gravity-gr-695-std", size: "6x9" }),
  ]);

  const verifiedSpeakerApplications = Object.freeze([
    Object.freeze({
      id: "ford-focus-2008-2011",
      make: "Ford",
      models: Object.freeze(["Focus"]),
      yearStart: 2008,
      yearEnd: 2011,
      size: "6x8",
      sizeLabel: "6 x 8 in",
    }),
    Object.freeze({
      id: "toyota-camry-2007-2011",
      make: "Toyota",
      models: Object.freeze(["Camry"]),
      yearStart: 2007,
      yearEnd: 2011,
      size: "6x9",
      sizeLabel: "6 x 9 in",
    }),
  ]);

  const rules = Object.freeze(
    verifiedSpeakerApplications.flatMap((application) =>
      catalogSpeakerSizes
        .filter((speaker) => speaker.size === application.size)
        .map((speaker) =>
          Object.freeze({
            id: `${application.id}-${speaker.variantId}`,
            variantId: speaker.variantId,
            decision: "compatible",
            match: Object.freeze({
              make: application.make,
              models: application.models,
              yearStart: application.yearStart,
              yearEnd: application.yearEnd,
            }),
            customerNote: `Matches the verified ${application.sizeLabel} front and rear speaker size.`,
            conditions: Object.freeze([]),
            evidence: Object.freeze({
              sourceId: scoscheSource.id,
              url: scoscheUrl,
              label: scoscheSource.name,
              checkedAt: scoscheSource.checkedAt,
              note:
                "The vehicle application guide and the catalog variant specify the same nominal speaker size.",
            }),
            priority: 100,
          }),
        ),
    ),
  );

  window.DCA_FITMENT_DATA = Object.freeze({
    schemaVersion: 1,
    releaseId: "verified-speaker-size-fitment-2026-07-22",
    publishedAt: "2026-07-22T12:00:00-07:00",
    coverage: "partial",
    absencePolicy: "unknown",
    notices: {
      noMatch:
        "No matching record means unknown. It must never be interpreted as fits or does not fit.",
      production:
        "Production-wide fitment requires approved SEMA Data and manufacturer datasets plus qualifier coverage.",
    },
    providers: [
      {
        id: "nhtsa-vpic",
        name: "NHTSA vPIC",
        role: "vehicle_identity",
        status: "connected_on_homepage",
        authority: "government",
        url: "https://vpic.nhtsa.dot.gov/api/",
        notice:
          "Supplies vehicle identity only; it does not supply aftermarket car-audio fitment.",
      },
      {
        id: metraSource.id,
        name: metraSource.name,
        role: "current_partial_fitment",
        status: "manual_source_cited_snapshot",
        authority: metraSource.authority,
        coverage: metraSource.coverage,
        url: "https://www.metraonline.com/vehicle-fit-guide",
        notice: metraSource.notice,
      },
      {
        id: scoscheSource.id,
        name: scoscheSource.name,
        role: "verified_speaker_size_fitment",
        status: "manual_source_cited_snapshot",
        authority: scoscheSource.authority,
        coverage: scoscheSource.coverage,
        url: scoscheUrl,
        notice: scoscheSource.notice,
      },
      {
        id: "sema-data",
        name: "SEMA Data reseller API",
        role: "recommended_production_feed",
        status: "requires_reseller_and_brand_approval",
        authority: "manufacturer_authorized_exchange",
        url: "https://apps.semadata.org/sdapi/v2",
        notice:
          "The importer and schema are ready for an approved feed, but no SEMA credentials or brand permissions are installed in this static site.",
      },
    ],
    sources: [metraSource, scoscheSource],
    // Only exact size intersections between a verified vehicle application and
    // an explicitly sized catalog variant become compatible. All other SKUs
    // remain unknown under the strict absence policy.
    rules,
  });
})();
