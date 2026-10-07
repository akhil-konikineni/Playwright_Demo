// App UI routes (paths only — combine with ENV.baseURL or Playwright baseURL).
const Routes = Object.freeze({
  auth: '/auth',
  dataCentres: '/network-management/data-centres',
  dataCentreDetail: (id) => `/network-management/data-centres/${id}`,
  billingTransactions: '/finance/billing-transactions',
  billingTransactionDetail: (id) => `/finance/billing-transactions/${id}`,
});

module.exports = { Routes };
