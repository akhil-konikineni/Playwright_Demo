const { BasePage } = require('../base/base.page');

// Page Object for the Data Centre detail page (/network-management/data-centres/{id}).
// Section/heading locators are carried over from prior live observation; re-verify
// against QAN when the suite is next run.
class DataCentreDetailPage extends BasePage {
  get standardFieldsHeading() {
    return this.page.getByRole('heading', { name: 'Standard Fields' });
  }
  get attributesHeading() {
    return this.page.getByRole('heading', { name: 'Attributes' });
  }
  get relatedIpPoolHeading() {
    return this.page.getByRole('heading', { name: 'Related IP Pool' });
  }
  get relatedPortalHeading() {
    return this.page.getByRole('heading', { name: 'Related Portal' });
  }

  // A field label within the Standard Fields section (e.g. "Subdomain", "Name").
  standardFieldLabel(label) {
    return this.page.getByText(label, { exact: true });
  }
}

module.exports = { DataCentreDetailPage };
