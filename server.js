
const express = require("express");
const app = express();
const { Pool } = require("pg");
const { sendEmail } = require('./sendEmailError.js');
const {sendEmailLimit} = require('./sendEmail_ApiLimit');

// Replace these values with your PostgreSQL connection details
const dbConfig = {
  user: "tcgs_ap",
  host: "geoserver.quantasip.com",
  database: "qg_verse",
  password: "FwC&bc$2#tj4%#ZQ",
  port: 5432, // Default PostgreSQL port
};



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

    return res.status(402).json({ message: "Trial ended..." });
    return false;
  }   
}

async function updateLogEntry(saltKey, lgd_code, khasra_no) {
  try {


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

const pool = new Pool(dbConfig);


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
 
  const { saltKey, state, district, tehsil, village, lgd_code, khasra_no } =
  req.query;

  // console.log(req.query);
  // console.log(state+" after");
  if (!state || !district || !tehsil || !village || !lgd_code || !khasra_no || !saltKey) {
    return res.status(400).json({ message: "Invalid request, missing field." });
  }

  //check salt key
if ( !(saltKey == "EgNIgHpqbW3ja1EgWrsPC1c4FQgJukYs9jhlswdC" || saltKey == "c4f1e08a2b5d1e3f8d9a0b6c3e2d5a1") ) {
  return res.status(401).json({ message: "Incorrect or missing salt key: UnAuthorized Acess" });
}

   //check salt key
  

//Check State ,district ,tehsil and lgd_code in master_data
try {
  // Check State, District, Tehsil, Village, and LGD Code existence
  const [stateExists, districtExists, tehsilExists, lgdCodeExists, villageExists] = await Promise.all([
    checkStateExists(state),
    checkStateExists1(district),
    checkStateExists2(tehsil),
    checkStateExists3(lgd_code),
    checkStateExists4(village),
  ]);


  b = stateExists && districtExists && tehsilExists && lgdCodeExists && villageExists;
  // Check if any of the required entities do not exist
  if (!stateExists) {
    await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
    return res.status(400).json({ message: `Wrong state: ${state}` });
  }
  if (!districtExists) {
    await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
    return res.status(400).json({ message: `Wrong district: ${district}` });
  }
  if (!tehsilExists) {
    await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
    return res.status(400).json({ message: `Wrong tehsil: ${tehsil}` });
  }
  if (!lgdCodeExists) {
    await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
    return res.status(400).json({ message: `Wrong lgd_code: ${lgd_code}` });
  }
  if (!villageExists) {
    await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
    return res.status(400).json({ message: `Wrong village: ${village}` });
  }
} catch (error) {
  console.error('Error checking existence:', error);
  return res.status(500).json({ message: 'Internal Server Error' });
}


try{


  if (b) {
    const tableName = district;
    const queryResult = await pool.query(
      `
                  SELECT
            ST_AsGeoJSON(geom) AS geometry,
            state,
            district,
            tehsil,
            village,
            lgd_code,
            khasra_no,
            area_ac
          FROM ${tableName}
          WHERE
            TRIM(UPPER(state)) ILIKE TRIM(UPPER($1)) AND
            TRIM(UPPER(district)) ILIKE TRIM(UPPER($2)) AND
            TRIM(UPPER(tehsil)) ILIKE TRIM(UPPER($3)) AND
            TRIM(UPPER(village)) ILIKE TRIM(UPPER($4)) AND
            TRIM(lgd_code) = $5 AND
            TRIM(khasra_no) = $6
          LIMIT 1;

    `,
      [state, district, tehsil, village, lgd_code, khasra_no]
    );


  // console.log(queryResult.rows[0]); 


    if (queryResult.rows.length == 0) {

      await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);

      return res.status(404).json({ message: "Khasara not found" });
      
    }
    console.log("Khasra" + (queryResult.rows.length > 0) );
  bb = queryResult.rows.length;
}

}catch(error){
  console.log(" Above  4 param not getting in DB"+ error);
}



  try {
    if (bb) {

      console.log("id checking");
      const tableName = district;
      const queryResult = await pool.query(
        `
      SELECT id
      FROM ${tableName}
      WHERE
        state = $1 AND
        district = $2 AND
        tehsil = $3 AND
        village = $4 AND
        lgd_code = $5 AND
        khasra_no = $6
      LIMIT 1
    `,
        [state, district, tehsil, village, lgd_code, khasra_no]
      );

    
      if (queryResult.rows.length === 0) {
          console.log();("id not found");
        return;
      }
      console.log(queryResult.rows[0].id); 
      const id = queryResult.rows[0].id;

      // Now use id in the second query
      const customQueryResult = await pool.query(
        `
      SELECT a.khasra_no, ST_AsText(ST_GeomFromWKB(ST_Centroid(a.geom)))
      FROM ${tableName} AS a
      JOIN ${tableName} AS b ON ST_Intersects(ST_Buffer(a.geom, 0.002), b.geom)
      WHERE b.id =$1 AND a.id != $1;
    `,
        [id]
      );
      if (customQueryResult.rows[0].length === 0) {
        await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
        return res.status(400).json({ message: "No neighbouring polygons" });
      }

      // apiCounter(saltKey); 
      // updateLogEntry(saltKey,lgd_code,khasra_no)   // counter
       // Process the result as needed
       try {
        if (apiCounter(saltKey, lgd_code, khasra_no)) {
          updateLogEntry(saltKey,lgd_code,khasra_no)
          return res.json(customQueryResult.rows);
        } else {
          return res.status(403).json({ message: 'Access denied! Limit reached.' });
        }
      } catch (error) {
        console.log(error);
        return res.status(429).json({ message: 'API access limit exceeded' });
      }



     
    } else {
      return res.json({ message: "Unauthorised Access" });
    }
  } catch (error) {
       console.error("Error executing queries", error);

      await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
      return res.status(500).send("Internal Server Error");
    
  }
});



