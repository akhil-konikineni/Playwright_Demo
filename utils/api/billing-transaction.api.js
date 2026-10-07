const { ENV } = require('../../config/env');
const { Endpoints } = require('../../constants/endpoints');

const apiUrl = (path) => `${ENV.baseURL}${path}`;

// Billing Transaction BFF API helper. Same-origin catalog API with cookie-based (BFF)
// auth — construct with `new BillingTransactionApi(page.request)` so the session
// cookie is carried; no Bearer token needed.
//
// The list defaults to the non-deleted statuses (setup/requested/active/exported).
const DEFAULT_STATUS_QUERY = ['exported', 'requested', 'setup', 'active']
  .map((s) => `&status=${s}`)
  .join('');

class BillingTransactionApi {
  constructor(request, token = null) {
    this.request = request;
    this.token = token;
  }

  _headers() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  // Default paginated list (matches the UI's first-page call).
  async getList(pageSize = 50) {
    return this.request.get(
      `${apiUrl(Endpoints.billingTransactionList)}?pageSize=${pageSize}&enrich=title&getPageCount=true${DEFAULT_STATUS_QUERY}`,
      { headers: this._headers() }
    );
  }

  // Filter by a single status value.
  async getListByStatus(status, pageSize = 50) {
    return this.request.get(
      `${apiUrl(Endpoints.billingTransactionList)}?pageSize=${pageSize}&enrich=title&getPageCount=true&status=${encodeURIComponent(status)}`,
      { headers: this._headers() }
    );
  }
}

module.exports = { BillingTransactionApi, DEFAULT_STATUS_QUERY };
