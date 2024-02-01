
const express = require("express");
const app = express();
const { Pool } = require("pg");
const { sendEmail } = require('./sendEmailError.js');
const {sendEmailLimit} = require('./sendEmail_ApiLimit');
//const { sendEmailadj } = require("./sendemailadj.js");
    
const { S3Client, GetObjectCommand ,HeadObjectCommand} = require('@aws-sdk/client-s3');
const { Readable } = require('stream');
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { log } = require('console');




// Replace these values with your PostgreSQL connection details
    const dbConfig = {
    user: "tcgs_ap",
    host: "geoserver.quantasip.com",
    database: "qg_verse",
    password: "FwC&bc$2#tj4%#ZQ",
    port: 5432, // Default PostgreSQL port
    };

    const pool = new Pool(dbConfig);
    


// Configure AWS SDK v3 with your credentials
const s3Client = new S3Client({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: 'AKIAVH33EZCROLN6FKW6',
    secretAccessKey: 'lOq1s3e4JdSMjOU0jvM4ZN0G2FY6sny+HY7sNj/X',
  },
});





// Configure AWS SDK v3 with your credentials


// Specify the bucket to list objects from
const bucketName = 'mymaharashtra'; // Replace with your bucket name

// Perform a basic operation (list objects) to check the connection
async function checkS3Connection() {
  const params = {
    Bucket: bucketName,
  };

  try {
    const data = await s3Client.send(new ListObjectsV2Command(params));
    console.log('Successfully connected to S3. Objects in the bucket:');
  } catch (error) {
    console.error('Error connecting to S3:', error);
  }
}

// Call the function to check the connection
checkS3Connection();




async function checkLgdCodeKhasraNoExist(lgd_code, khasra_no) {
  try {
    //console.time('checkup all');
   // console.log("iside chekc ");
    const result = await pool.query(`
      SELECT
        (SELECT 1 FROM "Maharashtra"."Akola" WHERE lgd_code ILIKE $1 LIMIT 1) AS lgd_code_exists,
        (SELECT 1 FROM "Maharashtra"."Akola" WHERE khasra_no ILIKE $2 LIMIT 1) AS khasra_no_exists
    `, [lgd_code, khasra_no]);

    //console.timeEnd('checkup all');
    console.log(result.rows[0]);

    const { lgd_code_exists, khasra_no_exists } = result.rows[0];
    //console.log("k " + khasra_no_exists);
    return {
      lgdCodeExists: lgd_code_exists,
      khasraNoExists: khasra_no_exists
    };
  } catch (error) {
    console.error('Error checking states:', error);
    return {
      lgdCodeExists: false,
      khasraNoExists: false
    };
  }
}


