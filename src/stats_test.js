/* globals describe, it, chai, sinon, console, beforeEach, afterEach */

import Stats from "./stats";
import { PrefixedStats, StatsBackend } from "./stats";

import sinon from "sinon";
let assert = chai.assert;

describe('.getInstance', function() {
  it("errors with an invalid environment", function() {
    assert.throws(function() {
      Stats.getInstance("kappa", "prefix");
    });
  });

  it("errors without a prefix", function() {
    assert.throws(function() {
      Stats.getInstance("kappa", "");
    });
  });

  it("returns an instance for production", function() {
    let stats = Stats.getInstance("production", "prefix");
    assert.isOk(stats);
  });

  it("returns an instance for darklaunch", function() {
    let stats = Stats.getInstance("darklaunch", "prefix");
    assert.isOk(stats);
  });

  it("returns an instance for staging", function() {
    let stats = Stats.getInstance("staging", "prefix");
    assert.isOk(stats);
  });

  it("returns an instance for development", function() {
    let stats = Stats.getInstance("development", "prefix");
    assert.isOk(stats);
  });

  it("returns the same underlying stats instance", function() {
    let stats = Stats.getInstance("production", "prefix");
    let stats2 = Stats.getInstance("production", "prefix");

    assert.strictEqual(stats._backend, stats2._backend);
  });

  it("has a stats backend", function() {
    let stats = Stats.getInstance("production", "prefix");
    assert.isOk(stats._backend instanceof StatsBackend);
  });

  it("returns an instance of PrefixedStats", function() {
    let stats = Stats.getInstance("production", "prefix");

    assert.isOk(stats instanceof PrefixedStats);
  });
});

describe("PrefixedStats", function() {
  let backend;
  let mockBackend;

  beforeEach(function() {
    backend = {
      logCounter: function() {},
      logTimer: function() {},
      logLine: function() {},
      logGauge: function() {},
    };

    mockBackend = sinon.mock(backend);
  });

  it("errors without stats", function() {
    assert.throws(function() {
      let stats = new PrefixedStats(null, "prefix");
    });
  });

  it("errors without a prefix", function() {
    assert.throws(function() {
      let stats = new PrefixedStats({}, null);
    });
  });

  describe("#setPrefix", function() {
    it("errors without a prefix", function() {
      let stats = new PrefixedStats(backend, "prefix");
      assert.throws(function() {
        stats.setPrefix(null);
      });
    });

    it("sets the prefix", function() {
      let stats = new PrefixedStats(backend, "prefix");

      stats.setPrefix("prefix2");

      assert.equal(stats._prefix, "prefix2");
    });
  });

  describe("#logCounter", function() {
    it("calls the backend's logCounter with defaults", function() {
      let stats = new PrefixedStats(backend, "prefix");
      mockBackend.expects("logCounter").once().withExactArgs("prefix.key", 1, 1.0);

      stats.logCounter("key");

      mockBackend.verify();
    });

    it("calls the backend's logCounter with the count", function() {
      let stats = new PrefixedStats(backend, "prefix");
      mockBackend.expects("logCounter").once().withExactArgs("prefix.key", 50, 1.0);

      stats.logCounter("key", 50);

      mockBackend.verify();
    });

    it("calls the backend's logCounter with the sample rate", function() {
      let stats = new PrefixedStats(backend, "prefix");
      mockBackend.expects("logCounter").once().withExactArgs("prefix.key", 50, 0.5);

      stats.logCounter("key", 50, 0.5);

      mockBackend.verify();
    });
  });

  describe("#logTimer", function() {
    it("calls the backend's logTimer with defaults", function() {
      let stats = new PrefixedStats(backend, "prefix");
      mockBackend.expects("logTimer").once().withExactArgs("prefix.key", 1000, 1.0);

      stats.logTimer("key", 1000);

      mockBackend.verify();
    });

    it("calls the backend's logTimer with the sample rate", function() {
      let stats = new PrefixedStats(backend, "prefix");
      mockBackend.expects("logTimer").once().withExactArgs("prefix.key", 1000, 0.5);

      stats.logTimer("key", 1000, 0.5);

      mockBackend.verify();
    });
  });

  describe("#logLine", function() {
    it("calls the backend's logLine", function() {
      let stats = new PrefixedStats(backend, "prefix");
      mockBackend.expects("logLine").once().withExactArgs("golden kappa lol");

      stats.logLine("golden kappa lol");

      mockBackend.verify();
    });
  });

  describe("#logGauge", function() {
    it("calls the backend's logGauge", function() {
      let stats = new PrefixedStats(backend, "prefix");
      mockBackend.expects("logGauge").once().withExactArgs("key");

      stats.logGauge("key");

      mockBackend.verify();
    });
  });
});

