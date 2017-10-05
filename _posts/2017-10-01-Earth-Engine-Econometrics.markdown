---
layout: post
title:  "Earth Engine Econometrics"
date:   2017-10-01 12:52:56 -0700
---
Google Earth Engine is not built to do econometrics, but it makes doing so with geographic data from a low-powered (and small hard-drived) computer practical.

The basic steps are:

1. Import the layers of data you desire.
2. Create new layers of data for other variables, such as year effects and perhaps a constant.
3. Use a reducer to smooth data across space (if desired). For relationships between a pixel and nearby pixels, rather than just on the values of other layers at the same pixel.
4. Create a `FeatureCollection` from a random sample of pixels. Calculate OLS coefficients and standard errors. Repeat.

The bootstrap approach in the last step may not be necessary if you're only analyzing a small area, but Earth Engine limits the amount of data to about 100M.

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




<img src="https://earthengine.googleapis.com/api/thumb?thumbid=be0e9627933bbdffc1de50b892d3a0c7&token=c261eb76501f893004da7cba5adf56f9"/>



It is worth displaying the data to make sure it makes sense. Let's write a quick helper function to look at data for a given year


```python
from IPython.display import Image

average_image = data.mean()

Image(url = average_image.getThumbUrl({
      'region': moz.geometry().bounds().getInfo(),
      'bands': 'precipitation_sum',
      'min':  0,
      'max': 2500}))
```




<img src="https://earthengine.googleapis.com/api/thumb?thumbid=3b636b10341333be704db8fae55096bd&token=f103cf28c245c2c23ca4418eef69c375"/>



It looks like we have the right data. However, a very small share of pixels are deforested in a given year. This is of course a good thing. However, if we take a sample, we may get all zeroes. Let's see how much deforestation there is in each year.


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



```python
!export LD_LIBRARY_PATH=/usr/local/lib
```


```python
!export LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH
```


```python
!echo $LD_LIBRARY_PATH
```

    /usr/local/lib



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

# This is a three step process
data = data.map(demean)

#rand_data = sample(1234)
#print rand_data.getInfo()

#generate a bunch of seeds to get different datasets
seeds = (1, 2)


df = fc2df(sample(350))
#results[1] = sm.ols(formula="lossyear ~ precip + precip2  + C(year)", data=df).fit()

#for seed in seeds:
 #   df = pd.concat(df, fc2df(sample(seed)))

#random_sets = map(sample, seeds)

#dfs = map(fc2df, random_sets)

#print random_sets.getInfo()

#dfs = fc2df(random_sets) #.map(fc2df)

#df = fc2df(rand_data)
```


```python
import pandas as pd
import numpy as np
import statsmodels.formula.api as sm

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

print df.describe()
```

              lossyear  precipitation_sum         year        precip  \
    count  1500.000000       1.500000e+03  1500.000000  1.500000e+03   
    mean      0.001333      -2.425319e-15     0.000000 -3.880511e-14   
    std       0.036503       1.860262e+02     4.321935  1.860262e+03   
    min       0.000000      -5.140513e+02    -7.000000 -5.140513e+03   
    25%       0.000000      -1.326161e+02    -4.000000 -1.326161e+03   
    50%       0.000000      -1.136403e+01     0.000000 -1.136403e+02   
    75%       0.000000       1.155503e+02     4.000000  1.155503e+03   
    max       1.000000       7.390148e+02     7.000000  7.390148e+03   

                precip2   abs_precip   abs_precip2  precip_positive  \
    count  1.500000e+03  1500.000000  1.500000e+03      1500.000000   
    mean   3.458267e+06  1467.805797  3.458267e+06       733.902899   
    std    5.355807e+06  1142.227382  5.355807e+06      1176.277739   
    min    2.009662e-01     0.448292  2.009662e-01         0.000000   
    25%    3.194985e+05   565.241225  3.194985e+05         0.000000   
    50%    1.588682e+06  1260.429232  1.588682e+06         0.000000   
    75%    4.218607e+06  2053.924785  4.218607e+06      1155.502943   
    max    5.461428e+07  7390.147807  5.461428e+07      7390.147807   

           precip_negative           pp2           pn2  
    count      1500.000000  1.500000e+03  1.500000e+03  
    mean        733.902899  1.921320e+06  1.536947e+06  
    std         999.499690  5.013597e+06  3.075449e+06  
    min           0.000000  0.000000e+00  0.000000e+00  
    25%           0.000000  0.000000e+00  0.000000e+00  
    50%         113.640259  0.000000e+00  1.291522e+04  
    75%        1326.161423  1.335188e+06  1.758709e+06  
    max        5140.513269  5.461428e+07  2.642488e+07  



```python
result = sm.ols(formula="lossyear ~ -1 + abs_precip + abs_precip2    + C(year)", data=df).fit()