app.get('/download', async (req, res) => {
   console.log(req.query);
   const {saltKey, state, district, lgd_code, khasra_no}  = req.query;
   


   if (!state || !district || !lgd_code || !khasra_no || !saltKey) {
return res.status(400).json({ message: "Invalid request, missing field." });
}
   

// Check salt key
if (!(saltKey == "EgNIgHpqbW3ja1EgWrsPC1c4FQgJukYs9jhlswdC" )) {
  return res.status(401).json({ message: "Incorrect or missing salt key: Unauthorized Access" });
  }


  if (state.toUpperCase() !== "Maharashtra".toUpperCase()  ) {    
  return res.status(400).json({ message: `Wrong state : ${state}` });
}

if (district.toUpperCase() !== "Akola".toUpperCase()  ) {    
  return res.status(400).json({ message: `Wrong district : ${district}` });
}
    


const {lgdCodeExists , khasraNoExists} = await  checkLgdCodeKhasraNoExist(lgd_code,khasra_no);

//console.log(lgdCodeExists+" code "+khasraNoExists );
if (!lgdCodeExists) {    
  console.log("lgd ahe");
  return res.status(400).json({ message: `Wrong lgd Code : ${lgd_code}` });
}

if (!khasraNoExists) {    
  return res.status(400).json({ message: `Wrong khasra No : ${khasra_no}` });
}
 
//console.log("Done checking");



    
    


    // Specify the bucket and key (path) of the file on S3
    

    const folderName = lgd_code;  // Assuming 'Akola' is a fixed folder
    const fileNumber = khasra_no; 
    const pdfFilePath = `Akola/${folderName}/${fileNumber}.pdf`;
    const zipFilePath = `Akola/${folderName}/${fileNumber}.zip`;



    
    //console.log("Inside"+folderName);
    //console.log("Inside"+fileNumber);

    // Specify the bucket and key (path) of the file on S3
    const pdfParams = {
      Bucket: 'mymaharashtra',
      Key: pdfFilePath,
  };

  const zipParams = {
    Bucket: 'mymaharashtra',
    Key: zipFilePath,
};

   

try {
  // Check if the PDF file exists
  await s3Client.send(new HeadObjectCommand(pdfParams));

  // Set response headers for PDF file download
  res.setHeader('Content-disposition', `attachment; filename=${fileNumber}.pdf`);
  res.setHeader('Content-type', 'application/pdf');

  // Download the PDF file from S3
  const pdfData = await s3Client.send(new GetObjectCommand(pdfParams));
  const pdfReadable = Readable.from(pdfData.Body);
  pdfReadable.pipe(res);
} catch (pdfError) {
  // If PDF file doesn't exist, check for ZIP file
  try {
    const data = await s3Client.send(new GetObjectCommand(zipParams));

    // Set response headers for file download
    res.setHeader('Content-disposition', `attachment; filename=${fileNumber}.zip`);
    res.setHeader('Content-type', 'application/zip');

    // Send the file data as the response
    const readable = Readable.from(data.Body);
    readable.pipe(res);
  } catch (error) {
    console.error('Error downloading file from S3:', error);
    return res.status(500).send('Internal Server Error');
  }
}
});


    
  



    
//counter for each saly key
const CounterMap = new Map();
CounterMap.set("c4f1e08a2b5d1e3f8d9a0b6c3e2d5a1", 0);
CounterMap.set("EgNIgHpqbW3ja1EgWrsPC1c4FQgJukYs9jhlswdC",0);


function apiCounter(saltKey,lgd_code,khasra_no){
if(CounterMap.get(saltKey) <= 250000 ){
    CounterMap.set(saltKey,(CounterMap.get(saltKey))+1);
 //   updateLogEntry(saltKey,lgd_code,khasra_no)
    console.log(CounterMap);
    return true;
}else{

(async () => {
  // Your code with 'await' goes here
  await sendEmailLimit(saltKey);
})();

// return res.status(402).json({ message: "Trial ended..." });
return false;
}   
}



async function updateLogEntry(saltKey, lgd_code, khasra_no) {
try {

console.log("updateed query");
const query = `
    INSERT INTO log2 (Salt_key, lgd_code, khasra_no, date_str)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP);
    
`;

const values = [saltKey, lgd_code, khasra_no];

const result = await pool.query(query, values);

//console.log(`Rows affected: ${result.rowCount}`);
} catch (error) {
console.error('Error updating log entry:', error);
}
}




// Example usage




//counter for each saly key


pool.connect((err, client, release) => {
if (err) {
console.error("Error connecting to the database:", err);
} else {
console.log("Connected to the database.");
client.query("SELECT NOW()", (err, result) => {
  release();
  if (err) {
    console.error("Error running query:", err);
  } else {
    console.log("Current timestamp:", result.rows[0].now);
  }
});
}
});

async function calculateDistance(gid1, gid2) {
const client = await pool.connect();
try {
const query = {
  text: `
    SELECT ST_Distance(
      (SELECT geom FROM public."D7_Points" WHERE g_id = $1),
      (SELECT geom FROM public."D7_Points" WHERE g_id = $2)
    ) as distance;
  `,
  values: [gid1, gid2],
};

const result = await client.query(query);
const distance = result.rows[0].distance;
return distance;
} catch (error) {
console.error("Error calculating distance:", error);
return null;
} finally {
client.release();
}
}

