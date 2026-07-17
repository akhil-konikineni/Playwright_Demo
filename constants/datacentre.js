const DC_STATUS = {
  SETUP: 'setup',
  REQUESTED: 'requested',
  ACTIVE: 'active',
  DELETED: 'deleted',
};

const DC_ACTIONS = {
  REQUEST: 'Request',
  DELETE: 'Delete',
  APPROVE: 'Approve',
  SET_UP: 'Set Up',
};

const DC_APP_URL = 'https://portal.qan.aws.eseye.io/network-management/data-centres';

const DC_API = {
  LIST: 'https://mno.api.qan.eseye.io/v2/dataCentre?pageToken=0&pageSize=50&getPageCount=false&enrich=title',
  COUNTRY: 'https://common.api.qan.eseye.io/v2/country',
  BASE: 'https://mno.api.qan.eseye.io/v2/dataCentre',
};

const DC_TITLE_REGEX = /^\S{1,8}$/;

module.exports = { DC_STATUS, DC_ACTIONS, DC_APP_URL, DC_API, DC_TITLE_REGEX };
