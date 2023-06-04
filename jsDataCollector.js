const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path')
const os = require('os');
const cluster = require('cluster')


const { MongoClient } = require('mongodb');

// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'trip';

// Collection Name
const collectionName = 'trip';

// Create a new MongoClient
const client = new MongoClient(url);

// Connect to the MongoDB server
client.connect(function (err) {
  if (err) {
    console.error('Failed to connect to the MongoDB server:', err);
    return;
  }

  console.log('Connected successfully to the MongoDB server');

  // Select the database
  const db = client.db(dbName);

  // Select the collection
  const collection = db.collection(collectionName);

  // Generate random user details
  const user = {
    name: 'John Doe',
    age: Math.floor(Math.random() * 100),
    email: 'johndoe@example.com'
  };

  // Insert the new user document
  collection.insertOne(user, function (err, result) {
    if (err) {
      console.error('Error occurred while adding a new user:', err);
      return;
    }

    console.log('New user added successfully:', result.ops);

    // Close the client connection
    client.close();
  });
});


// Get all of the files that we want to open.

// When we have that list we can easily split
// it into 8, one for each cpu core.

// Then within each of these parallel processes
// we will have asynchronous file reads.

// So run a process on each core, then get all
// of those files in the list for each process
// and use a map function to create a list of promises.
// each of those asynchronous operations will await
// the file read so now we have them all occurring
// simultaneously and we await all of the promises

// After that is done, our maps are filled with the
// data, and then we just write them to json files.


const folderPath = "D:\Hotels";
const fileExtension = '.html';

function getFilePaths(folderPath, fileExtension) {
  return new Promise((resolve, reject) => {
    fs.readdir(folderPath, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      const filePaths = files
        .filter((filename) => filename.endsWith(fileExtension))
        .map((filename) => path.join(folderPath, filename));

      resolve(filePaths);
    });
  });
}

async function getAllFiles() {
  const allFiles = [];

  try {
    const filePaths = await getFilePaths(folderPath, fileExtension);
    for (const file of filePaths) {
      allFiles.push(file);
    }

    // console.log(allFiles);
  } catch (err) {
    console.error(err);
  }
}

// Call the async function to get all files
getAllFiles();