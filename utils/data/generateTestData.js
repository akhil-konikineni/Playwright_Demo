function uniqueTitle(prefix = 'qa') {
  const suffix = Date.now().toString(36).slice(-6);
  return `${prefix}${suffix}`.slice(0, 8);
}

function uniqueName(prefix = 'QAAutoDC') {
  return `${prefix}_${Date.now().toString(36)}`;
}

module.exports = { uniqueTitle, uniqueName };