app.get("/calculateDistance", async (req, res) => {
const { saltKey, gid1, gid2 } = req.query;
try {
if (saltKey === "c4f1e08a2b5d1e3f8d9a0b6c3e2d5a1") {
  const distance = await calculateDistance(gid1, gid2);
  if (distance === null) {
    res.status(404).send("Error calculating distance");
    return;
  }
  res.json({ distance });
} else {
  res.json({ message: "Unauthorized Access" });
}
} catch (error) {
console.error("Error calculating distance:", error);
res.status(500).send("Internal Server Error");
}
});


app.get("/specificData", async (req, res) => {
const { saltKey, state, district, lgd_code, khasra_no } = req.query;

// Check for missing or incorrect saltKey
if (!saltKey || saltKey !== "EgNIgHpqbW3ja1EgWrsPC1c4FQgJukYs9jhlswdC") {
res.status(401).json({ message: "Unauthorized: Incorrect or missing saltKey" });
return;
}

// Check for missing or incorrect parameters
if (!state || !district || !lgd_code || !khasra_no) {
res.status(400).json({ message: "Bad Request: Missing or incorrect parameters" });
return;
}

try {
// Query to check if khasra number exists
const khasraQuery = await pool.query(
  `SELECT khasra_no FROM ${district} WHERE district = $1 AND khasra_no = $2 AND lgd_code = $3`,
  [district, khasra_no, lgd_code]
);

if (khasraQuery.rows.length === 0) {
  res.status(400).json({ message: `Missing khasra number: ${khasra_no}` });
  return;
}

// Query to fetch data with the specified fields
const queryResult = await pool.query(
  `
  SELECT
    ST_AsGeoJSON(geom) AS geometry,
    state,
    district,
    tehsil,
    village,
    khasra_no,
    area_ac
  FROM ${district}
  WHERE
    state = $1 AND
    district = $2 AND
    lgd_code = $3 AND
    khasra_no = $4
  LIMIT 1
`,
  [state, district, lgd_code, khasra_no]
);

if (queryResult.rows.length === 0) {
  // Check for invalid LGD code
  res.status(400).json({ message: "Invalid state: LGD code does not match" });
  return;
}

// Check for missing fields
const missingFields = ["geometry", "state", "district", "tehsil", "village", "khasra_no", "area_ac"]
  .filter(field => !queryResult.rows[0][field]);

if (missingFields.length > 0) {
  res.status(400).json({ message: `Missing fields, empty response for ${missingFields}` });
  return;
}

// Transform the result into GeoJSON format
const features = queryResult.rows.map((row) => {
  return {
    type: "Feature",
    geometry: JSON.parse(row.geometry),
    properties: {
      State: row.state,
      District: row.district,
      Tehsil: row.tehsil,
      Village: row.village,
      Khasra_No: row.khasra_no,
      Area_ac: row.area_ac,
    },
  };
});

const geoJsonResponse = {
  type: "FeatureCollection",
  features: features,
};

  apiCounter(saltKey);    //counter
res.json(geoJsonResponse);
} catch (error) {
if (error.code === "42P01") {
  res.status(404).json({ message: "Check the district name" });
} else {
  console.error("Error executing query", error);
  res.status(500).json({ message: "Internal Server Error" });
}
}
});

let b = 0 ;
let bb = 0;
// Query to get ogc_fid from global_india_khasra


