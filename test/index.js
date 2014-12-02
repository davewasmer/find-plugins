path = require('path');
assert = require('assert');
findPlugins = require('../index');

describe('find-plugins', function(){

  it('should find plugins found in package.json', function(){
    plugins = findPlugins({
      modulesDir: path.join(__dirname, 'fixtures', 'app', 'node_modules'),
      pkg: path.join(__dirname, 'fixtures', 'app', 'package.json'),
      keyword: 'plugin'
    });
    assert(plugins.indexOf('foobar') > -1);
    assert(plugins.indexOf('extra-foobar') === -1);
    assert(plugins.indexOf('not-a-plugin') === -1);
  });

  it('should find plugins ignoring package.json', function(){
    plugins = findPlugins({
      modulesDir: path.join(__dirname, 'fixtures', 'app', 'node_modules'),
      pkg: path.join(__dirname, 'fixtures', 'app', 'package.json'),
      keyword: 'plugin',
      scanAllDirs: true
    });
    assert(plugins.indexOf('foobar') > -1);
    assert(plugins.indexOf('extra-foobar') > -1);
    assert(plugins.indexOf('not-a-plugin') === -1);
  });

  it('should find plugins using a custom filter', function(){
    plugins = findPlugins({
      modulesDir: path.join(__dirname, 'fixtures', 'app', 'node_modules'),
      pkg: path.join(__dirname, 'fixtures', 'app', 'package.json'),
      keyword: 'plugin',
      scanAllDirs: true,
      filter: function(pkg) { return pkg.name === 'not-a-plugin' }
    });
    assert(plugins.indexOf('foobar') === -1);
    assert(plugins.indexOf('extra-foobar') === -1);
    assert(plugins.indexOf('not-a-plugin') > -1);
  });

  it('should use the package name if no keyword is supplied', function(){
    plugins = findPlugins({
      modulesDir: path.join(__dirname, 'fixtures', 'app', 'node_modules'),
      pkg: path.join(__dirname, 'fixtures', 'app', 'package.json')
    });
    assert(plugins.indexOf('foobar') > -1);
  });

});