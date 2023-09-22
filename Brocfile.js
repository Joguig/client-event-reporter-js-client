var concat = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var esTranspiler = require('broccoli-babel-transpiler');
var Funnel = require('broccoli-funnel');
var ES6Modules = require('broccoli-es6modules');

var pkg = require('./package.json');

var tree = new Funnel('src', {
  exclude: ['**/*_test.js']
});

/**
 * AMD
 */

var transpiled = esTranspiler(tree, {
  nonStandard: false,
  blacklist: ['useStrict', 'es6.modules'],
  highlightCode: false
});

// Converts ES6 to ES5 javascript into AMD modules
var amdJs = new ES6Modules(transpiled, {
  format: 'amd',

  esperantoOptions: {
    strict: true,
    amdName: pkg.name,
  },
  bundleOptions: {
    entry: 'index.js',
  }
});

// Specifies the AMD file
var amdJsConcat = concat(amdJs, {
  inputFiles: ['**/*.js'],
  outputFile: pkg.name + '.amd.js',
});

/**
 * UMD
 */

// Converts ES6 to ES5 javascript into UMD modules
var umdJs = new ES6Modules(transpiled, {
  format: 'umd',
  esperantoOptions: {
    strict: true,
    amdName: pkg.name,
  },
  bundleOptions: {
    name: 'ClientEventReporter',
    entry: 'index.js'
  }
});

// Specifies the UMD file
var umdJsConcat= concat(umdJs, {
  inputFiles: ['**/*.js'],
  outputFile: pkg.name + '.umd.js',
});

// Generate both the AMD and UMD files
module.exports = mergeTrees([
  amdJsConcat,
  umdJsConcat
]);
