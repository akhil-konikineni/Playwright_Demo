// Billing Transaction (Finance -> Billing Transactions) lifecycle states and
// capabilities — confirmed live on QAN + against oncilla.billingTransactionDefinition.
// The list defaults to setup/requested/active/exported (deleted excluded).
const BillingTransactionStatus = Object.freeze({
  SETUP: 'Setup',
  REQUESTED: 'Requested',
  ACTIVE: 'Active',
  EXPORTED: 'Exported',
  DELETED: 'Deleted',
});

const ALL_BILLING_TRANSACTION_STATUSES = Object.freeze(Object.values(BillingTransactionStatus));

// Statuses shown by default in the grid (the list query excludes 'deleted').
const DEFAULT_LIST_STATUSES = Object.freeze([
  BillingTransactionStatus.SETUP,
  BillingTransactionStatus.REQUESTED,
  BillingTransactionStatus.ACTIVE,
  BillingTransactionStatus.EXPORTED,
]);

// 5-tier capability model. Filtering is governed by GET.
const BillingTransactionCapability = Object.freeze({
  GET: 'capabilityBillingTransactionGet',
  UPDATE: 'capabilityBillingTransactionUpdate',
  CREATE: 'capabilityBillingTransactionCreate',
  APPROVER: 'capabilityBillingTransactionApprover',
  ADMIN: 'capabilityBillingTransactionAdmin',
});

module.exports = {
  BillingTransactionStatus,
  ALL_BILLING_TRANSACTION_STATUSES,
  DEFAULT_LIST_STATUSES,
  BillingTransactionCapability,
};
