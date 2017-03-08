var fs = require('fs');
var path = require('path');
var assert = require('assert');
var findPlugins = require('../index');

function didFindPlugin(plugins, pluginName) {
  return assert(plugins.find(function(plugin) { return plugin.pkg.name === pluginName }), 'missing plugin ' + pluginName);
}
function didNotFindPlugin(plugins, pluginName) {
  return assert(!plugins.find(function(plugin) { return plugin.pkg.name === pluginName }), 'extraneous plugin ' + pluginName);
}

var fixtures = path.join(__dirname, 'fixtures', 'app');
var nodeModules = path.join(__dirname, 'fixtures', 'app', 'node_modules');
var external = path.join(fixtures, 'external');
var externalInvalid = path.join(fixtures, 'external-invalid');
var externalSym = path.join(nodeModules, 'external');
var externalInvalidSym = path.join(nodeModules, 'external-invalid');


describe('find-plugins', function(){
  before(function () {
    try {
      fs.mkdirSync(external);
      fs.symlinkSync(external, externalSym);
      fs.mkdirSync(externalInvalid);
      fs.symlinkSync(externalInvalid, externalInvalidSym);
      fs.rmdirSync(externalInvalid);
    } catch(e) {
      console.log('symlink fixture creation failed');
    }
  });

  after(function () {
    try {
      fs.rmdirSync(external);
      fs.rmdirSync(externalSym);
      fs.rmdirSync(externalInvalidSym);
    } catch(e) {
      console.log('symlink fixture cleanup failed');
    }
  });

  it('should find plugins found in package.json', function(){
    plugins = findPlugins({ dir: fixtures,
      keyword: 'plugin' });
    didFindPlugin(plugins, 'foobar');
    didNotFindPlugin(plugins, 'extra-foobar');
    didNotFindPlugin(plugins, 'not-a-plugin');
  });

  it('should find plugins ignoring package.json', function(){
    plugins = findPlugins({ dir: nodeModules,
      keyword: 'plugin',
      scanAllDirs: true
    });
    didFindPlugin(plugins, 'foobar');
    didFindPlugin(plugins, 'extra-foobar');
    didNotFindPlugin(plugins, 'not-a-plugin');
  });

  it('should find plugins using a custom filter', function(){
    plugins = findPlugins({ dir: nodeModules,
      scanAllDirs: true,
      filter: function(plugin) { return plugin.pkg.name === 'not-a-plugin' }
    });
    didNotFindPlugin(plugins, 'foobar');
    didNotFindPlugin(plugins, 'extra-foobar');
    didFindPlugin(plugins, 'not-a-plugin');
  });

  it('should use the package name if no keyword is supplied', function(){
    plugins = findPlugins({ dir: fixtures });
    didFindPlugin(plugins, 'foobar');
  });

  it('should include any directories manually specified by "include"', function(){
    plugins = findPlugins({ dir: fixtures,
      keyword: 'plugin',
      include: [ path.join(__dirname, 'fixtures', 'app', 'non-npm-plugin') ]
    });
    didFindPlugin(plugins, 'foobar');
    didNotFindPlugin(plugins, 'extra-foobar');
    didNotFindPlugin(plugins, 'not-a-plugin');
    didFindPlugin(plugins, 'non-npm-plugin');
  });

  it('should sort plugins via a DAG of dependencies when "sort" is true', function() {
    plugins = findPlugins({ dir: nodeModules,
      scanAllDirs: true,
      filter: function(plugin) { return true; },
      sort: true,
      configName: 'plugin-config'
    });
    pluginNames = plugins.map(function(plugin) { return plugin.pkg.name });
    assert.deepEqual(pluginNames, [ 'foobar', 'extra-foobar', 'not-a-plugin' ], 'plugins are incorrectly sorted');
  });

  it('should not add empty plugin objects during sort', function() {
    plugins = findPlugins({
      dir: fixtures,
      scanAllDirs: true,
      filter: function(plugin) { return true; },
      sort: true,
      configName: 'plugin-config'
    });

    assert.equal(plugins.filter(function (plugin) { return !plugin; }).length, 0, 'found an empty plugin object');
  });
});