print result.summary()
```

                                OLS Regression Results                            
    ==============================================================================
    Dep. Variable:               lossyear   R-squared:                       0.020
    Model:                            OLS   Adj. R-squared:                  0.009
    Method:                 Least Squares   F-statistic:                     1.851
    Date:                Tue, 22 Aug 2017   Prob (F-statistic):             0.0210
    Time:                        16:09:55   Log-Likelihood:                 2852.5
    No. Observations:                1500   AIC:                            -5671.
    Df Residuals:                    1483   BIC:                            -5581.
    Df Model:                          16                                         
    Covariance Type:            nonrobust                                         
    =================================================================================
                        coef    std err          t      P>|t|      [0.025      0.975]
    ---------------------------------------------------------------------------------
    C(year)[-7.0]    -0.0027      0.005     -0.575      0.565      -0.012       0.006
    C(year)[-6.0]    -0.0025      0.004     -0.589      0.556      -0.011       0.006
    C(year)[-5.0]    -0.0016      0.004     -0.419      0.676      -0.009       0.006
    C(year)[-4.0]     0.0181      0.004      4.528      0.000       0.010       0.026
    C(year)[-3.0]    -0.0027      0.004     -0.619      0.536      -0.011       0.006
    C(year)[-2.0]    -0.0020      0.004     -0.484      0.628      -0.010       0.006
    C(year)[-1.0]    -0.0028      0.004     -0.635      0.525      -0.011       0.006
    C(year)[0.0]     -0.0023      0.004     -0.555      0.579      -0.010       0.006
    C(year)[1.0]     -0.0021      0.004     -0.513      0.608      -0.010       0.006
    C(year)[2.0]     -0.0017      0.004     -0.430      0.668      -0.009       0.006
    C(year)[3.0]     -0.0020      0.004     -0.485      0.628      -0.010       0.006
    C(year)[4.0]     -0.0020      0.004     -0.498      0.619      -0.010       0.006
    C(year)[5.0]     -0.0018      0.004     -0.460      0.646      -0.010       0.006
    C(year)[6.0]     -0.0020      0.004     -0.500      0.617      -0.010       0.006
    C(year)[7.0]     -0.0025      0.004     -0.586      0.558      -0.011       0.006
    abs_precip     2.284e-06   2.21e-06      1.033      0.302   -2.05e-06    6.62e-06
    abs_precip2    -3.44e-10   4.86e-10     -0.708      0.479    -1.3e-09    6.09e-10
    ==============================================================================
    Omnibus:                     3775.739   Durbin-Watson:                   2.039
    Prob(Omnibus):                  0.000   Jarque-Bera (JB):         32216884.687
    Skew:                          26.521   Prob(JB):                         0.00
    Kurtosis:                     719.000   Cond. No.                     5.55e+07
    ==============================================================================

    Warnings:
    [1] Standard Errors assume that the covariance matrix of the errors is correctly specified.
    [2] The condition number is large, 5.55e+07. This might indicate that there are
    strong multicollinearity or other numerical problems.



```python
df.memory_usage()
```




    Index                   72
    geometry             12800
    lossyear             12800
    precipitation_sum    12800
    year                 12800
    precip               12800
    precip2              12800
    dtype: int64




```python

```


      File "<unknown>", line 1
        .
        ^
    SyntaxError: invalid syntax




```python
# Load a landsat image and select three bands.
landsat = ee.Image('LANDSAT/LC8_L1T_TOA/LC81230322014135LGN00').select(['B4', 'B3', 'B2'])

# Create a geometry representing an export region.
geometry = ee.Geometry.Rectangle([116.2621, 39.8412, 116.4849, 40.01236])

# Export the image, specifying scale and region.
task = (ee.batch.Export.image.toDrive(
  image= landsat,
  description= 'imageToDriveWithRegion',
  scale= 30,
  region= geometry.toGeoJSON()
))

task.start()
```


```python
df_list = []

for i in range(0, 100):
    print(i)
    df_list.append(fc2df(sample(i)))
    print(i)

