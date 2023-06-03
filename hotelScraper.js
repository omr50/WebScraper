const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path')
const cluster = require('cluster')
const os = require('os')

console.log("cpus", os.cpus().length)
const url = 'https://www.tripadvisor.com/Hotels';
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

let regions = [];

axios.get(url, headers)
  .then((response) => {
    const html = response.data;
    const $ = cheerio.load(html);

    // Get the div with the ID 'taplc_popular_hotels_0'
    const targetDiv = $('#taplc_popular_hotels_0');

    // Get all 'a' tags with the class 'ui_link' inside the targetDiv
    const uiLinks = targetDiv.find('a.ui_link');

    // Process the 'a' tags
    uiLinks.each((index, element) => {
      let region = $(element).attr('href');
      const href = 'https://www.tripadvisor.com' + region;
      regions.push(href);
  
      splitUrl = region.split('-')
      for (let i = 1; i < 7; i++){
          let newUrl = splitUrl[0] + '-' + splitUrl[1] + '-oa' + 30*i + '-' + splitUrl[2] + '-' + splitUrl[3]
          hotel_url = 'https://www.tripadvisor.com' + newUrl
          regions.push(hotel_url)
      }
      
    });

    // for each url, break it apart and then reconstruct to get the new ones.

    console.log("total regions:", regions.length)

    // for each of these regions, go into each href.
    scrapeUrls();
  })
  .catch((error) => {
    console.error('Error occurred:', error);
  });




async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeUrls() {
  let hotelsInEachRegion = [];
    try {
        // Create an array of promises for requests
        const requestPromises = regions.map(async (url) => {
        await delay(50);
        try {
        const response = await axios.get(url, headers);
        const html = response.data;
        
        const $ = cheerio.load(html);
        // Select all div elements with class 'listing_title'
        const listingDivs = $('div.listing_title');

        // Iterate over each div and extract the href value of the child 'a' tag
        listingDivs.each((index, element) => {
        const href = $(element).find('a').attr('href');
        hotelsInEachRegion.push('https://www.tripadvisor.com' + href)
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

        const batchSize = 200; // Change the batch size if needed
        const splitArray = [];
        for (let i = 0; i < Math.ceil(hotelsInEachRegion.length / batchSize); i++) {
          splitArray.push(hotelsInEachRegion.slice(i * batchSize, (i + 1) * batchSize));
        }
        console.log("Number of Hotels:", hotelsInEachRegion.length)
        let currBatch = 0
        for (const batchUrls of splitArray){
          const batchUrlsCopy = [...batchUrls];
          const requestHTML = batchUrlsCopy.map(async (url) => {
              await delay(5);
              for (let retry = 0; retry < 3; retry++) {
              try {
              const response = await axios.get(url, headers);
              const html = response.data;
              return html;
              } catch (error) {
                  if (error.code === 'ECONNRESET') {
                      const response = await axios.get(url, headers);
                      const html = response.data;
                      return html;
                  }
              }
          }
          });
      
          const htmlResponses = await Promise.all(requestHTML);
          console.log("we got the responses")
          
          // Create an array of promises for file writes
        const writePromises = htmlResponses.map(async (html, index) => {
          const filename = path.join('D:\out2', `file${currBatch*200 + index}.html`);
          try {
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
        });
    
        // Wait for all file writes to complete
          await Promise.all(writePromises);
          currBatch++;
          console.log("wrote this batch.")
        }
        console.log('All files written successfully.');
    }catch (error) {
        // Handle the specific error (ECONNRESET in this case)
        console.error('Error occurred:', error);
  }
}


