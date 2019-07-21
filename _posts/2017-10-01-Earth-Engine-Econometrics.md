---
layout: post
title:  "Earth Engine Econometrics"
---

Google Earth Engine is not built to do econometrics, but it makes doing so with geographic data from a low-powered (and small hard-drived) computer practical. This post details one method to leverage the Earth Engine platform for panel regression, which makes it possible to obtain a plausibly causal estimate of the effects of weather fluctuations.

The basic steps are:

1. Import the layers of data you desire.
2. Create new layers of data for other variables, such as year effects and perhaps a constant.
3. Randomly sample pixels and convert them to a geopandas dataframe for regression analysis.

# Import the data

The first step is to import the data desired. I am interested in the relationship between weather shocks and forest change. For forest change, I plan to use data from [Hansen et al. (2013)](http://science.sciencemag.org/content/342/6160/850). For weather shocks, I will start by using rainfall data, though down the road I'll need to do something more sophisticated.


```python
# Import and initialize the Earth Engine Python API
import ee
ee.Initialize()

# Import library to display images
from IPython.display import Image

# Get the shape of Mozambique
countries = ee.FeatureCollection('ft:1tdSwUL7MVpOauSgRzqVTOwdfy17KDbw-1d9omPw')
moz = countries.filterMetadata('Country', 'equals', 'Mozambique')

# Get the Hansen et al. (2013) data, clip to Mozambique
#gfc = ee.Image('UMD/hansen/global_forest_change_2015_v1_3').clip(moz)
gfc = ee.Image('UMD/hansen/global_forest_change_2015').clip(moz)

# Get the image for forest cover in 2000. Will be used to restrict the regression,
# since we are only interested in forest loss where there was once forest
moz_treecover2000 = gfc.select('treecover2000')

# Get PERSIANN rainfall data, clip to Mozambique
persiann = ee.ImageCollection('NOAA/PERSIANN-CDR').select('precipitation').filterBounds(moz)
```


```python
# Convert to a collection of annual images
# The Hansen data starts out as a single image, so we need to split it up
# The precipitation data needs to be added up

def annual_stuff(year):
    year = ee.Number(year)
    start_date = ee.Date.fromYMD(year, 1, 1)
    end_date = ee.Date.fromYMD(year, 12, 31)

    # This will give the daily precipitation
    # so to get the yearly total, we need to add them together
    total_precipitation = persiann.filterDate(start_date, end_date).reduce(ee.Reducer.sum()).clip(moz)

    # Get forest loss for that year
    yrID = year.subtract(2000)
    loss = ee.Image(0)
    lossyear = gfc.select('lossyear').eq(yrID)
    loss = loss.add(lossyear).rename(['lossyear'])

    # Create a year band
    yr_image = ee.Image(year).float().rename(['year'])

    # Combine the three into a composite image for the year
    composite = loss.addBands(total_precipitation).addBands(yr_image)

    return composite

year_range = ee.List.sequence(2001, 2015)

data = ee.ImageCollection(year_range.map(annual_stuff))

Image(url = gfc.getThumbUrl({
      'region': moz.geometry().bounds().getInfo(),
      'bands': 'lossyear',
      'min': 2,
      'max': 3}))
```




<img src="{{ site.url }}/img/loss.png"/>



It is worth displaying the data to make sure it makes sense. Let's write a quick helper function to look at data for a given year and then display a map of average total precipitation.


```python
average_image = data.mean()

Image(url = average_image.getThumbUrl({
      'region': moz.geometry().bounds().getInfo(),
      'bands': 'precipitation_sum',
      'min':  0,
      'max': 2500}))
```




<img src="{{ site.url }}/img/rain.png"/>



It looks like we have the right data - the dry areas are where expected (the dark area in the lower left, for example) and the rainier areas are also as expected (the North, where there is greater rainfall).

Now we can try using Earth Engine's regression function. When we apply it across all of Mozambique, we get


```python
# Run the regression for all of Mozambique
mean_data = data.mean().select(['year', 'precipitation_sum', 'lossyear'])
print mean_data.bandNames().getInfo()

linear_fit = (mean_data.reduceRegion(
    reducer= ee.Reducer.linearRegression(
    numX= 2,
    numY= 1
  ),
  geometry= moz,
  scale= 200,
  maxPixels= 134100833650
))

print(linear_fit.getInfo())
```

    [u'year', u'precipitation_sum', u'lossyear']
    {u'residuals': [0.012013937790101835], u'coefficients': [[-4.539741010669634e-07], [3.2480903671127144e-06]]}


This gives us an 'average' result for the entire dataset. However, this function does not return standard errors, and does not allow us to conduct a panel regression. In order to do that, the easiest way forward is to download a sample of the data and analyze it locally using `pandas` and `statsmodels`. I conducted this analysis on a remote [Digital Ocean](https://www.digitalocean.com/) server, but it could also be done on a local machine (or using Google Compute Engine, AWS, or some other server).

# Random Samples to Analysis

The code below includes functions to de-mean the data, randomly sample pixels from it, and convert a feature collection to a geopandas dataframe.


```python
from geopandas import GeoDataFrame
from shapely.geometry import shape

mean_data = data.mean()

# define a function to subtract the mean
def demean(image):
    return image.subtract(mean_data).set('system:time_start', image.get('system:time_start'));

def sample(seed):
    seed = ee.Number(seed)
    return data.map(lambda i: i.sample(region = moz, numPixels = 200, seed = seed)).flatten()

def fc2df(fc):
    # Convert a FeatureCollection into a pandas DataFrame

    # Features is a list of dict with the output
    features = fc.getInfo()['features']

    dictarr = []

    for f in features:
        # Store all attributes in a dict
        attr = f['properties']
        # and treat geometry separately
        attr['geometry'] = f['geometry']  # GeoJSON Feature!
        # attr['geometrytype'] = f['geometry']['type']
        dictarr.append(attr)

    df = GeoDataFrame(dictarr)
    # Convert GeoJSON features to shape (removed this line because points have no shape)
    # leaving it here for future use
    #df['geometry'] = map(lambda s: shape(s), df.geometry)    
    return df
# End fc2df

# demean all the data
data = data.map(demean)
```


```python
import pickle

with open('df_list.pickle', 'wb') as f:
    pickle.dump(df_list, f)
```


```python
#this downloads data, and waits for google when it needs to
import time

df_list = []

def sampler():
    try:
        for i in range(len(df_list), 100):
            print(str(i) + ' started')
            df_list.append(fc2df(sample(i)))
            print(str(i) + ' complete!')
    except:
        #save progress
        print('Exception, saving progress')
        with open('prog_file.pickle', 'wb') as f:
            pickle.dump(df_list, f)
        #wait for 10 minutes to give Google a break
        print('Waiting')
        time.sleep(600)
        #resume
        print('Resume')
        sampler()  

sampler()
```


Now we can save the results by pickling them.


```python
import pickle

with open('df_list_backup.pickle', 'wb') as f:
    pickle.dump(df_list, f)
```


```python
import pandas as pd
import numpy as np
import statsmodels.formula.api as sm


# Import from pickle so we can simply start from this code block
# in future runs
import pickle

with open('df_list.pickle') as f:
    df_list = pickle.load(f)

df = pd.concat(df_list)

#fix loss variable
df['lossyear'] = np.where(df['lossyear']>0, 1, 0)

#convert precipitation to centimeters
df['precip'] = df['precipitation_sum'] * 10
df['precip2'] = df['precip']**2
df['abs_precip'] = abs(df['precip'])
df['abs_precip2'] = abs(df['precip2'])

df['precip_positive'] = np.where(df['precip']>0, df['precip'], 0)
df['precip_negative'] = np.where(df['precip']<0, df['abs_precip'], 0)

df['pp2'] = df['precip_positive'] ** 2
df['pn2'] = df['precip_negative'] ** 2

result = sm.ols(formula="lossyear ~ -1 + precip  + precip2  + C(year)", data=df).fit()

print result.summary()
```

In the above we some some evidence that very high levels of precipitation are associated with increased forest loss. Of course, this is still a very crude regression. Instead of using a quadratic, we might also try bins. To explore that idea, let's look at a histogram.


```python
%matplotlib inline

from scipy import stats, integrate
import matplotlib.pyplot as plt
import seaborn as sns
sns.set(color_codes=True)

sns.distplot(df['precip'])
```




    <matplotlib.axes._subplots.AxesSubplot at 0x7f9f71c23910>




![png]({{ site.url }}/img/Earth%20Engine%20Econometrics_files/Earth%20Engine%20Econometrics_17_1.png)


Now let's generate some bins and see how they look:


```python
precip_sd = np.sqrt(np.var(df['precip']))
precip_min = np.min(df['precip'])
precip_max = np.max(df['precip'])

# define bins
bins = [precip_min, -2*precip_sd, -precip_sd, 0, precip_sd, 2*precip_sd, precip_max]

# generate a variable designating bins
df['rain_bin'] = np.digitize(df.precip, bins)

sns.distplot(df['rain_bin'])
```




    <matplotlib.axes._subplots.AxesSubplot at 0x7f9f7199ae90>




![png]({{ site.url }}/img/Earth%20Engine%20Econometrics_files/Earth%20Engine%20Econometrics_19_1.png)



```python
# run binned regression
bin_result = sm.ols(formula="lossyear ~ -1 + C(rain_bin)  + C(year)", data=df).fit()

print bin_result.summary()
```

                                OLS Regression Results                            
    ==============================================================================
    Dep. Variable:               lossyear   R-squared:                       0.000
    Model:                            OLS   Adj. R-squared:                  0.000
    Method:                 Least Squares   F-statistic:                     6.785
    Date:                Wed, 20 Sep 2017   Prob (F-statistic):           3.33e-19
    Time:                        01:11:15   Log-Likelihood:             4.8956e+05
    No. Observations:              299730   AIC:                        -9.791e+05
    Df Residuals:                  299709   BIC:                        -9.789e+05
    Df Model:                          20                                         
    Covariance Type:            nonrobust                                         
    ===================================================================================
                          coef    std err          t      P>|t|      [0.025      0.975]
    -----------------------------------------------------------------------------------
    C(rain_bin)[1]   5.938e-05      0.001      0.057      0.955      -0.002       0.002
    C(rain_bin)[2]      0.0007      0.000      1.579      0.114      -0.000       0.002
    C(rain_bin)[3]      0.0006      0.000      1.331      0.183      -0.000       0.001
    C(rain_bin)[4]      0.0002      0.000      0.580      0.562      -0.001       0.001
    C(rain_bin)[5]      0.0005      0.000      1.068      0.286      -0.000       0.001
    C(rain_bin)[6]      0.0014      0.000      2.868      0.004       0.000       0.002
    C(rain_bin)[7]   5.971e-17      0.011   5.51e-15      1.000      -0.021       0.021
    C(year)[T.-6.0]     0.0010      0.001      1.934      0.053   -1.35e-05       0.002
    C(year)[T.-5.0]     0.0007      0.001      1.325      0.185      -0.000       0.002
    C(year)[T.-4.0]     0.0023      0.001      4.483      0.000       0.001       0.003
    C(year)[T.-3.0]     0.0019      0.001      3.592      0.000       0.001       0.003
    C(year)[T.-2.0]     0.0018      0.001      3.554      0.000       0.001       0.003
    C(year)[T.-1.0]     0.0024      0.000      4.850      0.000       0.001       0.003
    C(year)[T.0.0]      0.0024      0.001      4.585      0.000       0.001       0.003
    C(year)[T.1.0]      0.0036      0.001      6.829      0.000       0.003       0.005
    C(year)[T.2.0]      0.0021      0.001      4.006      0.000       0.001       0.003
    C(year)[T.3.0]      0.0022      0.001      4.135      0.000       0.001       0.003
    C(year)[T.4.0]      0.0015      0.001      2.808      0.005       0.000       0.002
    C(year)[T.5.0]      0.0026      0.001      5.033      0.000       0.002       0.004
    C(year)[T.6.0]      0.0021      0.001      4.058      0.000       0.001       0.003
    C(year)[T.7.0]     -0.0006      0.001     -1.061      0.289      -0.002       0.000
    ==============================================================================
    Omnibus:                   664176.995   Durbin-Watson:                   2.005
    Prob(Omnibus):                  0.000   Jarque-Bera (JB):       2454185740.680
    Skew:                          21.050   Prob(JB):                         0.00
    Kurtosis:                     444.293   Cond. No.                         80.4
    ==============================================================================

    Warnings:
    [1] Standard Errors assume that the covariance matrix of the errors is correctly specified.


Again, we see some evidence that extreme rain levels may be associated with deforestation. Recall that since these are differences from the *pixel* average and we have year fixed effects, we may be identifying a causal effect. At the same time, our standard errors are incorrect, so the statistical significance of the above results is overstated. Rather than fix that now, we'll work on a model with better data.

In the next edition of this study, I'll use some better variables for measuring floods and droughts. Raw annual precipitation at a relatively low resolution seems to show some evidence of the effect we are looking for - better measures of floods and droughts from satellite images ought to do better.