```

    0
    0
    1
    1
    2
    2
    3
    3
    4
    4
    5
    5
    6
    6
    7
    7
    8
    8
    9
    9
    10
    10
    11
    11
    12
    12
    13
    13
    14
    14
    15
    15
    16
    16
    17
    17
    18
    18
    19
    19
    20
    20
    21
    21
    22
    22
    23
    23
    24
    24
    25
    25
    26
    26
    27
    27
    28
    28
    29
    29
    30
    30
    31
    31
    32



    ---------------------------------------------------------------------------

    EEException                               Traceback (most recent call last)

    <ipython-input-5-e97ea83a92da> in <module>()
          3 for i in range(0, 100):
          4     print(i)
    ----> 5     df_list.append(fc2df(sample(i)))
          6     print(i)
          7


    <ipython-input-2-3c38214d1753> in fc2df(fc)
         16
         17     # Features is a list of dict with the output
    ---> 18     features = fc.getInfo()['features']
         19
         20     dictarr = []


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/collection.pyc in getInfo(self)
        125            properties.
        126     """
    --> 127     return super(Collection, self).getInfo()
        128
        129   def limit(self, maximum, opt_property=None, opt_ascending=None):


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/computedobject.pyc in getInfo(self)
         93       The object can evaluate to anything.
         94     """
    ---> 95     return data.getValue({'json': self.serialize()})
         96
         97   def encode(self, encoder):


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/data.pyc in getValue(params)
        253   """
        254   params['json_format'] = 'v2'
    --> 255   return send_('/value', params)
        256
        257


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/data.pyc in send_(path, params, opt_method, opt_raw)
        781       raise ee_exception.EEException('Invalid JSON: %s' % content)
        782     if 'error' in json_content:
    --> 783       raise ee_exception.EEException(json_content['error']['message'])
        784     if 'data' not in content:
        785       raise ee_exception.EEException('Malformed response: ' + str(content))


    EEException: Too many requests to Fusion Tables.



```python
for i in range(32, 100):
    print(i)
    df_list.append(fc2df(sample(i)))
    print(i)
```

    32
    32
    33



    ---------------------------------------------------------------------------

    EEException                               Traceback (most recent call last)

    <ipython-input-6-a2f499c70000> in <module>()
          1 for i in range(32, 100):
          2     print(i)
    ----> 3     df_list.append(fc2df(sample(i)))
          4     print(i)


    <ipython-input-2-3c38214d1753> in fc2df(fc)
         16
         17     # Features is a list of dict with the output
    ---> 18     features = fc.getInfo()['features']
         19
         20     dictarr = []


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/collection.pyc in getInfo(self)
        125            properties.
        126     """
    --> 127     return super(Collection, self).getInfo()
        128
        129   def limit(self, maximum, opt_property=None, opt_ascending=None):


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/computedobject.pyc in getInfo(self)
         93       The object can evaluate to anything.
         94     """
    ---> 95     return data.getValue({'json': self.serialize()})
         96
         97   def encode(self, encoder):


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/data.pyc in getValue(params)
        253   """
        254   params['json_format'] = 'v2'
    --> 255   return send_('/value', params)
        256
        257


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/data.pyc in send_(path, params, opt_method, opt_raw)
        781       raise ee_exception.EEException('Invalid JSON: %s' % content)
        782     if 'error' in json_content:
    --> 783       raise ee_exception.EEException(json_content['error']['message'])
        784     if 'data' not in content:
        785       raise ee_exception.EEException('Malformed response: ' + str(content))


    EEException: Too many requests to Fusion Tables.



```python
for i in range(33, 100):
    print(i)
    df_list.append(fc2df(sample(i)))
    print(i)
```

    33
    33
    34
    34
    35



    ---------------------------------------------------------------------------

    EEException                               Traceback (most recent call last)

    <ipython-input-13-b21a6c0c13a2> in <module>()
          1 for i in range(33, 100):
          2     print(i)
    ----> 3     df_list.append(fc2df(sample(i)))
          4     print(i)


    <ipython-input-2-3c38214d1753> in fc2df(fc)
         16
         17     # Features is a list of dict with the output
    ---> 18     features = fc.getInfo()['features']
         19
         20     dictarr = []


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/collection.pyc in getInfo(self)
        125            properties.
        126     """
    --> 127     return super(Collection, self).getInfo()
        128
        129   def limit(self, maximum, opt_property=None, opt_ascending=None):


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/computedobject.pyc in getInfo(self)
         93       The object can evaluate to anything.
         94     """
    ---> 95     return data.getValue({'json': self.serialize()})
         96
         97   def encode(self, encoder):


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/data.pyc in getValue(params)
        253   """
        254   params['json_format'] = 'v2'
    --> 255   return send_('/value', params)
        256
        257


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/data.pyc in send_(path, params, opt_method, opt_raw)
        781       raise ee_exception.EEException('Invalid JSON: %s' % content)
        782     if 'error' in json_content:
    --> 783       raise ee_exception.EEException(json_content['error']['message'])
        784     if 'data' not in content:
        785       raise ee_exception.EEException('Malformed response: ' + str(content))


    EEException: Too many requests to Fusion Tables.



```python
import pickle