async function checkStateExists(state) {
  const client = await pool.connect();
 
  try {
    // Acquire a client from the pool
    

    // Execute a query to check if the state exists
    const result = await client.query(`SELECT 1 FROM  master_data WHERE state ILIKE $1`, [state]);
      console.log(result.rows.length);
    // Release the client back to the pool
    client.release();
    

    // Return true if rows are found, indicating the state exists
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking state:', error);
    return false;
  }
}
async function checkStateExists2(tehsil) {

  const client = await pool.connect();
  
        try {
          // Acquire a client from the pool
          
        ;
            console.log("before tajsgil");
          // Execute a query to check if the state exists
          const result = await client.query(`SELECT 1 FROM  master_data WHERE tehsil ILIKE $1`, [tehsil]);
            console.log(result.rows.length);
          // Release the client back to the pool
          client.release();
          

          // Return true if rows are found, indicating the state exists
          return result.rows.length > 0;
        } catch (error) {
          console.error('Error checking tehsil:', error);
          return false;
        }
      }
async function checkStateExists3(lgd_code) {
  const client = await pool.connect()
    try {
      // Acquire a client from the pool
      
    
      console.log("before lgd");
      // Execute a query to check if the state exists
      const result = await client.query(`SELECT 1 FROM  master_data WHERE lgd_code ILIKE $1`, [lgd_code]);
        console.log(result.rows.length);
      // Release the client back to the pool
      client.release();
      
    
      // Return true if rows are found, indicating the state exists
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking lgd_code:', error);
      return false;
    }
}

async function checkStateExists1(district) {
  const client = await pool.connect()
  try {
    // Acquire a client from the pool
    
  ;

    // Execute a query to check if the state exists
    const result = await client.query(`SELECT 1 FROM  master_data WHERE district ILIKE $1`, [district]);
      console.log(result.rows.length);
    // Release the client back to the pool
    client.release();
    

    // Return true if rows are found, indicating the state exists
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking lgd_code:', error);
    return false;
  }
}
async function checkStateExists4(village) {
  const client = await pool.connect()
  try {
    // Acquire a client from the pool
    
   
    // Execute a query to check if the state exists
    const result = await client.query(`SELECT 1 FROM  master_data WHERE village ILIKE $1`, [village]);
      console.log(result.rows.length);
    // Release the client back to the pool
    client.release();
    
    if( result.rows.length == 0){
      res.status(400).json({ message: `wrong ${village} name` }); 
    }
     
    // Return true if rows are found, indicating the state exists
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking lgd_code:', error);
    return false;
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
    const [stateExists, districtExists, tehsilExists, lgdCodeExists, villageExists] = await Promise.all([
      checkStateExists(state),
      checkStateExists1(district),
      checkStateExists2(tehsil),
      checkStateExists3(lgd_code),
      checkStateExists4(village),
    ]);

    // Check if any of the required entities do not exist
    if (!stateExists) {
      await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
      return res.status(400).json({ message: `Wrong state: ${state}` });
    }
    if (!districtExists) {
      await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
      return res.status(400).json({ message: `Wrong district: ${district}` });
    }
    if (!tehsilExists) {
      await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
      return res.status(400).json({ message: `Wrong tehsil: ${tehsil}` });
    }
    if (!lgdCodeExists) {
      await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
      return res.status(400).json({ message: `Wrong lgd_code: ${lgd_code}` });
    }
    if (!villageExists) {
      await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
      return res.status(400).json({ message: `Wrong village: ${village}` });
    }
  } catch (error) {
    console.error('Error checking existence:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }

  try {
    // Execute the main query
    const tableName = district;
    const queryResult = await pool.query(
      `
      SELECT
        ST_AsGeoJSON(geom) AS geometry,
        state,
        district,
        tehsil,
        village,
        lgd_code,
        khasra_no,
        area_ac
      FROM ${tableName}
      WHERE
        TRIM(UPPER(state)) ILIKE TRIM(UPPER($1)) AND
        TRIM(UPPER(district)) ILIKE TRIM(UPPER($2)) AND
        TRIM(UPPER(tehsil)) ILIKE TRIM(UPPER($3)) AND
        TRIM(UPPER(village)) ILIKE TRIM(UPPER($4)) AND
        TRIM(lgd_code) = $5 AND
        TRIM(khasra_no) = $6
      LIMIT 1;
      `,
      [state, district, tehsil, village, lgd_code, khasra_no]
    );

    if (queryResult.rows.length === 0) {
      await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
      return res.status(404).json({ message: "Khasara_no not found" });
    }

    if (!queryResult.rows[0].geometry) {
      await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
      return res.status(404).json({ message: "Field Geometry not found" });
    }

    if (!queryResult.rows[0].area_ac) {
      await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
      return res.status(404).json({ message: "Field area_ac not found" });
    }

    const features = queryResult.rows.map((row) => {
      return {
        type: "Feature",
        geometry: JSON.parse(row.geometry),
        properties: {
          fid: row.fid,
          objectid: row.objectid,
          State: row.state,
          District: row.district,
          Tehsil: row.tehsil,
          Village: row.village,
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
        res.status(403).json({ message: 'Access denied! Limit reached.' });
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
