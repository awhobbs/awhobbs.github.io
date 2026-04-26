---
layout: page
title: Scalable Country-Level Crop Yield Modeling
description: District-level maize yield predictions across Sub-Saharan Africa
img: assets/img/africa_yields.png
importance: 1
category:
---

**[View the live map →](https://hobbservations.com/africa-yields/)**

A static web map of predicted maize yields by admin2 district across 35 Sub-Saharan African countries, 2000–2024. Predictions come from a dual-mode LightGBM model trained on GROW-Africa survey yields and satellite features (CHIRPS rainfall, ERA5-Land temperature and soil moisture, Landsat NDVI/EVI/GCVI, GDD/KDD). The same model produces both nowcasts and forecasts at 1, 2, 3, and 6 months pre-harvest, so the UI lets you pick a forecast horizon and see how predictive skill decays with lead time.

The map shows ~3,250 admin2 units across the region. Validation level (whether ground truth exists at admin2, admin1, or country level) is encoded in the polygon border style, so it's easy to see where predictions are anchored to direct observations versus extrapolated. A harvest-month filter desaturates districts whose typical harvest falls outside the selected window, and an "anomaly" view shows each district's yield as standard deviations from its long-run mean.

The pipeline pulls satellite features via Google Earth Engine, merges them with LSMS-ISA household survey panels, trains the model, and exports per-year choropleth slices. Site is in active development — working paper coming soon.

Presented at the [Tackling Climate Change with Machine Learning workshop at NeurIPS 2025](https://www.climatechange.ai/events/neurips2025).
