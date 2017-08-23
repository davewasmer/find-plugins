'use strict';
const fs = require('fs');
const path = require('path');
const resolve = require('resolve');
const readPkg = require('read-pkg');
const readPkgUp = require('read-pkg-up');
const DAG = require('dag-map').default;
const debug = require('debug')('find-plugins');

function findPlugins(options) {
  options = options || {};
  // The directory to scan for plugins
  let dir = options.dir || process.cwd();
  debug('starting plugin search from %s', dir);
  // The path to the package.json that lists dependencies to check for plugins
  let pkgPath = options.pkg || (options.dir && path.join(options.dir, 'package.json')) || 'package.json';
  let pkg;
  try {
    pkg = readPkg.sync(pkgPath);
  } catch(e) {}
  // An array of additional paths to check as plugins
  let includes = options.include || [];
  // If supplied, a package will be considered a plugin if `keyword` is present in it's
  // package.json "keywords" array
  let keyword = options.keyword;

  if (!pkg && !options.configName && options.sort) {
    throw new Error('You passed sort: true to findPlugins, but did not provide a valid package.json path or configName');
  }

  let pluginCandidateDirectories = options.scanAllDirs ? findCandidatesInDir(dir) : findCandidatesFromPkg(pkg, options.resolvePackageFilter);

  // Include an manually specified packages in the list of plugin candidates
  pluginCandidateDirectories = pluginCandidateDirectories.concat(includes.map((includedDir) => {
    try {
      return {
        dir: includedDir,
        pkg: readPkg.sync(path.join(includedDir, 'package.json'))
      };
    } catch (e) {
      debug('unable to read package.json for %s, skipping', includedDir);
      return false;
    }
  }));

  let plugins = pluginCandidateDirectories.filter(Boolean).filter(isPlugin);

  if (options.sort) {
    let graph = new DAG();
    plugins.forEach((plugin) => {
      let pluginConfig = plugin.pkg[options.configName || pkg.name] || {};
      graph.add(plugin.pkg.name, plugin, pluginConfig.before, pluginConfig.after);
    });
    plugins = [];
    graph.topsort((key, value) => {
      if (value) {
        plugins.push(value);
      }
    });
  }

  return plugins;

  function findCandidatesInDir(dir) {
    debug('searching for plugins in %s', dir);
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
      // Ensure it actually is a directory; also ensures any symlinks in the path are still valid (statSync throws if not)
      .filter((dir) => {
        try {
          return fs.statSync(dir).isDirectory();
        } catch(e) {
          return false;
        }
      })
      // Load the package.json for each
      .map((dir) => {
        try {
          return { dir, pkg: readPkg.sync(path.join(dir, 'package.json')) };
        } catch (e) {
          debug('unable to read package.json from %s candidate directory, skipping', dir);
          return false;
        }
      })
  }

  function findCandidatesFromPkg(pkg, resolvePackageFilter) {
    debug('searching for plugins from package.json: %o', pkg);
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
    return dependencies
      // Load package.json's from resolved package location
      .map((dep) => {
        let pkgMainPath
        try {
          pkgMainPath = resolve.sync(dep, { basedir: dir, packageFilter: resolvePackageFilter });
        } catch (e) {
          debug('unable to resolve %s dependency, skipping (%s)', dep, e);
          return false;
        }
        try {
          let foundPkg = readPkgUp.sync({ cwd: path.dirname(pkgMainPath) });
          return { dir: path.dirname(foundPkg.path), pkg: foundPkg.pkg };
        } catch (e) {
          debug('unable to read package.json of %s dependency, skipping (%s)', dep, e);
          return false;
        }
      })
  }

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
      keyword = pkg.name;
    }
    return plugin.pkg.keywords.indexOf(keyword) > -1;
  }

}

findPlugins.default = findPlugins;

module.exports = findPlugins;