describe("StatsBackend", function() {
  let backend;

  beforeEach(function() {
    backend = new StatsBackend({addr: "http://golden.kappa"});
  });

  it("errors without a config", function() {
    assert.throws(function() {
      let backend = new StatsBackend(null);
    });
  });

  it("initializes fields", function() {
    assert.equal(backend._addr, "http://golden.kappa");
    assert.isOk(backend._recordDelay > 0);

    assert.deepEqual(backend._combinedStats.timers, []);
    assert.deepEqual(backend._combinedStats.counters, []);
    assert.deepEqual(backend._combinedStats.log_lines, []);
    assert.deepEqual(backend._combinedStats.gauges, []);
  });

  describe("logging fuctions", function() {
    let scheduleFlushSpy;

    beforeEach(function() {
      scheduleFlushSpy = sinon.spy();
      backend._record = scheduleFlushSpy;
    });

    describe("#logCounter", function() {
      it("schedules a flush", function() {
        backend.logCounter("key");
        assert.equal(scheduleFlushSpy.callCount, 1);
      });

      it("adds to combined stats", function() {
        backend.logCounter("key", 2);

        assert.deepEqual(backend._combinedStats.counters, [
          {
            key: "key",
            count: 2,
            sample_rate: 1.0,
          }
        ]);
      });
    });

    describe("#logTimer", function() {
      it("schedules a flush", function() {
        backend.logTimer("key", 1000);
        assert.equal(scheduleFlushSpy.callCount, 1);
      });

      it("adds to combined stats", function() {
        backend.logTimer("key", 1000);

        assert.deepEqual(backend._combinedStats.timers, [
          {
            key: "key",
            milliseconds: 1000,
            sample_rate: 1.0,
          }
        ]);
      });
    });

    describe("#logLine", function() {
      it("schedules a flush", function() {
        backend.logLine("line");
        assert.equal(scheduleFlushSpy.callCount, 1);
      });

      it("adds to combined stats", function() {
        backend.logLine("line");

        assert.deepEqual(backend._combinedStats.log_lines, [
          {
            log_line: "line"
          }
        ]);
      });
    });

    describe("#logGauge", function() {
      it("schedules a flush", function() {
        backend.logGauge("key");
        assert.equal(scheduleFlushSpy.callCount, 1);
      });

      it("adds to combined stats", function() {
        backend.logGauge("key");

        assert.deepEqual(backend._combinedStats.gauges, [
          {
            key: "key"
          }
        ]);
      });
    });
  });

  describe("#_record", function() {
    let clock;
    let flushSpy;

    beforeEach(function() {
      flushSpy = sinon.spy();
      clock = sinon.useFakeTimers();
    });

    afterEach(function() {
      clock.restore();
    });

    it("flushes after its delay", function() {
      let flushSpy = sinon.spy();
      backend._flush = flushSpy;

      backend._record();

      clock.tick(backend._recordDelay + 100);

      assert.equal(flushSpy.callCount, 1);
    });

    it("flushes only once with multiple calls", function() {
      let flushSpy = sinon.spy();
      backend._flush = flushSpy;

      backend._record();
      backend._record();
      backend._record();

      clock.tick(backend._recordDelay + 100);

      assert.equal(flushSpy.callCount, 1);
    });

    it("flushes again after its delay", function() {
      let flushSpy = sinon.spy();
      backend._flush = flushSpy;

      backend._record();
      clock.tick(backend._recordDelay + 100);
      backend._record();
      clock.tick(backend._recordDelay + 100);

      assert.equal(flushSpy.callCount, 2);
    });

    it("flushes synchronously if the number of pending stats is greater than the max", function() {
      let flushSpy = sinon.spy();
      backend._flush = flushSpy;

      // starts scheduling a flush
      backend._record();

      // simulate reaching the max
      let max = backend._maxPendingStats;
      backend._numPendingStats = function() { return max + 1; };

      backend._record();

      assert.equal(flushSpy.callCount, 1);

      // test that there are no additional flushes
      clock.tick(backend._recordDelay + 100);

      assert.equal(flushSpy.callCount, 1);
    });
  });

  describe("#_numPendingStats", function() {
    beforeEach(function() {
      backend._record = function() {}; // noop
    });

    it("is equal to the number of log calls", function() {
      for (let i = 0; i < 10; ++i) {
        backend.logCounter("key");
      }

      for (let i = 0; i < 5; ++i) {
        backend.logTimer("key", 1000);
      }

      for (let i = 0; i < 7; ++i) {
        backend.logGauge("key");
      }

      for (let i = 0; i < 20; ++i) {
        backend.logLine("line");
      }

      assert.equal(backend._numPendingStats(), 10 + 5 + 7 + 20);
    });
  });

  describe("#_flush", function() {
    let xhr;
    let requests;

    beforeEach(function() {
      requests = [];
      xhr = sinon.useFakeXMLHttpRequest();
      xhr.onCreate = function(request) {
        requests.push(request);
      };
    });

    afterEach(function() {
      xhr.restore();
    });

    it("resets combined stats", function() {
      sinon.spy(backend, "_resetCombinedStats");

      backend._flush();

      assert.equal(backend._resetCombinedStats.callCount, 1);
    });

    it("makes a POST request", function() {
      backend._combinedStats = {
        timers: [{
          key: "kappa",
          millisieconds: 1000,
          sample_rate: 1
        }],
        counters: [
          {
            key: "kappa",
            count: 1,
            sample_rate: 1
          }
        ],
        log_lines: [
          "hello world"
        ],
        gauges: [
          "pub"
        ],
      };

      backend._flush();

      assert.equal(requests.length, 1);
      let request = requests[0];
      assert.equal(request.method, "POST");
      assert.equal(request.url, "http://golden.kappa/v1/stats");
      assert.match(request.requestHeaders['Content-Type'], /application\/json/);

      let bodyJSON = JSON.parse(request.requestBody);

      assert.deepEqual(bodyJSON, {
        timers: [{
          key: "kappa",
          millisieconds: 1000,
          sample_rate: 1
        }],
        counters: [
          {
            key: "kappa",
            count: 1,
            sample_rate: 1
          }
        ],
        log_lines: [
          "hello world"
        ],
        gauges: [
          "pub"
        ],
      });
    });
  });
});