app.get("/adjData", async (req, res) => {

const { saltKey, district,village, lgd_code, khasra_no } =
req.query;

// console.log(req.query);
// console.log(state+" after");
if ( !village || !lgd_code || !khasra_no || !saltKey || !district) {
return res.status(400).json({ message: "Invalid request, missing field.1" });
}

//check salt key
if ( !(saltKey == "EgNIgHpqbW3ja1EgWrsPC1c4FQgJukYs9jhlswdC" || saltKey == "c4f1e08a2b5d1e3f8d9a0b6c3e2d5a1") ) {
return res.status(401).json({ message: "Incorrect or missing salt key: UnAuthorized Acess" });
}

//check salt key
console.log("in adjdata");


//Check State ,district ,tehsil and lgd_code in master_data
try {
// Check State, District, Tehsil, Village, and LGD Code existence
console.time("l v ");
const {lgdCodeExists, villageExists } = await checkStatesExist1(lgd_code, village);
console.timeEnd("l v ");


b =  lgdCodeExists || villageExists;
// Check if any of the required entities do not exist
const rajasthanDistricts = [
    "AJMER", "ALWAR", "BANSWARA", "BARAN", "BARMER", "BHARATPUR", "BHILWARA", "BIKANER",
    "BUNDI", "CHITTORGARH", "CHURU", "DAUSA", "DHOLPUR", "DUNGARPUR", "HANUMANGARH",
    "JAIPUR", "JAISALMER", "JALORE", "JHALAWAR", "JHUNJHUNU", "JODHPUR", "KARAULI", "KOTA",
    "NAGAUR", "PALI", "PRATAPGARH", "RAJSAMAND", "SAWAI MADHOPUR", "SIKAR", "SIROHI", "TONK", "UDAIPUR"
  ];


if (!rajasthanDistricts.includes(district.toUpperCase())) {
    await sendEmail(saltKey, district,lgd_code, khasra_no);
  return res.status(400).json({ message: `Wrong district: ${district}` });
}




if (!villageExists) {
  await sendEmail(saltKey, district,lgd_code, khasra_no);
    return res.status(400).json({ message: `Wrong village: ${village}` });
  }


  if(!lgdCodeExists){
    await sendEmail(saltKey, district,lgd_code, khasra_no);

   return res.status(400).json({ message: `Wrong lgd_code: ${lgd_code}` });
  }  





} catch (error) {
console.error('Error checking existence:', error);
// await sendEmail(saltKey, district,village, lgd_code, khasra_no);
return res.status(500).json({ message: 'Internal Server Error' });
}






try {
        console.time("id");

          console.log("id checking");
          const tableName = district;
          const queryResult = await pool.query(
            `
                SELECT
                id
                FROM ${tableName}
                WHERE
                
                TRIM(lgd_code) = $1 AND
                TRIM(khasra_no) = $2
                LIMIT 1;

          `,
            [lgd_code ,khasra_no]
          );
            console.timeEnd("id");

          console.log(queryResult.rows[0]); 

            if (queryResult.rows.length == 0) {
                console.log("id is not there in DB");
                await sendEmail(saltKey, district,lgd_code, khasra_no);
              return res.status(400).json({ message: "Khasra not found",khasra_no }); ;
            }



  console.log(queryResult.rows[0].id); 
  const id = queryResult.rows[0].id;
  
  // Now use id in the second query
  console.time("cent");
  const customQueryResult = await pool.query(
    `
      SELECT a.khasra_no, ST_AsText(ST_GeomFromWKB(ST_Centroid(a.geom)))
      FROM ${tableName} AS a
      JOIN ${tableName} AS b ON ST_Intersects(ST_Buffer(a.geom, 0.002), b.geom)
      WHERE b.id =$1 AND a.id != $1
      AND a.lgd_code = $2; ;
`,
    [id,lgd_code]
  );

  console.timeEnd("cent")

  
 
  if (customQueryResult.rows[0].length == 0) {
    await sendEmail(saltKey, district,lgd_code, khasra_no);
    return res.status(404).json({ message: "No neighbouring polygons" });
  }

  // apiCounter(saltKey); 
  // updateLogEntry(saltKey,lgd_code,khasra_no)   // counter
   // Process the result as needed
   try {
    if (apiCounter(saltKey, lgd_code, khasra_no)) {
      
      updateLogEntry(saltKey,lgd_code,khasra_no)
      
      
      return res.json(customQueryResult.rows);
    } else {
      
      return res.status(400).json({ message: 'Access denied! Limit reached.' });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: 'API access limit exceeded' });
  }



 

} catch (error) {
   console.error("Error executing queries", error);

  // await sendEmail(saltKey, district,village, lgd_code, khasra_no);
  return res.status(500).send("Internal Server Error");

}
});


