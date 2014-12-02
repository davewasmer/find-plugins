[![Build Status](https://travis-ci.org/davewasmer/find-plugins.svg?branch=master)](https://travis-ci.org/davewasmer/find-plugins)

# find-plugins

A simple tool to find installed npm packages that meet certain criteria. Great for finding installed plugins or complementary packages to yours.

## Usage

#### Simple

```js
// Looks up the package.json in process.cwd, and returns any dependencies
// listed that have your package `name` in their keywords.
plugins = findPlugins();
```

#### Custom Keyword

```js
// Same as above, but rather than using your package.json name as the keyword
// to search for, it will look for dependencies with "plugin" in their keyword
// list.
plugins = findPlugins({
    keyword: 'plugin'
});
```

#### Custom Filter

```js
// This time, the supplied filter function will be called for each dependency,
// and only those that return true will be returned in the final array. 
// 
// The filter function is supplied the package.json of the dependency to check.
// In this case, this will find all dependencies whose name starts with 
// "my-plugin-"
plugins = findPlugins({
    filter: function(pkg) {
        return /^my-plugin-/.test(pkg.name);
    }
});
```

#### Ignore package.json dependency list

```js
// The scanAllDirs option allows you to skip loading your app's package.json 
// dependency list. Instead, it will scan all directories in the node_modules
// folder, regardless of whether they are listed as dependencies or not.
plugins = findPlugins({
    scanAllDirs: true
});
```

#### Specify node_modules directory and your package.json

```js
// Got an unusual setup? Just pass in the path of the directory containing your
// dependencies, and the path to your app's package.json file. `pkg` is
// optional if you are using `scanAllDirs` and `keyword` or `filter`.
plugins = findPlugins({
    modulesDir: path.join('..', 'foo', 'bar', 'node_modules'),
    pkg: path.join('..', 'foo', 'bar', 'package.json')
});
```