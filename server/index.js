const path = require('path');
const { createSpaHost } = require('./createSpaHost');

const siteRoot = path.resolve(__dirname, '..');
const masqipApp = createSpaHost({ rootDir: siteRoot });

module.exports = masqipApp;
module.exports.createSpaHost = createSpaHost;
module.exports.siteRoot = siteRoot;