with open('df_list.pickle', 'wb') as f:
    pickle.dump(df_list, f)
```


```python
import pickle

with open('df_list.pickle') as f:
    loaded_obj = pickle.load(f)
```


```python
df_list = loaded_obj
```


```python
len(df_list)
```




    33




```python
for i in range(33, 100):
    print(i)
    df_list.append(fc2df(sample(i)))
    print(i)
```

    33
    33
    34
    34
    35
    35
    36
    36
    37
    37
    38





    EEExceptionTraceback (most recent call last)

    <ipython-input-10-b21a6c0c13a2> in <module>()
          1 for i in range(33, 100):
          2     print(i)
    ----> 3     df_list.append(fc2df(sample(i)))
          4     print(i)


    <ipython-input-9-3c38214d1753> in fc2df(fc)
         16
         17     # Features is a list of dict with the output
    ---> 18     features = fc.getInfo()['features']
         19
         20     dictarr = []


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/collection.pyc in getInfo(self)
        125            properties.
        126     """
    --> 127     return super(Collection, self).getInfo()
        128
        129   def limit(self, maximum, opt_property=None, opt_ascending=None):


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/computedobject.pyc in getInfo(self)
         93       The object can evaluate to anything.
         94     """
    ---> 95     return data.getValue({'json': self.serialize()})
         96
         97   def encode(self, encoder):


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/data.pyc in getValue(params)
        253   """
        254   params['json_format'] = 'v2'
    --> 255   return send_('/value', params)
        256
        257


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/data.pyc in send_(path, params, opt_method, opt_raw)
        781       raise ee_exception.EEException('Invalid JSON: %s' % content)
        782     if 'error' in json_content:
    --> 783       raise ee_exception.EEException(json_content['error']['message'])
        784     if 'data' not in content:
        785       raise ee_exception.EEException('Malformed response: ' + str(content))


    EEException: Too many requests to Fusion Tables.



```python
len(df_list)
```




    38




```python
for i in range(len(df_list), 100):
    print(i)
    df_list.append(fc2df(sample(i)))
    print(i)
```

    43
    43
    44
    44
    45
    45
    46





    EEExceptionTraceback (most recent call last)

    <ipython-input-15-abd9bc6ed5c5> in <module>()
          1 for i in range(len(df_list), 100):
          2     print(i)
    ----> 3     df_list.append(fc2df(sample(i)))
          4     print(i)


    <ipython-input-9-3c38214d1753> in fc2df(fc)
         16
         17     # Features is a list of dict with the output
    ---> 18     features = fc.getInfo()['features']
         19
         20     dictarr = []


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/collection.pyc in getInfo(self)
        125            properties.
        126     """
    --> 127     return super(Collection, self).getInfo()
        128
        129   def limit(self, maximum, opt_property=None, opt_ascending=None):


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/computedobject.pyc in getInfo(self)
         93       The object can evaluate to anything.
         94     """
    ---> 95     return data.getValue({'json': self.serialize()})
         96
         97   def encode(self, encoder):


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/data.pyc in getValue(params)
        253   """
        254   params['json_format'] = 'v2'
    --> 255   return send_('/value', params)
        256
        257


    /home/andrew/miniconda2/lib/python2.7/site-packages/ee/data.pyc in send_(path, params, opt_method, opt_raw)
        781       raise ee_exception.EEException('Invalid JSON: %s' % content)
        782     if 'error' in json_content:
    --> 783       raise ee_exception.EEException(json_content['error']['message'])
        784     if 'data' not in content:
        785       raise ee_exception.EEException('Malformed response: ' + str(content))


    EEException: Too many requests to Fusion Tables.



```python
#this downloads data, and waits for google when it needs to
import time

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

    46 started
    46 complete!
    47 started
    47 complete!
    48 started
    48 complete!
    49 started
    49 complete!
    50 started
    50 complete!
    51 started
    51 complete!
    52 started
    52 complete!
    53 started
    53 complete!
    54 started
    54 complete!
    55 started
    55 complete!
    56 started
    56 complete!
    57 started
    57 complete!
    58 started
    58 complete!
    59 started
    Exception, saving progress
    Waiting
    95 complete!
    96 started
    96 complete!
    97 started
    97 complete!
    98 started
    98 complete!
    99 started
    99 complete!



