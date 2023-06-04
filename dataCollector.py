# this is a lot slower than javascript
# since there is a lot of io, I'll do
# it with js since async there is a lot
# smoother and easier to use than asyncio in
# python. Also split them with multiprocessing
# and work simultaneously on 8 cpu cores.
# Use cheerio for the parsing as well.
# should be much faster. (100x maybe)
import requests
from requests.exceptions import RequestException
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor
import time
import concurrent.futures
import json
import os
from bson import ObjectId

hotels, reviewsMap, users = {}, {}, {}


def scrape_file(file, index):
    with open(file_path, 'r', encoding='utf-8') as file:
        contents = file.read()
        # object to parse the html
        soup = BeautifulSoup(contents, 'html.parser')

        # each hotelneeds to have its own map with k-v pairs
        hotelDoc = {}
        # hotel id
        hotelID = str(ObjectId())
        # get the hotel name
        name = soup.find("h1", {"id": "HEADING"}).text
        # some region data
        region_data = [location.text for location in soup.findAll(
            "li", {'class': 'breadcrumb'})]
        # address
        address = soup.find("span", {"class": "biGQs"}).text

        # reviews (create a review document, then just put its object id to the hotel and user doc)
        # --Also check if user exists, if not then create unique, otherwise use the object id
        # --and add another review id to their user.
        # hotel photo links
        reviews = soup.findAll("div", {"class": "YibKl"})
        # create a list to hold all of the hotel reviews object ids
        # then just add it to the hotel review id list
        hotelReviews = []
        for review in reviews:
            # create a review document
            # add in all details but first
            # we need to focus on creating
            # or finding user.
            reviewDoc = {}
            reviewID = str(ObjectId())
            hotelReviews.append(reviewID)
            # 1. start with user. Check if they exist. If not, then create an object id for them

            userATag = review.find("a", {"class": "uyyBf"})
            username = userATag.get('href')[9:]
            alias = userATag.text
            userID = users[username]["id"] if (
                username in users) else str(ObjectId())
            # create user if they didn't already exist
            if username not in users:
                user = {}
                user["id"] = userID
                user["name"] = username
                user["password"] = 'password'
                user["alias"] = alias
                imageTag = soup.find(
                    'a', {'class': 'ui_social_avatar'}).find("img")
                user["image"] = imageTag['src'] if 'src' in imageTag else ''
                locationTag = review.find(
                    'span', class_='LXUOn')
                user["location"] = locationTag.text if locationTag else ''
                user["reviews"] = [reviewID]
                # save the created user document to the map
                users[username] = user
            # if the user already exists, then append the new review id
            else:
                users[username]["reviews"].append(reviewID)

            # 2. User object id will be used in the review document
            reviewDoc["id"] = reviewID
            reviewDoc["hotelID"] = hotelID
            reviewDoc["userID"] = userID
            # gets rating out of 50
            reviewDoc["rating"] = review.find(
                "span", {'class': 'ui_bubble_rating'}).get('class')[1][-2:]
            reviewDoc["title"] = review.find(
                "a", {"class": "Qwuub"}).find('span').text
            reviewDoc["text"] = review.find(
                "span", {"class": "QewHA"}).text
            # Add review document to the reviews map
            # 3. Create a review document, and it contains the user object id.
            reviewsMap[reviewID] = reviewDoc

            # 6. Hotel will store the object id of the review in its hotel reviews array.

        # so a review document is always created, but a user document can be created if
        # they don't already exist. But if they do or don't exist their review array is
        # always adjusted. We push onto it another review Object Id. Then the hotel also
        # pushes the review object id to its reviews list.

        photoListElements = soup.findAll("li", {"class": "CEZFh"})
        pictures = []
        for photo in photoListElements:
            sourceTag = photo.find("source")
            if sourceTag:
                pictures.append(sourceTag['srcset'][:-3])
            if len(pictures) == 5:
                break
        # price range
        price_range = soup.find("div", {"class": "IhqAp"}).text

        hotelDoc["region"] = region_data
        hotelDoc["name"] = name
        hotelDoc["hotelID"] = hotelID
        hotelDoc['address'] = address
        hotelDoc["reviews"] = hotelReviews
        hotelDoc["images"] = pictures
        hotelDoc["price_range"] = price_range

        # save the hotel doc to the hotel map

        hotels[name] = hotelDoc
        print(index)


folder_path = "D:\Hotels"

filePaths = []

for filename in os.listdir(folder_path):
    if filename.endswith('.html'):
        file_path = os.path.join(folder_path, filename)
        filePaths.append(file_path)
startTime = time.time()
for index, file_path in enumerate(filePaths):
    scrape_file(file_path, index)
    break

json_str1 = json.dumps(hotels)
json_str2 = json.dumps(reviewsMap)
json_str3 = json.dumps(users)

file_path1 = 'hotels.json'
file_path2 = 'reviews.json'
file_path3 = 'users.json'

# Write the JSON strings to separate files
with open(file_path1, 'w', encoding='utf-8') as file1:
    file1.write(json_str1)

with open(file_path2, 'w', encoding='utf-8') as file2:
    file2.write(json_str2)

with open(file_path3, 'w', encoding='utf-8') as file3:
    file3.write(json_str3)

print("Total Time:", time.time() - startTime)
