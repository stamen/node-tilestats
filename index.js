"use strict";

var util = require("util");
var metricsd = require("metricsd"),
    metrics = metricsd({
      prefix: "tiles"
    });

process.stdin.resume();
process.stdin.setEncoding("utf8");

var pending = '';

var histograms = {};
var requestTime = function(tileset) {
  if (!(tileset in histograms)) {
    histograms[tileset] = metrics.histogram(util.format("%s.requestTime", tileset));
  }

  return histograms[tileset];
};

process.stdin.on("data", function(chunk) {
  pending += chunk;

  pending.split("\n").forEach(function(line) {
    try {
      var record = JSON.parse(line);

      var tileset = record["@fields"]["request"].split(/[/?]/)[1];

      switch (record["@fields"]["status"]) {
      case "200":
        metrics.mark(tileset);
        requestTime(tileset).update(Math.round(record["@fields"]["request_time"] * 1000));

        break;

      case "499":
        metrics.mark(util.format("%s.timeout", tileset));

        metrics.mark(tileset);
        requestTime(tileset).update(Math.round(record["@fields"]["request_time"] * 1000));

        break;

      case "500":
        metrics.mark(util.format("%s.error", tileset));

        metrics.mark(tileset);
        requestTime(tileset).update(Math.round(record["@fields"]["request_time"] * 1000));

        break;
      }
    } catch (e) {
      pending = line;
    }
  });
});
