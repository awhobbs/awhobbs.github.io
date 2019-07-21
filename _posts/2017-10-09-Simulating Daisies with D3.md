---
layout: post
title:  "Simulating Daisies with D3"
---

[Daisyworld](https://en.wikipedia.org/wiki/Daisyworld) is a simulation of a planet that is slowly getting hotter, and I thought it seemed like a fun way to experiment with D3.js. It is
inhabited by two species of daisies: dark daisies and light daisies. Dark daisies
absorb solar radiation, meaning they can grow
in cool temperatures and help the planet get warmer. Light daises reflect solar
radiation and help the planet cool off. Without any
coordination, dark and light daisies can keep their planet at a habitable temperature,
even with variable solar radiation.

Unfortunately, the daisies can still only inhabit their planet within a band of
temperatures. The visualization below is a D3 adaptation of this model, which I built on the math from
[Portland State University](http://www3.geosc.psu.edu/~dmb53/DaveSTELLA/Daisyworld/daisyworld_model.htm).

Be patient, the planet is initially too cold for daisies to grow. When I get a chance
maybe I'll add a temperature tracker, but if you want to watch the numbers change in the
meantime open a browser console (⌘ + Option + J in Chrome on a Mac, Ctrl + Shift + J on Linux/Windows).

The planet will eventually get too hot and they'll all die.

<div style="text-align:center;"><svg width="500" height="500"></svg></div>
<script src="https://d3js.org/d3.v4.min.js"></script>
<script src = "http://hobbservations.com/daisyworld/daisyworld.js"></script>
