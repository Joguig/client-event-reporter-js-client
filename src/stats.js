/* globals console */

const RECORD_DELAY = 500; // ms
const MAX_PENDING_STATS = 20;

const INSTANCES_KEY = "__Twitch__statsInstances_1";

const ENVIRONMENT_CONFIGS = {
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
class StatsBackend {
  constructor(config) {
    if (!config) { throw new Error("config is required"); }

    this._addr = config.addr;
    this._resetCombinedStats();
    this._recordDelay = RECORD_DELAY;
    this._maxPendingStats = MAX_PENDING_STATS;
  }

  logCounter(key, count=1, sampleRate=1.0) {
    this._combinedStats.counters.push({
      key,
      count,
      sample_rate: sampleRate
    });

    this._record();
  }

  logTimer(key, milliseconds, sampleRate=1.0) {
    this._combinedStats.timers.push({
      key,
      milliseconds,
      sample_rate: sampleRate
    });

    this._record();
  }

  logLine(log_line) {
    this._combinedStats.log_lines.push({log_line});
    this._record();
  }

  logGauge(key) {
    this._combinedStats.gauges.push({key});
    this._record();
  }

  _resetCombinedStats() {
    this._combinedStats = {
      timers: [],
      counters: [],
      log_lines: [],
      gauges: [],
    };
  }

  _record() {
    if (this._numPendingStats() > this._maxPendingStats) {
      if (this._flushTimeout) {
        clearTimeout(this._flushTimeout);
        this._flushTimeout = null;
      }

      this._flush();
    } else if (!this._flushTimeout) {
      this._flushTimeout = setTimeout(() => {
        this._flushTimeout = null;
        this._flush();
      }, this._recordDelay);
    }
  }

  _flush() {
    let combinedStats = this._combinedStats;

    this._resetCombinedStats();

    let url = `${this._addr}/v1/stats`;
    let xhr = this._createCorsRequest('POST', url);

    if (!xhr) {
      console.log("WARNING: Cannot send stats because CORS is unsupported");
      return;
    }

    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(combinedStats));
  }

  _numPendingStats() {
    let pending = this._combinedStats;
    return pending.timers.length + pending.counters.length +
      pending.log_lines.length + pending.gauges.length;
  }

  _createCorsRequest(method, url) {
    let xhr = new XMLHttpRequest();

    if ("withCredentials" in xhr){
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest !== "undefined"){
        xhr = new XDomainRequest();
        xhr.open(method, url);
    } else {
        xhr = null;
    }

    return xhr;
  }
}


/**
 * Client used by consumers
 */
class PrefixedStats {
  constructor(backend, prefix) {
    if (!backend) { throw new Error("Missing backend"); }
    if (!prefix) { throw new Error("Missing prefix"); }

    this._backend = backend;
    this._prefix = prefix;
  }

  logCounter(key, count=1, sampleRate=1.0) {
    this._backend.logCounter(`${this._prefix}.${key}`, count, sampleRate);
  }

  logTimer(key, milliseconds, sampleRate=1.0) {
    this._backend.logTimer(`${this._prefix}.${key}`, milliseconds, sampleRate);
  }

  logLine(line) {
    this._backend.logLine(line);
  }

  logGauge(key) {
    this._backend.logGauge(key);
  }

  setPrefix(prefix) {
    if (!prefix) { throw new Error("Missing prefix"); }
    this._prefix = prefix;
  }
}

function getInstance(environment, prefix) {
  let config = ENVIRONMENT_CONFIGS[environment];
  if (!config) {
    throw new Error("Invalid environment - got " + environment);
  }

  if (!prefix) {
    throw new Error("Invalid prefix - got " + prefix);
  }

  window[INSTANCES_KEY] = window[INSTANCES_KEY] || {};
  let instances = window[INSTANCES_KEY];

  if (!instances[environment]) {
    instances[environment] = new StatsBackend(config);
  }

  let backend = instances[environment];
  return new PrefixedStats(backend, prefix);
}

export { StatsBackend, PrefixedStats };
export default { getInstance };
