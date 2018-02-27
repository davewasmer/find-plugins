var fs = require('fs');
var path = require('path');
var assert = require('assert');
var findPlugins = require('../index');

function didFindPlugin(plugins, pluginName) {
  return assert(plugins.find(function(plugin) { return plugin.pkg.name === pluginName; }), 'missing plugin ' + pluginName);
}
function didNotFindPlugin(plugins, pluginName) {
  return assert(!plugins.find(function(plugin) { return plugin.pkg.name === pluginName; }), 'extraneous plugin ' + pluginName);
}

var fixtures = path.join(__dirname, 'fixtures');
var fixtureApp = path.join(fixtures, 'app');
var nodeModules = path.join(fixtureApp, 'node_modules');
var symlinkedPluginSource = path.join(fixtures, 'symlinked-plugin-source');
var symlinkToPlugin = path.join(nodeModules, 'symlinked-plugin-source');


describe('find-plugins', function(){
  before(function () {
    try {
      // Create a symlinked plugin
      fs.symlinkSync(symlinkedPluginSource, symlinkToPlugin);
    } catch(e) {
      console.log('symlink fixture creation failed');
      console.log(e.stack);
    }
  });

  after(function () {
    try {
      fs.unlinkSync(symlinkToPlugin);
    } catch(e) {
      console.log('symlink fixture cleanup failed');
      console.log(e.stack);
    }
  });

  it('should find plugins found in package.json', function(){
    var plugins = findPlugins({ dir: fixtureApp,
      keyword: 'plugin' });
    assert.equal(plugins.length, 2);
    didFindPlugin(plugins, 'foobar');
    didFindPlugin(plugins, 'symlinked-plugin-source');
    didNotFindPlugin(plugins, 'extra-foobar');
    didNotFindPlugin(plugins, 'not-a-plugin');
  });

  it('should find plugins ignoring package.json', function(){
    var plugins = findPlugins({ dir: nodeModules,
      keyword: 'plugin',
      scanAllDirs: true
    });
    assert.equal(plugins.length, 3);
    didFindPlugin(plugins, 'foobar');
    didFindPlugin(plugins, 'extra-foobar');
    didFindPlugin(plugins, 'symlinked-plugin-source');
    didNotFindPlugin(plugins, 'not-a-plugin');
  });

  it('should find plugins using a custom filter', function(){
    var plugins = findPlugins({ dir: nodeModules,
      scanAllDirs: true,
      filter: function(plugin) { return plugin.pkg.name === 'not-a-plugin'; }
    });
    assert.equal(plugins.length, 1);
    didNotFindPlugin(plugins, 'foobar');
    didNotFindPlugin(plugins, 'extra-foobar');
    didFindPlugin(plugins, 'not-a-plugin');
  });

  it('should use the package name if no keyword is supplied', function(){
    var plugins = findPlugins({ dir: fixtureApp });
    assert.equal(plugins.length, 2);
    didFindPlugin(plugins, 'foobar');
    didFindPlugin(plugins, 'symlinked-plugin-source');
  });

  it('should include any directories manually specified by "include"', function(){
    var plugins = findPlugins({ dir: fixtureApp,
      keyword: 'plugin',
      include: [ path.join(__dirname, 'fixtures', 'app', 'non-npm-plugin') ]
    });
    assert.equal(plugins.length, 3);
    didFindPlugin(plugins, 'foobar');
    didFindPlugin(plugins, 'symlinked-plugin-source');
    didFindPlugin(plugins, 'non-npm-plugin');
    didNotFindPlugin(plugins, 'extra-foobar');
    didNotFindPlugin(plugins, 'not-a-plugin');
  });

  it('should sort plugins via a DAG of dependencies when "sort" is true', function() {
    var plugins = findPlugins({ dir: nodeModules,
      scanAllDirs: true,
      filter: function() { return true; },
      sort: true,
      configName: 'plugin-config'
    });
    var pluginNames = plugins.map(function(plugin) { return plugin.pkg.name; });
    assert.deepEqual(pluginNames, [ 'foobar', 'extra-foobar', 'not-a-plugin', 'symlinked-plugin-source'  ], 'plugins are incorrectly sorted');
  });

  it('should not add empty plugin objects during sort', function() {
    var plugins = findPlugins({ dir: nodeModules,
      scanAllDirs: true,
      filter: function() { return true; },
      sort: true,
      configName: 'plugin-config'
    });

    assert.equal(plugins.length, 4);
    assert.equal(plugins.filter(function (plugin) { return !plugin; }).length, 0, 'found an empty plugin object');
  });

  it('should find plugins that are symlinked', function() {
    var plugins = findPlugins({ dir: nodeModules,
      scanAllDirs: true,
      filter: function() { return true; },
      sort: true,
      configName: 'plugin-config'
    });

    didFindPlugin(plugins, 'symlinked-plugin-source');
  });

  it('when using the package.json as a manifest, should return a symlinked plugins symlink path, not its target, as the plugin directory', function() {
    var plugins = findPlugins({ dir: nodeModules,
      filter: function(plugin) { return plugin.pkg.name === 'symlinked-plugin-source'; },
      configName: 'plugin-config'
    });

    assert.equal(plugins[0].dir, path.join(nodeModules, plugins[0].pkg.name));
  });

  it('when scanAllDirs: true, should return a symlinked plugins symlink path, not its target, as the plugin directory', function() {
    var plugins = findPlugins({ dir: nodeModules,
      scanAllDirs: true,
      filter: function(plugin) { return plugin.pkg.name === 'symlinked-plugin-source'; },
      configName: 'plugin-config'
    });

    assert.equal(plugins[0].dir, path.join(nodeModules, plugins[0].pkg.name));
  });
});
