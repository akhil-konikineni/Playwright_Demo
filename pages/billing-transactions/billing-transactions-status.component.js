const { expect } = require('@playwright/test');

// Confirm-button label on the "Confirm Status Change" dialog, keyed by TARGET status.
// Live-verified 2026-10-05: the confirm button is an ACTION VERB, not a generic "Confirm".
const CONFIRM_VERB = Object.freeze({
  Setup: 'Set Up',
  Requested: 'Request',
  Active: 'Active',
  Exported: 'Exported',
  Deleted: 'Delete',
});

// Shared status-change control used by BOTH entry points:
//   • List page  → round ⋮ menu trigger in the row's Actions cell
//   • Detail page → "Change Status ▾" button
// Both open the same radix menu of permitted target states and the same confirm dialog.
// The trigger renders only when the user has ≥1 valid transition for that record's state.
class BillingTransactionStatusControl {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  // The "Confirm Status Change" dialog (role=dialog; disambiguated from the Filters
  // drawer by its title text).
  get dialog() {
    return this.page.getByRole('dialog').filter({ hasText: 'Confirm Status Change' });
  }
  get menu() {
    return this.page.getByRole('menu');
  }
  menuItem(target) {
    return this.page.getByRole('menuitem', { name: target, exact: true });
  }
  confirmButton(target) {
    return this.dialog.getByRole('button', { name: CONFIRM_VERB[target], exact: true });
  }

  // Sonner success banner shown after a committed status change. Live-verified text:
  //   Status changed to "<status>"   (target status, lowercase, quoted)
  successBanner(target) {
    return this.page.getByText(`Status changed to "${target.toLowerCase()}"`).first();
  }

  // List-page trigger inside a row's Actions cell (column index 9). May be absent when
  // the record has no available transition for the current permission tier.
  listTrigger(row) {
    return row.getByRole('cell').nth(9).locator('button[aria-haspopup="menu"]');
  }
  // Detail-page trigger.
  get detailTrigger() {
    return this.page.getByRole('button', { name: 'Change Status' });
  }

  // Open the menu from a trigger and return the offered target option labels.
  async optionsFrom(trigger) {
    await trigger.click();
    await this.menu.waitFor({ state: 'visible' });
    const items = (await this.page.getByRole('menuitem').allInnerTexts()).map((s) => s.trim()).filter(Boolean);
    return items;
  }

  // Full transition: trigger → select target → confirm → dialog closes.
  async transition(trigger, target) {
    await trigger.click();
    await this.menu.waitFor({ state: 'visible' });
    // Fail fast (not a 180s hang) if the target option isn't offered for this
    // record-state + permission (e.g. the detail-page capability-option defect).
    await this.menuItem(target).waitFor({ state: 'visible', timeout: 15000 });
    await this.menuItem(target).click();
    await expect(this.dialog).toBeVisible();
    await expect(this.dialog).toContainText(`change the status to "${target.toLowerCase()}"`);
    await this.confirmButton(target).click();
    // Success banner + dialog close are the committed-change signals (banner auto-dismisses,
    // so assert it immediately after confirming).
    await expect(this.successBanner(target)).toBeVisible();
    await expect(this.dialog).toBeHidden();
  }

  // Open the dialog for `target` then Cancel it (verifies "dismiss = no change").
  async dismiss(trigger, target) {
    await trigger.click();
    await this.menu.waitFor({ state: 'visible' });
    await this.menuItem(target).click();
    await expect(this.dialog).toBeVisible();
    await this.dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(this.dialog).toBeHidden();
  }
}

module.exports = { BillingTransactionStatusControl, CONFIRM_VERB };
