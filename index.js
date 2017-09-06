'use strict';
const fs = require('fs');
const path = require('path');
const resolvePkg = require('resolve-pkg');
const readPkg = require('read-pkg');
const readPkgUp = require('read-pkg-up');
const DAG = require('dag-map').default;
const debug = require('debug')('find-plugins');

module.exports = findPlugins;
findPlugins.default = findPlugins;


function findPlugins(options = {}) {
  options.dir = options.dir || process.cwd();
  debug('starting plugin search in %s', options.dir);

  try {
    options.pkg = readPkgUp.sync({ cwd: options.dir }).pkg;
  } catch(e) {
    console.error('Unable to read starting package.json');
    throw e;
  }

  let candidates;
  if (options.scanAllDirs) {
    candidates = findCandidatesInDir(options);
  } else {
    candidates = findCandidatesFromPkg(options);
  }

  candidates = addIncludes(candidates, options);

  let plugins = filterCandidates(candidates, options);

  if (options.sort) {
    return sortPlugins(plugins, options);
  }

  return plugins;
}

function addIncludes(candidates, options) {
  let includes = options.include || [];
  debug(`manually adding ${ includes.length } includes`);
  return candidates.concat(includes.map((includedDir) => {
    try {
      return {
        dir: includedDir,
        pkg: readPkg.sync(path.join(includedDir, 'package.json'))
      };
    } catch (e) {
      return false;
    }
  }));
}

function filterCandidates(candidates, options) {
  return candidates.filter((candidate) => {
    if (!candidate) {
      return false;
    }
    if (options.filter) {
      return options.filter(candidate);
    }
    if (!candidate.pkg.keywords) {
      return false;
    }
    return candidate.pkg.keywords.indexOf(options.keyword || options.pkg.name) > -1;
  });
}

function sortPlugins(unsortedPlugins, options) {
  debug(`sorting ${ unsortedPlugins.length } plugins`);
  let graph = new DAG();
  unsortedPlugins.forEach((plugin) => {
    let pluginConfig = plugin.pkg[options.configName || options.pkg.name] || {};
    graph.add(plugin.pkg.name, plugin, pluginConfig.before, pluginConfig.after);
  });
  let sortedPlugins = [];
  graph.topsort((key, value) => {
    if (value) {
      sortedPlugins.push(value);
    }
  });
  return sortedPlugins;
}

function findCandidatesInDir({ dir }) {
  return fs.readdirSync(dir)
    // Handle scoped packages
    .reduce((candidates, name) => {
      if (name.charAt(0) === '@') {
        fs.readdirSync(path.join(dir, name))
          .forEach((scopedPackageName) => {
            candidates.push(path.join(name, scopedPackageName));
          });
      } else {
        candidates.push(name);
      }
      return candidates;
    }, [])
    // Get the full directory path
    .map((name) => path.join(dir, name))
    // Ensure it actually is a directory
    .filter((dir) => fs.lstatSync(dir).isDirectory())
    // Load the package.json for each
    .map((dir) => {
      try {
        return { dir, pkg: readPkg.sync(path.join(dir, 'package.json')) };
      } catch (e) {
        return false;
      }
    });
}

function findCandidatesFromPkg(options) {
  let { pkg } = options;
  debug('searching package.json for plugins: %o', pkg);
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
  debug('checking these dependencies to see if they are plugins: %o', dependencies);
  return dependencies
    // Load package.json's from resolved package location
    .map((dep) => {
      let pkgDir = resolvePkg(dep, { cwd: options.dir });
      let foundPkg;
      try {
        foundPkg = readPkgUp.sync({ cwd: pkgDir });
      } catch (e) {
        debug('Unable to read package.json for %s, skipping', pkgDir);
        return false;
      }
      return { dir: path.dirname(foundPkg.path), pkg: foundPkg.pkg };
    });
}
