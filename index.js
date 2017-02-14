'use strict';
const fs = require('fs');
const path = require('path');

module.exports = function(options) {
  options = options || {};
  let modulesDir = options.modulesDir || path.join(process.cwd(), 'node_modules');
  let pkgPath = options.pkg || 'package.json';
  let keyword = options.keyword;

  function isPlugin(pkg) {
    if (options.filter) {
      return options.filter(pkg);
    }
    if (!pkg.keywords) {
      return;
    }
    if (!keyword) {
      keyword = require(pkgPath).name;
    }
    return pkg.keywords.indexOf(keyword) > -1;
  }

  // scanAllDirs indicates that we should ignore the package.json contents and
  // simply look at the contents of the node_modules directory
  if (options.scanAllDirs) {
    return fs.readdirSync(modulesDir)
      .filter((name) => name !== '.bin')
      .map((name) => path.join(modulesDir, name))
      .filter((dir) => fs.statSync(dir).isDirectory())
      .map((dir) => require(path.join(dir, 'package.json')))
      .filter(isPlugin)
      .map((pkg) => pkg.name);
  }

  let pkg = require(pkgPath);
  let dependencies = Object.keys(pkg.dependencies || {});
  if (!options.ignoreDevDependencies) {
    dependencies = dependencies.concat(Object.keys(pkg.devDependencies || {}));
  }
  if (!options.ignorePeerDependencies) {
    dependencies = dependencies.concat(Object.keys(pkg.peerDependencies || {}));
  }
  if (!options.ignoreBundleDependencies) {
    dependencies = dependencies.concat(Object.keys(pkg.bundleDependencies || pkg.bundledDependencies || {}));
  }
  if (!options.ignoreOptionalDependencies) {
    dependencies = dependencies.concat(Object.keys(pkg.optionalDependencies || {}));
  }

  return dependencies.map((dir) => require(path.join(modulesDir, dir, 'package.json')))
    .filter(isPlugin)
    .map((_pkg) => _pkg.name);
};
