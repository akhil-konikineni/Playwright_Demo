const BASE_URL = 'https://mno.api.qan.eseye.io/v2/dataCentre';
const COUNTRY_URL = 'https://common.api.qan.eseye.io/v2/country';

class DataCentreApi {
  constructor(request, token) {
    this.request = request;
    this.token = token;
  }

  _headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async getList(pageToken = 0, pageSize = 50) {
    return this.request.get(
      `${BASE_URL}?pageToken=${pageToken}&pageSize=${pageSize}&getPageCount=false&enrich=title`,
      { headers: this._headers() }
    );
  }

  async getById(id) {
    return this.request.get(`${BASE_URL}/${id}`, { headers: this._headers() });
  }

  async getCountries() {
    return this.request.get(COUNTRY_URL, { headers: this._headers() });
  }
}

module.exports = { DataCentreApi };
