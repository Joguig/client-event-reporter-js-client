# client-event-reporter-js-client

Integrates with the client-event-reporter service.

Stats can be viewed on http://grafana.prod.us-west2.justin.tv

Production stats:

  ```
  stats.counters.client-event-reporter.production.*
  stats.timers.client-event-reporter.production.*
  stats.gauges.client-event-reporter.production.*
  ```

Development/staging/darklaunch stats:

  ```
  stats.counters.client-event-reporter.darklaunch.*
  stats.timers.client-event-reporter.darklaunch.*
  stats.gauges.client-event-reporter.darklaunch.*
  ```

## Installation

```
make setup
```

## Building

```
make build
```

This generates `dist/client-event-reporter.amd.js` and `dist/client-event-reporter.umd.js`

## Testing

Run tests once
```
make test
```

Continously run tests during development (use two tabs)
```
make watch-test
make watch-babel
```

## Releasing
```
make build
git commit # If there are any changes
git tag -m 'Tagging as X.X.X' X.X.X
git push --tags
```

## Client API

Example

```javascript
import { Stats } from 'client-event-reporter';

let prefix = "web-client.services.users"; // prepended to all stats

let environment = "production"; // must be "production", "darklaunch", "staging", or "development"
let stats = Stats.getInstance(environment, prefix); // gets a stats instance

// An optional sample_rate param can be passed to `logCounter` and logTimer` that's [0, 1.0)
stats.logCounter("logged_in", 1); // records "web-client.services.users.logged_in
stats.logTimer("render", 100); // records "web-client.services.users.render
stats.logGauge("connected"); // increments a gauge
stats.logLine("An error occurred"); // logs to server logs
```
