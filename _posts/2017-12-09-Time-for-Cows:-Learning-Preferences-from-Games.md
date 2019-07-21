---
layout: post
title:  "Time for Cows: Learning from Games"
---

I designed a [game](http://apps.hobbservations.com) about cows, droughts, and insurance to play with pastoralists in Kenya. The current version is far from user-friendly, but might be interesting to people engaged in this sort of research. We'll be using the data to put together a model of their decision-making under risk that we hope will be accurate enough to help us design insurance products that better meet their needs.

# Background: what's index insurance?

Index insurance is a way of providing insurance to farmers at a low cost while avoiding moral hazard. It works by paying farmers when an index (which might be rainfall, average production in a region, or satellite images) shows evidence of a drought or an otherwise poor season. Unlike traditional insurance, this doesn't require investigation of individual claims, and it doesn't create any incentive for the policy holder to reduce their productive effort, since the insurance payment can't be affected by it. Instead, when the satellite (in our cases) detects a drought, the contract immediately sends payments to the farmers to help them reduce the impact of bad weather on their family as well as their livestock.

# Why don't farmers want to buy index insurance?

Demand for index insurance has generally been poor in the absence of very large subsidies. Binswanger [FULL CITE] argues that farmers outside of the poorest group don't need it because they are effectively insured in other ways, and that the poorest farmers can't afford it. Clark [FULL CITE] shows that standard expected utility models can predict limited demand simply because index insurance makes the worst possible case worse than it was before: it is possible to have paid an insurance premium and still suffer the consequences of an unproductive year.

A number of other papers look to behavioral economics for explanations of limited demand for index insurance. This fits into a larger literature that tries to explain observed choices about risk-taking in general that seem inconsistent with expected utility theory. For example, insurance for very small risks sold far above the actuarily fair price, such as cell phones and household appliances, is quite popular. Rabin [FULL CITE] showed that this cannot reasonably be explained by expected utility theory. At the other hand, annuities and flood insurance are surprisingly unpopular, even when their price is close to or below their actuarily fair value.

These games will allow us to compare competing theories as to why farmers don't want to buy existing insurance. More importantly, the results will hopefully help us understand how to build insurance that better fits farmer needs.

# Using games to design better insurance

While we don't *need* behavioral economics to explain limited demand for index insurance, we have evidence that it is useful in general for explaining decisions made under risk. Further, if it is the best explanation, we can use it to design insurance that is more appealing to consumers.

Risk experiments to date have focused on clever design to obtain precise estimates of parameters. This study comes at it from a machine learning perspective, which allows us to avoid creating an artificial game under the assumption that agents exactly behave according to some theory. Instead, it seeks to model a relatively realistic situation and then find the model that best fits noisy data.

1. Elicit a large number of choices in random situations from an individual by playing a game that mirrors their reality as closely as possible.
2. Solve the same game numerically under a variety of models.
3. Use cross validation to find the model that best explains the data at the individual and group level.

A working prototype of the game is up at [here](apps.hobbservations.com). To understand the game, note that the payoffs are in money, ansd that each round all of your assets are liquidated (i.e. if you want the same herd of cows, you must re-buy it each turn). It's written this way because that's how the computer solves it - the field version will include both buying and selling and will be text-free and entirely graphical so that reading isn't required to play (if you have design ideas, email me!).
