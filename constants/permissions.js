// Feature-Management capabilities for the Data Centre module.
// The 5-tier progressive baseline (Get → Update → Create → Approver → Admin)
// is documented in context/db_validation.md (Query E).
const DataCentreCapability = Object.freeze({
  GET: 'capabilityDataCentreGet',
  UPDATE: 'capabilityDataCentreUpdate',
  CREATE: 'capabilityDataCentreCreate',
  APPROVER: 'capabilityDataCentreApprover',
  ADMIN: 'capabilityDataCentreAdmin',
});

module.exports = { DataCentreCapability };