```python
len(df_list)
```




    100




```python
import pandas as pd
import numpy as np
import statsmodels.formula.api as sm

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

                                OLS Regression Results                            
    ==============================================================================
    Dep. Variable:               lossyear   R-squared:                       0.000
    Model:                            OLS   Adj. R-squared:                  0.000
    Method:                 Least Squares   F-statistic:                     8.333
    Date:                Wed, 20 Sep 2017   Prob (F-statistic):           1.47e-20
    Time:                        00:21:51   Log-Likelihood:             4.8956e+05
    No. Observations:              299730   AIC:                        -9.791e+05
    Df Residuals:                  299713   BIC:                        -9.789e+05
    Df Model:                          16                                         
    Covariance Type:            nonrobust                                         
    =================================================================================
                        coef    std err          t      P>|t|      [0.025      0.975]
    ---------------------------------------------------------------------------------
    C(year)[-7.0]     0.0005      0.000      1.092      0.275      -0.000       0.001
    C(year)[-6.0]     0.0014      0.000      3.916      0.000       0.001       0.002
    C(year)[-5.0]     0.0011      0.000      3.148      0.002       0.000       0.002
    C(year)[-4.0]     0.0026      0.000      7.724      0.000       0.002       0.003
    C(year)[-3.0]     0.0022      0.000      5.844      0.000       0.001       0.003
    C(year)[-2.0]     0.0022      0.000      6.535      0.000       0.002       0.003
    C(year)[-1.0]     0.0028      0.000      7.414      0.000       0.002       0.003
    C(year)[0.0]      0.0028      0.000      8.141      0.000       0.002       0.003
    C(year)[1.0]      0.0040      0.000     11.740      0.000       0.003       0.005
    C(year)[2.0]      0.0025      0.000      7.454      0.000       0.002       0.003
    C(year)[3.0]      0.0026      0.000      7.486      0.000       0.002       0.003
    C(year)[4.0]      0.0018      0.000      5.437      0.000       0.001       0.003
    C(year)[5.0]      0.0030      0.000      8.787      0.000       0.002       0.004
    C(year)[6.0]      0.0025      0.000      7.351      0.000       0.002       0.003
    C(year)[7.0]     -0.0002      0.000     -0.630      0.529      -0.001       0.000
    precip        -5.626e-08   6.03e-08     -0.933      0.351   -1.74e-07    6.19e-08
    precip2        3.928e-11   1.98e-11      1.980      0.048    4.06e-13    7.82e-11
    ==============================================================================
    Omnibus:                   664180.405   Durbin-Watson:                   2.005
    Prob(Omnibus):                  0.000   Jarque-Bera (JB):       2454264283.831
    Skew:                          21.050   Prob(JB):                         0.00
    Kurtosis:                     444.300   Cond. No.                     3.39e+07
    ==============================================================================

    Warnings:
    [1] Standard Errors assume that the covariance matrix of the errors is correctly specified.
    [2] The condition number is large, 3.39e+07. This might indicate that there are
    strong multicollinearity or other numerical problems.



```python
%matplotlib inline

from scipy import stats, integrate
import matplotlib.pyplot as plt
import seaborn as sns
sns.set(color_codes=True)

sns.distplot(df['precip'])
```




    <matplotlib.axes._subplots.AxesSubplot at 0x7f5540b75610>




![png](Earth%20Engine%20Econometrics%20v2_files/Earth%20Engine%20Econometrics%20v2_28_1.png)



```python
sns.distplot(df['rain_bin'])
```




    <matplotlib.axes._subplots.AxesSubplot at 0x7f9f5b690650>




![png](Earth%20Engine%20Econometrics%20v2_files/Earth%20Engine%20Econometrics%20v2_29_1.png)



```python
precip_sd = np.sqrt(np.var(df['precip']))
precip_min = np.min(df['precip'])
precip_max = np.max(df['precip'])

# define bins
bins = [precip_min, -2*precip_sd, -precip_sd, 0, precip_sd, 2*precip_sd, precip_max]

# generate a variable designating bins
df['rain_bin'] = np.digitize(df.precip, bins)

#df = pd.concat([df, pd.get_dummies(df['rain_bin'])])

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



```python

```