async function checkStatesExist1(lgd_code, village) {
  try {
    //console.time('checkup all');
    
    const result = await pool.query(`
      SELECT
     
        (SELECT 1 FROM master_data WHERE lgd_code ILIKE $1 limit 1) as lgd_code_exists,
        (SELECT 1 FROM master_data WHERE village ILIKE $2 limit 1) as village_exists
    `, [lgd_code, village]);

    //console.timeEnd('checkup all');
    
    const {lgd_code_exists, village_exists } = result.rows[0];

    return {
    
      lgdCodeExists: lgd_code_exists,
      villageExists: village_exists
    };
  } catch (error) {
    console.error('Error checking states:', error);
    return {
     
      lgdCodeExists: false,
      villageExists: false
    };
  }
}

async function checkStatesExist(tehsil, lgd_code, village) {
  try {
    //console.time('checkup all');
    
    const result = await pool.query(`
      SELECT
        (SELECT 1 FROM master_data WHERE tehsil ILIKE $1 limit 1) as tehsil_exists,
        (SELECT 1 FROM master_data WHERE lgd_code ILIKE $2 limit 1) as lgd_code_exists,
        (SELECT 1 FROM master_data WHERE village ILIKE $3 limit 1) as village_exists
    `, [tehsil, lgd_code, village]);

    //console.timeEnd('checkup all');
    
    const { tehsil_exists, lgd_code_exists, village_exists } = result.rows[0];

    return {
      tehsilExists: tehsil_exists,
      lgdCodeExists: lgd_code_exists,
      villageExists: village_exists
    };
  } catch (error) {
    console.error('Error checking states:', error);
    return {
      tehsilExists: false,
      lgdCodeExists: false,
      villageExists: false
    };
  }
}



let a = 0;

