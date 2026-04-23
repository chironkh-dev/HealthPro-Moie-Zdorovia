// Meds feature module.
// The pill management logic (DRUG_DB, addPill, deletePill, togglePill,
// renderPills, checkDrugName, validateDosageAmount, searchPharmacy,
// onPillDaysChange) is currently centralised in src/app.js because it
// shares mutable state with the rest of the app. This module is the
// designated location for that logic; future refactors should extract it
// here and import shared state from src/core/.
export {};
