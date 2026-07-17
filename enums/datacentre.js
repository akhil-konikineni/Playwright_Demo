const DataCentreStatus = {
  Setup: 'setup',
  Requested: 'requested',
  Active: 'active',
  Deleted: 'deleted',
};

const DataCentreAction = {
  Request: 'Request',
  Delete: 'Delete',
  Approve: 'Approve',
  SetUp: 'Set Up',
};

const DataCentrePermission = {
  Get: 'CapabilityDatacentreGet',
  Create: 'CapabilityDatacentreCreate',
  Update: 'CapabilityDatacentreUpdate',
  Approver: 'CapabilityDatacentreApprover',
  Admin: 'CapabilityDatacentreAdmin',
};

module.exports = { DataCentreStatus, DataCentreAction, DataCentrePermission };
