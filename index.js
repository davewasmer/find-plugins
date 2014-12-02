var fs = require('fs');
var path = require('path');

module.exports = function(options) {
  options = options || {};
  var modulesDir = options.modulesDir || path.join(process.cwd(), 'node_modules');
  var pkgPath = options.pkg || 'package.json';
  var keyword = options.keyword;

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
    .filter(function(name) { return name !== '.bin'; })
    .map(function(name)    { return path.join(modulesDir, name); })
    .filter(function(dir)  { return fs.statSync(dir).isDirectory() })
    .map(function(dir)     { return require(path.join(dir, 'package.json')); })
    .filter(isPlugin)
    .map(function(pkg)     { return pkg.name });
  } else {
    var pkg = require(pkgPath);
    var dependencies = Object.keys(pkg.dependencies || {});
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

    return dependencies.map(function(dir) { return require(path.join(modulesDir, dir, 'package.json')); })
    .filter(isPlugin)
    .map(function(pkg) { return pkg.name });
  }
}