import requests
from requests.exceptions import RequestException
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor
import time
import json
import os
counter = [0]

allRequests = []


def make_request(url, headers):
    max_retries = 3
    retry_delay_ms = 100

    for retry in range(max_retries):
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()  # Raise an exception for 4xx or 5xx status codes
            return response
        except RequestException as e:
            if retry < max_retries - 1:
                print("Retrying...")
                # Convert milliseconds to seconds
                time.sleep(retry_delay_ms / 1000)


def getHotelsInRegionHTML(regions):
    # can increase the workers once I start scraping other
    # categories.
    for region in regions:
        executor.submit(getHotelHTML, region)


def getHotelHTML(region):
    region_text = region.text
    print(region_text)
    # For each hotel region (cali, florida, etc.) we will
    # make a request to that url and get the names of the
    # hotels on the first page.
    counter[0] += 1

    hotel_url = 'https://www.tripadvisor.com' + region.get('href')
    addOneHotelHTML(hotel_url, region_text)

    splitUrl = region.get('href').split('-')
    for i in range(1, 7):
        newUrl = splitUrl[0] + '-' + splitUrl[1] + '-oa' + \
            str(30*i) + '-' + splitUrl[2] + '-' + splitUrl[3]
        hotel_url = 'https://www.tripadvisor.com' + newUrl
        addOneHotelHTML(hotel_url, region_text)
        # the pattern is like this:

        # https://www.tripadvisor.com/Hotels-g60898-Atlanta_Georgia-Hotels.html

        # 30 on each page

        # https://www.tripadvisor.com/Hotels-g60898-oa30-Atlanta_Georgia-Hotels.html

        # so we have to seperate the the part with Hotels-g60898 from the rest of it

        # we can split the string on and dashes. Then reconstruct it but add in the page we
        # want.


def addOneHotelHTML(hotel_url, region):
    start_time = time.time()
    response = make_request(hotel_url, headers=headers)
    allRequests.append(time.time()-start_time)
    soup = BeautifulSoup(response.content, 'lxml')
    property_titles = soup.find_all('div', class_='listing_title')
    # turning hotel names into a set using comprehensions
    # because there are repeats some times. Also got the
    # link so that I can get reviews later.
    hotelNames = {(title.a.text, title.a.get('href'))
                  for title in property_titles}
    for hotelName, hotelHref in hotelNames:
        counter[0] += 1
        review_url = 'https://www.tripadvisor.com' + hotelHref
        response = make_request(review_url, headers=headers)
        if response.status_code == 200:
            html_content = response.content
            # Generate a unique file name
            region = region.replace(
                " ", "_").replace(".", "").replace("'", "_")
            hotelName = hotelName.replace(
                " ", "_").replace(".", "").replace("'", "_")
            file_name = f"{region}_{hotelName}.html"
            file_path = os.path.join(r"D:\out", file_name)
            with open(file_path, 'wb') as file:  # Use 'wb' mode for writing binary data
                file.write(html_content)


url = 'https://www.tripadvisor.com/Hotels'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
}
print('Scraping ' + url)

start_time = time.time()
response = make_request(url, headers=headers)
allRequests.append(time.time()-start_time)

# Send a GET request to the URL
# Parse the HTML content using BeautifulSoup
soup = BeautifulSoup(response.content, 'lxml')
# Find all div elements with class 'geo_wrap'
regionsOuter = soup.find("div", {"id": "taplc_popular_hotels_0"})
# this contains li tags with class ui_link
regions = regionsOuter.find_all('a', class_='ui_link')

executor = ThreadPoolExecutor(max_workers=100)

start_time = time.time()
getHotelsInRegionHTML(regions)
elapsed_time = time.time() - start_time

executor.shutdown()

print(f"Elapsed time: {elapsed_time} seconds")

print("total Items", counter[0])
print('average GET request took:', sum(allRequests)/len(allRequests), 's')


# we also need selenium to expand the reviews.

# now that we are instead collecting all of the html files
# on disk then processing them later, we need to have a better
# understanding of async. Not only is async required for the
# http requests, but can also be useful when we are saving
# the files since that is a blocking operation as well.

# MUTLI PROCESSING

# multi processing can be done here with the pages of the hotels

# Each process can have a particular scrape.
