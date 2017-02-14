'use strict';
const fs = require('fs');
const path = require('path');
const tryRequire = require('try-require');
const DAG = require('dag-map').default;

function findPlugins(options) {
  options = options || {};
  // The node_modules directory to scan for plugins
  let modulesDir = options.modulesDir || 'node_modules';
  // The path to the package.json that lists dependencies to check for plugins
  let pkgPath = options.pkg || './package.json';
  let pkg = tryRequire(pkgPath);
  // An array of additional paths to check as plugins
  let includes = options.include || [];
  // If supplied, a package will be considered a plugin if `keyword` is present in it's
  // package.json "keywords" array
  let keyword = options.keyword;
  // If sort: true is supplied, this determines what property of the plugin's package.json to
  // check for the sort configuration (it should be an object with "before" and "after" properties
  // which are arrays of other plugins names)
  let configName = options.configName || pkg.name;

  let pluginCandidateDirectories = [];

  // The filter function that determines whether a package is a plugin. If options.filter
  // is supplied, go with that. Otherwise, check for options.keyword match.
  function isPlugin(plugin) {
    if (options.filter) {
      return options.filter(plugin);
    }
    if (!plugin.pkg.keywords) {
      return false;
    }
    if (!keyword) {
      keyword = require(pkgPath).name;
    }
    return plugin.pkg.keywords.indexOf(keyword) > -1;
  }

  // scanAllDirs indicates that we should ignore the package.json contents and
  // simply look at the contents of the node_modules directory
  if (options.scanAllDirs) {
    pluginCandidateDirectories = fs.readdirSync(modulesDir);
    // Handle scoped packages
    let scoped = pluginCandidateDirectories.filter((name) => name.charAt(0) === '@')
    pluginCandidateDirectories = pluginCandidateDirectories.filter((name) => name.charAt(0) !== '@');
    scoped.forEach((scope) => {
      fs.readdirSync(path.join(modulesDir, scope))
        .forEach((scopedPackageName) => {
          pluginCandidateDirectories.push(path.join(scope, scopedPackageName));
        });
    });
    // Normalize the paths
    pluginCandidateDirectories = pluginCandidateDirectories
      .filter((name) => name !== '.bin')
      .map((name) => path.join(modulesDir, name))
      .filter((dir) => fs.statSync(dir).isDirectory());
  // Otherwise, use the consuming package.json dependencies as the list of plugin candidates
  } else {
    let dependencies = [];
    if (!options.excludeDependencies) {
      dependencies = dependencies.concat(Object.keys(pkg.dependencies || {}));
    }
    if (options.includeDev) {
      dependencies = dependencies.concat(Object.keys(pkg.devDependencies || {}));
    }
    if (options.includePeer) {
      dependencies = dependencies.concat(Object.keys(pkg.peerDependencies || {}));
    }
    if (options.includeBundle) {
      dependencies = dependencies.concat(Object.keys(pkg.bundleDependencies || pkg.bundledDependencies || {}));
    }
    if (options.includeOptional) {
      dependencies = dependencies.concat(Object.keys(pkg.optionalDependencies || {}));
    }
    pluginCandidateDirectories = dependencies.map((dir) => path.join(modulesDir, dir));
  }

  // Include an manually specified packages in the list of plugin candidates
  pluginCandidateDirectories = pluginCandidateDirectories.concat(includes);

  let plugins = pluginCandidateDirectories.map((dir) => {
    return {
      dir: dir,
      pkg: require(path.join(dir, 'package.json'))
    };
  }).filter(isPlugin);

  if (options.sort) {
    let graph = new DAG();
    plugins.forEach((plugin) => {
      let pluginConfig = plugin.pkg[options.configName];
      graph.add(plugin.pkg.name, plugin, pluginConfig.before, pluginConfig.after);
    });
    plugins = [];
    graph.topsort((key, value) => {
      plugins.push(value);
    });
  }

  return plugins;
}

findPlugins.default = findPlugins;

module.exports = findPlugins;
