const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path')

const url = 'https://www.tripadvisor.com/Hotels';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36',
  };
  

let urls = [];

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
      urls.push(href);
  
      splitUrl = region.split('-')
      for (let i = 1; i < 7; i++){
          let newUrl = splitUrl[0] + '-' + splitUrl[1] + '-oa' + 30*i + '-' + splitUrl[2] + '-' + splitUrl[3]
          console.log(newUrl)
          hotel_url = 'https://www.tripadvisor.com' + newUrl
          urls.push(hotel_url)
      }
      
    });

    // for each url, break it apart and then reconstruct to get the new ones.

    console.log("total URLS:", urls.length)

    console.log('a')
    scrapeUrls();
    console.log('b')
  })
  .catch((error) => {
    console.error('Error occurred:', error);
  });


  async function scrapeUrls() {

    const numArrays = Math.ceil(urls.length / 7) + 1
    let arrays = [[],[],[],[],[],[],[]]
    for (let i = 0; i < 8; i++){
        let seventh = 0;
        for (let url of urls){
            arrays[seventh].push(url)
            seventh++;
            if (seventh == 7)
                seventh = 0;
        }
    }
    try {
      // Create an array of promises for requests
      console.log(arrays)
      for (urls of arrays){
        const requestPromises = urls.map(async (url) => {
        let html = null;
        let success = false;
        const maxRetries = 3; // Maximum number of retries
        let retryCount = 0; // Counter for retries
        while (retryCount < maxRetries && !success) {
          try {
            await delay(100);
            const response = await axios.get(url, headers);
            html = response.data;
            success = true; // Request succeeded, exit the loop
          } catch (error) {
            // console.error(`Request failed. Retry attempt ${retryCount + 1}`);
            retryCount++;
          }
        }
  
        if (!success) {
          console.error(`Max retries reached for URL: ${url}`);
        }
  
        return html;
      });

      const htmlResponses = await Promise.all(requestPromises);

      // Wait for all requests to complete and get the HTML responses
  
      console.log("we got the responses")
      console.log(htmlResponses)
      // Create an array of promises for file writes
      const writePromises = htmlResponses.map(async (html, index) => {
      const filename = path.join(__dirname, 'out', `file${index}.html`);
      await fs.promises.writeFile(filename, html);
      console.log(`File ${filename} written successfully.`);
      });
  
      // Wait for all file writes to complete
      await Promise.all(writePromises);
    }
  
  
      console.log('All files written successfully.');
    } catch (error) {
      console.error('Error occurred:', error);
    }
  }
  




// const axios = require('axios')
// const cheerio = require('cheerio')

// const url = 'https://www.tripadvisor.com/Hotels'
// headers = {
//     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
// }

// let urls = []
// axios.get(url, headers)
//   .then((response) => {
//     const html = response.data;
//     const $ = cheerio.load(html);

//     // Get the div with the ID 'taplc_popular_hotels_0'
//     const targetDiv = $('#taplc_popular_hotels_0');

//     // Get all 'a' tags with the class 'ui_link' inside the targetDiv
//     const uiLinks = targetDiv.find('a.ui_link');

//     // Process the 'a' tags
//     uiLinks.each((index, element) => {
//       const href = 'https://www.tripadvisor.com' + $(element).attr('href');
//       urls.push(href)
//     });
//   })
//   .catch((error) => {
//     console.error('Error occurred:', error);
//   });

// let allHotelUrl = []

// async function scrapeUrls() {
//     try {
//       // Make requests in parallel using Promise.all
//       const requests = urls.map(async (url) => {
//         const response = await axios.get(url, headers);
//         return response.data;
//       });
//       const htmlResponses = await Promise.all(requests);
//       console.log('a', htmlResponses)
//       // Write responses to files asynchronously
//       const writeOperations = htmlResponses.map(async (html, index) => {
//         const filename = `file${index}.html`;
//         console.log(html)
//         await fs.promises.writeFile(filename, html);
//         console.log(`File ${filename} written successfully.`);
//       });
//       console.log('b', writeOperations)
//       await Promise.all(writeOperations);
  
//       console.log('All files written successfully.');
//     } catch (error) {
//       console.error('Error occurred:', error);
//     }
//   }
  
// scrapeUrls();


