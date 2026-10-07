// Same-origin BFF API endpoint PATHS observed live on the portal (env-agnostic).
// Combine with ENV.baseURL to form absolute URLs (see utils/api/datacentre.api.js);
// also handy for route matching (page.route / waitForResponse) and assertions.
const Endpoints = Object.freeze({
  dataCentreList: '/api/catalog/dataCentre/execute',
  dataCentreById: '/api/catalog/dataCentreById/execute',
  countryList: '/api/catalog/country/execute',
  billingTransactionList: '/api/catalog/billingTransaction/execute',
  packageCategoryList: '/api/catalog/packageCategory/execute',
  packageItemCategoryList: '/api/catalog/packageItemCategory/execute',
  translations: '/api/translations/**',
  userSessionContext: '/api/catalog/userSessionContext/execute',
});

module.exports = { Endpoints };