app.get("/getData", async (req, res) => {
const { saltKey, state, district, tehsil, village, lgd_code, khasra_no } = req.query;

// Check for missing fields
if (!state || !district || !tehsil || !village || !lgd_code || !khasra_no || !saltKey) {
return res.status(400).json({ message: "Invalid request, missing field." });
}

// Check salt key
if (!(saltKey === "EgNIgHpqbW3ja1EgWrsPC1c4FQgJukYs9jhlswdC" || saltKey === "c4f1e08a2b5d1e3f8d9a0b6c3e2d5a1")) {
return res.status(401).json({ message: "Incorrect or missing salt key: Unauthorized Access" });
}



try {
// Check State, District, Tehsil, Village, and LGD Code existence
//console.time('checkupall ');

const { tehsilExists, lgdCodeExists, villageExists } = await checkStatesExist(tehsil, lgd_code, village);
// const [tehsilExists, lgdCodeExists, villageExists] = await Promise.all([
  
  
//   checkStateExists2(tehsil),
//   checkStateExists3(lgd_code),
//   checkStateExists4(village),
// ]);
//console.timeEnd('checkupall ');

// Check if any of the required entities do not exist
if (state.toUpperCase() !== "Rajasthan".toUpperCase()  ) {
    await sendEmail(saltKey, district,lgd_code, khasra_no);
  return res.status(400).json({ message: `Wrong state: ${state}` });
}

const rajasthanDistricts = [
    "AJMER", "ALWAR", "BANSWARA", "BARAN", "BARMER", "BHARATPUR", "BHILWARA", "BIKANER",
    "BUNDI", "CHITTORGARH", "CHURU", "DAUSA", "DHOLPUR", "DUNGARPUR", "HANUMANGARH",
    "JAIPUR", "JAISALMER", "JALORE", "JHALAWAR", "JHUNJHUNU", "JODHPUR", "KARAULI", "KOTA",
    "NAGAUR", "PALI", "PRATAPGARH", "RAJSAMAND", "SAWAI MADHOPUR", "SIKAR", "SIROHI", "TONK", "UDAIPUR"
  ];


if (!rajasthanDistricts.includes(district.toUpperCase())) {
    await sendEmail(saltKey, district,lgd_code, khasra_no);
  return res.status(400).json({ message: `Wrong district: ${district}` });
}
if (!tehsilExists) {
    await sendEmail(saltKey, district,lgd_code, khasra_no);
  return res.status(400).json({ message: `Wrong tehsil: ${tehsil}` });
}
if (!lgdCodeExists) {
    await sendEmail(saltKey, district,lgd_code, khasra_no);
  return res.status(400).json({ message: `Wrong lgd_code: ${lgd_code}` });
}
if (!villageExists) {
    await sendEmail(saltKey, district,lgd_code, khasra_no);
  return res.status(400).json({ message: `Wrong village: ${village}` });
}
} catch (error) {
console.error('Error checking existence:', error);
return res.status(500).json({ message: 'Internal Server Error' });
}



try {
// Execute the main query
const tableName = district;
//let t2 = performance.now()


const trimmedLgdCode = lgd_code.trim();
const trimmedKhasraNo = khasra_no.trim();

 const queryResult = await pool.query(
      `
      SELECT
      ST_AsGeoJSON(geom) AS geometry,
      khasra_no,
      area_ac
    FROM ${tableName}
    WHERE
    
      TRIM(lgd_code) = $1 AND
      TRIM(khasra_no) = $2
    LIMIT 1;
      `,
      [trimmedLgdCode, trimmedKhasraNo]
     // [state, district, tehsil, village, lgd_code, khasra_no]
    );

//let t1 = performance.now()
//console.log("checkup op "+(t1-t2)/1000);

if (queryResult.rows.length === 0) {
    await sendEmail(saltKey, district,lgd_code, khasra_no);
  return res.status(400).json({ message: `Wrong khasra_no : ${khasra_no}` });
}

if (!queryResult.rows[0].geometry) {
    await sendEmail(saltKey, district,lgd_code, khasra_no);
  return res.status(404).json({ message: "Field Geometry not found" });
}

if (!queryResult.rows[0].area_ac) {
    await sendEmail(saltKey, district,lgd_code, khasra_no);
  return res.status(404).json({ message: "Field area_ac not found" });
}

console.log(queryResult.rows[0]);


const features = queryResult.rows.map((row) => {
  
    x = JSON.parse(row.geometry)
  
    x.coordinates =  x.coordinates[0][0];

    return {
    type: "Feature",
    geometry: x,
    properties: {
      fid: row.fid,
      objectid: row.objectid,
      State: state.charAt(0).toUpperCase() + state.slice(1).toLowerCase(),
      District: district.charAt(0).toUpperCase() + district.slice(1).toLowerCase(),
      Tehsil: tehsil.charAt(0).toUpperCase() + tehsil.slice(1).toLowerCase(),
      Village: village.charAt(0).toUpperCase() + village.slice(1).toLowerCase(),
      Khasra_No: row.khasra_no,
      Area_ac: row.area_ac,
      Shape_Leng: row.shape_leng,
      Shape_Area: row.shape_area,
      path: row.path,
      layer: row.layer,
      new_area_a: row.new_area_a,
    },
  };
});

const geoJsonResponse = {
  type: "FeatureCollection",
  features: features,
};

// Check API limit

  if (apiCounter(saltKey, lgd_code, khasra_no)) {
    updateLogEntry(saltKey,lgd_code,khasra_no)
    res.status(200).json(geoJsonResponse);
  } else {
    res.status(400).json({ message: 'Access denied! Limit reached.' });
  }



} catch (error) {
console.error('Error executing query:', error);
res.status(500).json({ message: 'Internal Server Error' });
}
});




//my code 



app.listen(6000, () => {
console.log("Server is running on port 6000");
});
