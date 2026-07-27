const { expect } = require('@playwright/test');

async function assertListApiOk(response) {
  expect(response.status()).toBe(200);
}

async function assertPostCreated(response) {
  expect(response.status()).toBe(201);
}

async function assertStatusCell(cell, expectedStatus) {
  await expect(cell).toContainText(expectedStatus);
}

async function assertDialogVisible(dialog) {
  await expect(dialog).toBeVisible();
}

async function assertDialogHidden(dialog) {
  await expect(dialog).not.toBeVisible();
}

async function assertConfirmDialog(dialog, fromStatus, toStatus) {
  await expect(dialog.getByRole('heading', { name: 'Confirm Status Change' })).toBeVisible();
  await expect(dialog).toContainText(`"${fromStatus}"`);
  await expect(dialog).toContainText(`"${toStatus}"`);
}

module.exports = {
  assertListApiOk,
  assertPostCreated,
  assertStatusCell,
  assertDialogVisible,
  assertDialogHidden,
  assertConfirmDialog,
};
