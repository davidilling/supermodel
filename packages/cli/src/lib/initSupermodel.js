const fs = require('fs');
const path = require('path');
const fsUtils = require('./fsUtils');
const supermodelConfig = require('./supermodelConfig');

/**
 * Crates and initializes the supermodel directory
 *
 * @param {Object} [config] Optional config to be stored in .super file
 * @returns {string} Path to the newly created supermodel root directory
 * @throws {Error} In the case of failure an error is thrown
 */
function initSupermodel(config = null) {
  // Supermodel directory
  const supermodelDir = path.join(
    process.cwd(),
    supermodelConfig.SUPERMODEL_DIR_NAME,
  );
  fsUtils.mkdirpSync(supermodelDir);

  // Supermodel directory config file
  const supermodelConfigFile = path.join(
    process.cwd(),
    supermodelConfig.SUPERMODEL_DIR_NAME,
    supermodelConfig.SUPERMODEL_CONFIG_FILENAME,
  );

  const configFileDescriptor = fs.openSync(supermodelConfigFile, 'w');

  if (config !== null) {
    const serializedConfig = JSON.stringify(config, null, 2);
    fs.writeSync(configFileDescriptor, serializedConfig);
  }

  fs.closeSync(configFileDescriptor);

  return supermodelDir;
}

module.exports = initSupermodel;
