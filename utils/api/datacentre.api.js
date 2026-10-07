const { ENV } = require('../../config/env');
const { Endpoints } = require('../../constants/endpoints');

// Absolute URL for a same-origin BFF endpoint, built from the active environment's
// baseURL + an endpoint path (env-agnostic paths live in constants/endpoints.js).
const apiUrl = (path) => `${ENV.baseURL}${path}`;

// DataCentre BFF API helper. Same-origin catalog API with cookie-based (BFF) auth —
// construct with `new DataCentreApi(page.request)` so the session cookie is carried;
// no Bearer token needed.
class DataCentreApi {
  constructor(request, token = null) {
    this.request = request;
    this.token = token;
  }

  _headers() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  async getList(pageSize = 50) {
    return this.request.get(
      `${apiUrl(Endpoints.dataCentreList)}?pageSize=${pageSize}&enrich=title&getPageCount=true`,
      { headers: this._headers() }
    );
  }

  // Filter by one or more status values (repeated `status=` query params).
  async getListByStatus(statuses = [], pageSize = 50) {
    const q = statuses.map((s) => `&status=${encodeURIComponent(s)}`).join('');
    return this.request.get(
      `${apiUrl(Endpoints.dataCentreList)}?pageSize=${pageSize}&enrich=title&getPageCount=true${q}`,
      { headers: this._headers() }
    );
  }

  async getById(id) {
    return this.request.get(
      `${apiUrl(Endpoints.dataCentreById)}?dataCentreId=${id}&enrich=title`,
      { headers: this._headers() }
    );
  }

  async getCountries() {
    return this.request.get(apiUrl(Endpoints.countryList), { headers: this._headers() });
  }
}

module.exports = { DataCentreApi };
