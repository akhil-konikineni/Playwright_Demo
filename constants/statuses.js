// Data Centre lifecycle states — confirmed live from the QAN UI.
// Transition rules live in context/permissions_and_status_model.md.
const DataCentreStatus = Object.freeze({
  SETUP: 'Setup',
  REQUESTED: 'Requested',
  ACTIVE: 'Active',
  DELETED: 'Deleted',
});

const ALL_STATUSES = Object.freeze(Object.values(DataCentreStatus));

module.exports = { DataCentreStatus, ALL_STATUSES };
