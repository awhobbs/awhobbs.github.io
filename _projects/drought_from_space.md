---
layout: page
title: Detecting Droughts from Space
description: A computer vision benchmark for satellite-based drought detection in Northern Kenya
img: assets/img/drought_from_space.png
importance: 2
category:
---

A benchmark dataset and competition for predicting forage conditions for livestock in Northern Kenya from satellite imagery. The setup pairs Landsat tiles with expert forage-quality labels collected on the ground; the goal is a model good enough to feed a more accurate index for drought insurance. Better indices mean payouts that actually track the losses pastoralists experience, instead of being driven by noise in coarse vegetation indices.

I built this in collaboration with [Stacey Svetlichnaya](https://www.linkedin.com/in/stacey-svetlichnaya-3761552a/) and [Weights & Biases](https://wandb.ai), who hosted the [public benchmark](https://wandb.ai/wandb_fc/articles/reports/Deep-Learning-for-Climate-Adaptation-Detecting-Drought-from-Space--Vmlldzo1NDU4MjQw). The competition let CV researchers without development-economics context contribute to a real-world insurance product, and the W&B writeup walks through the data, baselines, and what the leaderboard taught us.

Presented at the [Computer Vision for Agriculture workshop at ICLR 2020](https://www.cv4gc.org/cv4a2020/). Paper: [Satellite-based Prediction of Forage Conditions for Livestock in Northern Kenya](https://arxiv.org/abs/2004.04081) (Hobbs & Svetlichnaya).
