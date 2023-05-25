import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor
import time
import json
# Adding headers to the request, specifically the 'User-Agent' header
# because the url performs a user agent detection or require specific
# headers for access. This prevents getting stuck in infinite loop.
counter = [0]

# 10 threads:

# 1st: 16.6 seconds
# 2nd: 14.48 seconds
# 3rd 17.01 seconds


# 20 threads:

# 1st: 13.4 seconds
# 2nd: 15 seconds
# 3rd : 13.0 seconds
allRequests = []


def getHotelsInRegion(regions):
    # can increase the workers once I start scraping other
    # categories.
    with ThreadPoolExecutor(max_workers=100) as executor:
        for region in regions:
            executor.submit(getHotel, region)


def getHotel(region):
    region_text = region.text
    print(region_text)
    # For each hotel region (cali, florida, etc.) we will
    # make a request to that url and get the names of the
    # hotels on the first page.
    counter[0] += 1
    hotel_url = 'https://www.tripadvisor.com' + region.get('href')
    dataMap[region_text] = {}
    addOneHotel(hotel_url, region_text)


def addOneHotel(hotel_url, region):
    start_time = time.time()
    response = requests.get(hotel_url, headers=headers)
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
        dataMap[region][hotelName] = {}
        review_url = 'https://www.tripadvisor.com' + hotelHref
        dataMap[region][hotelName]['reviews'] = {}
        scrapeReview(region, hotelName, review_url)


def scrapeReview(region, hotelName, review_url):
    response = requests.get(review_url, headers=headers)
    soup = BeautifulSoup(response.content, 'lxml')
    # this containes entire review
    reviews = soup.find_all('div', class_='YibKl')
    user = ''

    # extract user from review
    for review in reviews:
        user = review.find('a', class_='ui_header_link').get('href')[9:]
    # extract review itself
        dataMap[region][hotelName]['reviews'][user] = review.find(
            'span', class_='QewHA').find('span', recursive=False).text


url = 'https://www.tripadvisor.com/Hotels'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
}
print('Scraping ' + url)

dataMap = {}
start_time = time.time()
response = requests.get(url, headers=headers)
allRequests.append(time.time()-start_time)

# Send a GET request to the URL
# Parse the HTML content using BeautifulSoup
soup = BeautifulSoup(response.content, 'lxml')
# Find all div elements with class 'geo_wrap'
regionsOuter = soup.find("div", {"id": "taplc_popular_hotels_0"})
# this contains li tags with class ui_link
regions = regionsOuter.find_all('a', class_='ui_link')
start_time = time.time()
getHotelsInRegion(regions)
elapsed_time = time.time() - start_time

print(f"Elapsed time: {elapsed_time} seconds")

print("total Items", counter[0])
print('average GET request took:', sum(allRequests)/len(allRequests), 's')

# after this step, load data from the map to the file

json_data = json.dumps(dataMap, indent=4)

# Save JSON data to a file
with open('hotels.json', 'w') as file:
    file.write(json_data)


# have to add in that selenium to expand review (read more)
