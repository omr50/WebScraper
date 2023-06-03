// Scrape restaurants from Trip Advisor. This will go through all major
// regions (urls array below) and then it will go through the countries/cities/states
// in those regions and then to the top 210 restaurants in those regions and scrape
// them. Uses asynchronous programming to speed up the process.



const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path')
const os = require('os');
const cluster = require('cluster')

// restaurant regions.
const urls = ["https://www.tripadvisor.com/Restaurants-g191-United_States.html",
              "https://www.tripadvisor.com/Restaurants-g2-Asia.html",
              "https://www.tripadvisor.com/Restaurants-g6-Africa.html",
              "https://www.tripadvisor.com/Restaurants-g13-South_America.html",
              "https://www.tripadvisor.com/Restaurants-g255055-Australia.html",
              "https://www.tripadvisor.com/Restaurants-g4-Europe.html",
              "https://www.tripadvisor.com/Restaurants-g150768-Mexico.html",
              "https://www.tripadvisor.com/Restaurants-g153339-Canada.html"]
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};





async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getBatches() {
      try {
          let RestaurantsInEachRegion = [];
          // Create an array of promises for requests
          const requestPromises = urls.map(async (url) => {
            await delay(50);
            try {
            const response = await axios.get(url, headers);
            const html = response.data;
            
            const $ = cheerio.load(html);
            // Select all div elements with class 'geo_image'
            
            const listingDivs = $('div.geo_image');
    
            // Iterate over each div and extract the href value of the child 'a' tag
            listingDivs.each((index, element) => {
            const href = $(element).find('a').attr('href');
            
            let restaurant = 'https://www.tripadvisor.com' + href;
            splitUrl = restaurant.split('-')
            RestaurantsInEachRegion.push([restaurant, splitUrl[2].substring(0, splitUrl[2].length-4)])
            for (let i = 1; i < 7; i++){
                splitUrl = restaurant.split('-')
                let newUrl = splitUrl[0] + '-' + splitUrl[1] + '-oa' + 30*i + '-' + splitUrl[2]
                hotel_url = newUrl
                RestaurantsInEachRegion.push([hotel_url, splitUrl[2].substring(0, splitUrl[2].length-4)])
            }
            return true;
            })
            } catch (error) {
                if (error.code === 'ECONNRESET') {
                    console.error('ECONNRESET error occurred for URL:', url);
                } 
            }
            });
        
            // Wait for all requests to complete and get the HTML responses
            await Promise.all(requestPromises);
            console.log("total:", RestaurantsInEachRegion.length)
            const numCPUs = os.cpus().length;
            const batchSize = Math.ceil(RestaurantsInEachRegion.length / numCPUs); // Change the batch size if needed
            const splitArray = [];
            console.log(batchSize, RestaurantsInEachRegion.length/batchSize)
            for (let i = 0; i < Math.ceil(RestaurantsInEachRegion.length / batchSize); i++) {
              splitArray.push(RestaurantsInEachRegion.slice(i * batchSize, (i + 1) * batchSize));
            }
            return splitArray;
          } catch (e) {
            console.log(e)
          }
}
async function scrapeUrls(batchUrls, currBatch) {
    try {
      let batchSize = 40;
      let batches = [];
            for (let i = 0; i < batchUrls.length; i += batchSize) {
              const batch = batchUrls.slice(i, i + batchSize);
              batches.push(batch);
            }
            for (batch of batches){
              const requestHTML = batch.map(async (urlArray) => {
              let url = urlArray[0]
              let urlName = urlArray[1]
              await delay(50);
              try {
              const response = await axios.get(url, headers);
              const html = response.data;
              return [html, urlName];
              } catch (error) {
                return [null, null]
              }
          });
      
          const htmlResponses = await Promise.all(requestHTML);
          // console.log("we got the responses")
          
          // Create an array of promises for file writes
        const writePromises = htmlResponses.map(async (htmlArray, index) => {
          if (htmlArray[0]){
          let html = htmlArray[0]
          let name = htmlArray[1]
          const filename = path.join('D:\Restaurants', `${currBatch*8 + index}${name}.html`);
          try {
            if (html)
              await fs.promises.writeFile(filename, html);
          } catch (error) {
            console.error(`Error writing file ${index}:`, error);
          } finally {
            // Close the file descriptor if needed
            // (Not necessary in this case, but included for completeness)
            if (fs.promises.close) {
              try {
                await fs.promises.close();
              } catch (error) {
                console.error(`Error closing file ${index}:`, error);
              }
            }
          }
        }
        });
    
        // Wait for all file writes to complete
          await Promise.all(writePromises);
          currBatch++;
          // console.log("wrote this batch.")
        console.log('All files written successfully.');
      }
    }catch (error) {
        // Handle the specific error (ECONNRESET in this case)
        console.error('Error occurred:', error);
  }
}



if (cluster.isMaster) {
  getBatches().then((splitArray) => {
    console.log("got batches")
    // Fork worker processes
    currBatch = 1;
    console.log(splitArray.length)
    for (const batchUrls of splitArray) {
      const worker = cluster.fork();
      worker.send([batchUrls, currBatch]);
      currBatch++;
    }
  }).catch((error) => {
    console.error('Error occurred while getting batches:', error);
  });

  // Handle messages from worker processes
  cluster.on('message', (worker, message) => {
    console.log(`Worker ${worker.process.pid} finished processing.`);
    // Handle any further processing or synchronization logic
    // ...
  });

  // Handle worker exit events
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} exited.`);
  });
} else {
  process.on('message', async (items) => {
    let batchUrls = items[0]
    let currBatch = items[1]
    await scrapeUrls(batchUrls, currBatch);
    process.send('finished');
    process.exit();
  });
}

