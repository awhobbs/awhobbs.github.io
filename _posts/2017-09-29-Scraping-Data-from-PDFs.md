---
layout: post
title:  "Scraping Data from Many Big PDFs"
---

The [California Carbon Dashboard](http://calcarbondash.org/)'s data comes from PDFs downloaded from Intercontinental Exchange (ICE). Unfortunately, these PDFs are daily and are more than 2000 pages long. In order to get the data out of them in a reasonable amount of time, we needed to figure out a way of quickly identifying the right pages and pulling tables from them. I figured I'd document this here, as I think it might be useful to someone else's research.

The basic steps are:
1. Start with a good guess for where the useful data is. I found it in the first PDF, and then the script saves updates a record of where it found the first page each day. The page changes over time, but rarely moves far in a single day, so this saves a lot of time searching.
2. If the script doesn't find a relevant page where yesterday's began, it jumps forward 3 pages, back 6, then forward 9, etc. Since the data we are looking for is always about 5 pages long, we will never fail to find it this way. Further, by jumping a bit further, we again save a lot of time.
3. Since all the pages we want are always sequential, and are also the only pages with 'California' in the title, we start moving forward from the first useful page we find. Once we reach the last useful page, we move backward from the first useful one we found. This ensures we get the whole series in the minimum amount of time.
4. We then record the page where the data started to start tomorrow's search.

This simple-yet-pretty-hacky algorithm dramatically reduced the time it takes to extract the data. The `tabula-py` pulls tables from PDFS beautifully, but due to general messiness of PDFS we had to write a few more lines of code to clean it up. In the end, we replaced our old 800+ line scraper script with one that is only a few dozen lines and dramatically faster. The code is below - I hope that this can saves others some time when trying to pull tables from PDFs, especially large ones.

```python
import tabula
import pandas as pd
import os
import pickle
import logging

logging.basicConfig(filename='./log/parser.log',level=logging.DEBUG)

def get_data(file, page):
    logging.info("Starting " + str(file) +  " on page " + str(page))
    df = pd.DataFrame()
    start_page = page
    price_data = pd.DataFrame()
    found_data = False
    last_page_was_useful = False
    timeout = False
    jump = 1
    jump_sign = 1
    # a ridiculously large number
    last_page = 10e1000
    direction = 1
    useless_pages = set()
    harvested_pages = set()

    def useful(df):
        try:
            result = max(df.iloc[:,0].str.contains('California'))
        except Exception:
            logging.info("Page " + str(page) + " seems to be blank.")
            result = False
        return result

    while not timeout and (last_page_was_useful or not found_data):
        try:
            df = tabula.read_pdf(file, pages = page, silent = True)
        except Exception:
            logging.info("ERROR! " + str(page) + " returned an empty dataframe")

        # Check if the page contains the word "California" in the first column
        # (which is how it interprets the big gray bar)
        if useful(df):
            last_page_was_useful = True

            # This stuff happens on the first useful page we find
            if not found_data:
                # record that we found the data!
                found_data = True
                # check if this is the earliest useful page
                # if it was, go backward
                if page < last_page:
                    direction = -1
            # add this page to the list of pages we've harvested
            harvested_pages.add(page)
            # on every useful page, add the data to the set
            price_data = price_data.append(df)
            # record the page in the data because why not
            price_data['page'] = page
            logging.info("Extracted useful data from page " + str(page))
            # increment or decrement depending on how we found the page
            page += 1 * direction
        # This happens if the page was not useful
        else:
            useless_pages.add(page)
            #This stuff happens if we haven't found the data yet
            if not found_data:
                if jump < 1000:
                    page = page + jump
                    logging.info("Nothing to see here, jumping to page" + str(page))
                    jump_size = abs(jump) + 3
                    jump_sign *= -1
                    jump = jump_sign * jump_size
                else:
                    logging.warning("Can't find data! Try a new start page?")
                    timeout = True
	        # If we've found the data, but this page is not useful
            # we need to go back to wherever we started in the data
            else:
                # Check that pages right before and after
                # harvested pages are useless_pages
                if (min(harvested_pages) - 1) in useless_pages:
                    if (max(harvested_pages) + 1) in useless_pages:
                        logging.info("No useful data on page " + str(page) +
                                     ", that's it!")
                        last_page_was_useful = False
                    else:
                        logging.info("Checking the end...")
                        page = max(harvested_pages) + 1
                        direction = 1
                else:
                    logging.info("Checking the beginning...")
                    page = min(harvested_pages) - 1
                    direction = -1
        last_page = page

    logging.info("Done parsing " + str(file))
    try:
        start_page = min(harvested_pages)
    except Exception:
        logging.info("No pages harvested")

    return {'data': price_data, 'start_page': start_page, 'filename': file}

target_folder = './pdf'
archive_folder = './archive'

files = [f for f in os.listdir(target_folder) \
                    if os.path.isfile(os.path.join(target_folder, f)) \
                    and not f.startswith('.')]

try:
    with open('./log/start_page.pickle', 'rb') as f:
        start_page = pickle.load(f)
except:
    start_page = 2159

data = []

for file in sorted(files):
    result = get_data(target_folder + "/" + file, start_page)
    df = result['data']
    # start the next day on the starting page from today!
    start_page = result['start_page']
    with open('./log/start_page.pickle', 'wb') as f:
        pickle.dump(start_page, f)
    data.append(result)
    # save the thing in a pickle in case something happens
    with open('./data/datapickle.pickle', 'wb') as f:
        pickle.dump(data, f)
    # Move the file to the archive
    os.rename(target_folder + "/" + file, archive_folder + "/" + file)
```
