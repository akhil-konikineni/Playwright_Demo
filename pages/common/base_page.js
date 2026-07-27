class BasePage {
  constructor(page) {
    this.page = page;
  }

  async getApiToken() {
    const storageState = await this.page.context().storageState();
    const portalOrigin = storageState.origins?.find(o =>
      o.origin.includes('portal.qan.aws.eseye.io')
    );
    return portalOrigin?.localStorage.find(e => e.name === 'accessToken')?.value ?? '';
  }
}

module.exports = { BasePage };
