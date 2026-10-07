const { expect } = require('@playwright/test');
const { BasePage } = require('../base/base.page');
const { Routes } = require('../../constants/routes');

const STATUS_RE = /^(Setup|Requested|Active|Exported|Deleted)$/;

// Detail page POM for Finance -> Billing Transactions -> <id>.
// The status-change control itself lives in BillingTransactionStatusControl
// (shared with the list page); this POM owns navigation + the header status badge.
class BillingTransactionsDetailPage extends BasePage {
  constructor(page) {
    super(page);
    this.changeStatusButton = page.getByRole('button', { name: 'Change Status' });
  }

  async open(id) {
    await this.goto(Routes.billingTransactionDetail(id));
    await expect(this.page).toHaveURL(new RegExp(`/finance/billing-transactions/${id}$`));
  }

  // The header status badge text (best-effort; DB is the authoritative oracle).
  statusBadge() {
    return this.page.getByText(STATUS_RE).first();
  }
  async currentStatus() {
    return ((await this.statusBadge().textContent()) || '').trim();
  }
}

module.exports = { BillingTransactionsDetailPage };
