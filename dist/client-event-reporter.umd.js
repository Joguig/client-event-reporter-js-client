(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('client-event-reporter', ['exports'], factory) :
  factory((global.ClientEventReporter = {}))
}(this, function (exports) { 'use strict';

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  /* globals console */

  var RECORD_DELAY = 500; // ms
  var MAX_PENDING_STATS = 20;

  var INSTANCES_KEY = "__Twitch__statsInstances_1";

  var ENVIRONMENT_CONFIGS = {
    production: {
      addr: "https://client-event-reporter.twitch.tv"
    },
    darklaunch: {
      addr: "https://client-event-reporter-darklaunch.twitch.tv"
    }
  };

  ENVIRONMENT_CONFIGS.staging = ENVIRONMENT_CONFIGS.darklaunch;
  ENVIRONMENT_CONFIGS.development = ENVIRONMENT_CONFIGS.darklaunch;
  ENVIRONMENT_CONFIGS.test = ENVIRONMENT_CONFIGS.darklaunch;

  /**
   * Stats backend
   */

  var StatsBackend = (function () {
    function StatsBackend(config) {
      _classCallCheck(this, StatsBackend);

      if (!config) {
        throw new Error("config is required");
      }

      this._addr = config.addr;
      this._resetCombinedStats();
      this._recordDelay = RECORD_DELAY;
      this._maxPendingStats = MAX_PENDING_STATS;
    }

    /**
     * Client used by consumers
     */

    _createClass(StatsBackend, [{
      key: "logCounter",
      value: function logCounter(key) {
        var count = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
        var sampleRate = arguments.length <= 2 || arguments[2] === undefined ? 1.0 : arguments[2];

        this._combinedStats.counters.push({
          key: key,
          count: count,
          sample_rate: sampleRate
        });

        this._record();
      }
    }, {
      key: "logTimer",
      value: function logTimer(key, milliseconds) {
        var sampleRate = arguments.length <= 2 || arguments[2] === undefined ? 1.0 : arguments[2];

        this._combinedStats.timers.push({
          key: key,
          milliseconds: milliseconds,
          sample_rate: sampleRate
        });

        this._record();
      }
    }, {
      key: "logLine",
      value: function logLine(log_line) {
        this._combinedStats.log_lines.push({ log_line: log_line });
        this._record();
      }
    }, {
      key: "logGauge",
      value: function logGauge(key) {
        this._combinedStats.gauges.push({ key: key });
        this._record();
      }
    }, {
      key: "_resetCombinedStats",
      value: function _resetCombinedStats() {
        this._combinedStats = {
          timers: [],
          counters: [],
          log_lines: [],
          gauges: []
        };
      }
    }, {
      key: "_record",
      value: function _record() {
        var _this = this;

        if (this._numPendingStats() > this._maxPendingStats) {
          if (this._flushTimeout) {
            clearTimeout(this._flushTimeout);
            this._flushTimeout = null;
          }

          this._flush();
        } else if (!this._flushTimeout) {
          this._flushTimeout = setTimeout(function () {
            _this._flushTimeout = null;
            _this._flush();
          }, this._recordDelay);
        }
      }
    }, {
      key: "_flush",
      value: function _flush() {
        var combinedStats = this._combinedStats;

        this._resetCombinedStats();

        var url = this._addr + "/v1/stats";
        var xhr = this._createCorsRequest('POST', url);

        if (!xhr) {
          console.log("WARNING: Cannot send stats because CORS is unsupported");
          return;
        }

        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(combinedStats));
      }
    }, {
      key: "_numPendingStats",
      value: function _numPendingStats() {
        var pending = this._combinedStats;
        return pending.timers.length + pending.counters.length + pending.log_lines.length + pending.gauges.length;
      }
    }, {
      key: "_createCorsRequest",
      value: function _createCorsRequest(method, url) {
        var xhr = new XMLHttpRequest();

        if ("withCredentials" in xhr) {
          xhr.open(method, url, true);
        } else if (typeof XDomainRequest !== "undefined") {
          xhr = new XDomainRequest();
          xhr.open(method, url);
        } else {
          xhr = null;
        }

        return xhr;
      }
    }]);

    return StatsBackend;
  })();

  var PrefixedStats = (function () {
    function PrefixedStats(backend, prefix) {
      _classCallCheck(this, PrefixedStats);

      if (!backend) {
        throw new Error("Missing backend");
      }
      if (!prefix) {
        throw new Error("Missing prefix");
      }

      this._backend = backend;
      this._prefix = prefix;
    }

    _createClass(PrefixedStats, [{
      key: "logCounter",
      value: function logCounter(key) {
        var count = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
        var sampleRate = arguments.length <= 2 || arguments[2] === undefined ? 1.0 : arguments[2];

        this._backend.logCounter(this._prefix + "." + key, count, sampleRate);
      }
    }, {
      key: "logTimer",
      value: function logTimer(key, milliseconds) {
        var sampleRate = arguments.length <= 2 || arguments[2] === undefined ? 1.0 : arguments[2];

        this._backend.logTimer(this._prefix + "." + key, milliseconds, sampleRate);
      }
    }, {
      key: "logLine",
      value: function logLine(line) {
        this._backend.logLine(line);
      }
    }, {
      key: "logGauge",
      value: function logGauge(key) {
        this._backend.logGauge(key);
      }
    }, {
      key: "setPrefix",
      value: function setPrefix(prefix) {
        if (!prefix) {
          throw new Error("Missing prefix");
        }
        this._prefix = prefix;
      }
    }]);

    return PrefixedStats;
  })();

  function getInstance(environment, prefix) {
    var config = ENVIRONMENT_CONFIGS[environment];
    if (!config) {
      throw new Error("Invalid environment - got " + environment);
    }

    if (!prefix) {
      throw new Error("Invalid prefix - got " + prefix);
    }

    window[INSTANCES_KEY] = window[INSTANCES_KEY] || {};
    var instances = window[INSTANCES_KEY];

    if (!instances[environment]) {
      instances[environment] = new StatsBackend(config);
    }

    var backend = instances[environment];
    return new PrefixedStats(backend, prefix);
  }

  var Stats = { getInstance: getInstance };

  exports.Stats = Stats;

  // This file is only included in the UMD js
  var index = { Stats: Stats };

  exports['default'] = index;

}));//# sourceMappingURL=client-event-reporter.umd.map