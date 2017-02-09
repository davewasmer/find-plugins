var path = require('path');
var assert = require('assert');
var findPlugins = require('../index');

function didFindPlugin(plugins, pluginName) {
  return assert(plugins.find(function(plugin) { return plugin.pkg.name === pluginName }), 'missing plugin ' + pluginName);
}
function didNotFindPlugin(plugins, pluginName) {
  return assert(!plugins.find(function(plugin) { return plugin.pkg.name === pluginName }), 'extraneous pluginj ' + pluginName);
}

var fixtureModules = path.join(__dirname, 'fixtures', 'app', 'node_modules');
var fixturePackage = path.join(__dirname, 'fixtures', 'app', 'package.json');

describe('find-plugins', function(){

  it('should find plugins found in package.json', function(){
    plugins = findPlugins({ modulesDir: fixtureModules, pkg: fixturePackage,
      keyword: 'plugin'
    });
    didFindPlugin(plugins, 'foobar');
    didNotFindPlugin(plugins, 'extra-foobar');
    didNotFindPlugin(plugins, 'not-a-plugin');
  });

  it('should find plugins ignoring package.json', function(){
    plugins = findPlugins({ modulesDir: fixtureModules, pkg: fixturePackage,
      keyword: 'plugin',
      scanAllDirs: true
    });
    didFindPlugin(plugins, 'foobar');
    didFindPlugin(plugins, 'extra-foobar');
    didNotFindPlugin(plugins, 'not-a-plugin');
  });

  it('should find plugins using a custom filter', function(){
    plugins = findPlugins({ modulesDir: fixtureModules, pkg: fixturePackage,
      scanAllDirs: true,
      filter: function(plugin) { return plugin.pkg.name === 'not-a-plugin' }
    });
    didNotFindPlugin(plugins, 'foobar');
    didNotFindPlugin(plugins, 'extra-foobar');
    didFindPlugin(plugins, 'not-a-plugin');
  });

  it('should use the package name if no keyword is supplied', function(){
    plugins = findPlugins({ modulesDir: fixtureModules, pkg: fixturePackage });
    didFindPlugin(plugins, 'foobar');
  });

  it('should include any directories manually specified by "include"', function(){
    plugins = findPlugins({ modulesDir: fixtureModules, pkg: fixturePackage,
      keyword: 'plugin',
      include: [ path.join(__dirname, 'fixtures', 'app', 'non-npm-plugin') ]
    });
    didFindPlugin(plugins, 'foobar');
    didNotFindPlugin(plugins, 'extra-foobar');
    didNotFindPlugin(plugins, 'not-a-plugin');
    didFindPlugin(plugins, 'non-npm-plugin');
  });

  it('should sort plugins via a DAG of dependencies when "sort" is true', function() {
    plugins = findPlugins({ modulesDir: fixtureModules, pkg: fixturePackage,
      scanAllDirs: true,
      filter: function(plugin) { return true; },
      sort: true,
      configName: "plugin-config"
    });
    pluginNames = plugins.map(function(plugin) { return plugin.pkg.name });
    assert.deepEqual(pluginNames, [ 'foobar', 'extra-foobar', 'not-a-plugin' ], 'plugins are incorrectly sorted');
  });

});