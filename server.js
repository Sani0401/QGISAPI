
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
  if(CounterMap.get(saltKey) < 250000 ){
        updatedCount = (CounterMap.get(saltKey))+1;

        CounterMap.set(saltKey,updatedCount);
      
        updateLogEntry(saltKey,lgd_code,khasra_no);
        console.log(CounterMap);
        return true;
  }else{

    (async () => {
      // Your code with 'await' goes here
      await sendEmailLimit(saltKey);
    })();

    res.status(402).json({ message: "Trial ended..." });
    
    
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


// app.get("/specificData", async (req, res) => {
//   const { saltKey, state, district, lgd_code, khasra_no } = req.query;

//   // Check for missing or incorrect saltKey
//   if (!saltKey || saltKey !== "EgNIgHpqbW3ja1EgWrsPC1c4FQgJukYs9jhlswdC") {
//     res.status(401).json({ message: "Unauthorized: Incorrect or missing saltKey" });
//     return;
//   }

//   // Check for missing or incorrect parameters
//   if (!state || !district || !lgd_code || !khasra_no) {
//     res.status(400).json({ message: "Bad Request: Missing or incorrect parameters" });
//     return;
//   }

//   try {
//     // Query to check if khasra number exists
//     const khasraQuery = await pool.query(
//       `SELECT khasra_no FROM ${district} WHERE district = $1 AND khasra_no = $2 AND lgd_code = $3`,
//       [district, khasra_no, lgd_code]
//     );

//     if (khasraQuery.rows.length === 0) {
//       res.status(400).json({ message: `Missing khasra number: ${khasra_no}` });
//       return;
//     }

//     // Query to fetch data with the specified fields
//     const queryResult = await pool.query(
//       `
//       SELECT
//         ST_AsGeoJSON(geom) AS geometry,
//         state,
//         district,
//         tehsil,
//         village,
//         khasra_no,
//         area_ac
//       FROM ${district}
//       WHERE
//         state = $1 AND
//         district = $2 AND
//         lgd_code = $3 AND
//         khasra_no = $4
//       LIMIT 1
//     `,
//       [state, district, lgd_code, khasra_no]
//     );

//     if (queryResult.rows.length === 0) {
//       // Check for invalid LGD code
//       res.status(400).json({ message: "Invalid state: LGD code does not match" });
//       return;
//     }

//     // Check for missing fields
//     const missingFields = ["geometry", "state", "district", "tehsil", "village", "khasra_no", "area_ac"]
//       .filter(field => !queryResult.rows[0][field]);

//     if (missingFields.length > 0) {
//       res.status(400).json({ message: `Missing fields, empty response for ${missingFields}` });
//       return;
//     }

//     // Transform the result into GeoJSON format
//     const features = queryResult.rows.map((row) => {
//       return {
//         type: "Feature",
//         geometry: JSON.parse(row.geometry),
//         properties: {
//           State: row.state,
//           District: row.district,
//           Tehsil: row.tehsil,
//           Village: row.village,
//           Khasra_No: row.khasra_no,
//           Area_ac: row.area_ac,
//         },
//       };
//     });

//     const geoJsonResponse = {
//       type: "FeatureCollection",
//       features: features,
//     };
    
//       apiCounter(saltKey);    //counter
//     res.json(geoJsonResponse);
//   } catch (error) {
//     if (error.code === "42P01") {
//       res.status(404).json({ message: "Data not" });
//     } else {
//       console.error("Error executing query", error);
//       res.status(500).json({ message: "Internal Server Error" });
    
//   }
// });


app.get("/adjData", async (req, res) => {
  const { saltKey, state, district, tehsil, village, lgd_code, khasra_no } =
    req.query;


    if (saltKey === null || saltKey != "c4f1e08a2b5d1e3f8d9a0b6c3e2d5a1") {

      await sendEmail(saltKey, state, district, tehsil, village, lgd_code, khasra_no);
      res.status(400).json({ message: "Incorrect or missing salt key: UnAuthorized Acess" });
    }

      if(!state){
        
        res.status(400).json({ message: "Invalid Request Missing Field State " });
      }

      if(!district){
        res.status(400).json({ message: "Invalid Request Missing Field State" });
      }

      if(!tehsil){
        res.status(400).json({ message: "Invalid Request Missing Field tehsil" });
      }

      if(!village){
        res.status(400).json({ message: "Invalid Request Missing Field village" });
      }

      if(!lgd_code){
        res.status(400).json({ message: "Invalid Request Missing Field lgd_code" });
      }

      if(!khasra_no){
        res.status(400).json({ message: "Invalid Request Missing Field khasra number" });
      }



  try {
    if (saltKey == "c4f1e08a2b5d1e3f8d9a0b6c3e2d5a1") {
      const tableName = district;
      const queryResult = await pool.query(
        `
      SELECT id
      FROM ${tableName}
      WHERE
      TRIM(UPPER(state)) ILIKE TRIM(UPPER($1)) AND
      TRIM(UPPER(district)) ILIKE TRIM(UPPER($2)) AND
      TRIM(UPPER(tehsil)) ILIKE TRIM(UPPER($3)) AND
      TRIM(UPPER(village)) ILIKE TRIM(UPPER($4)) AND
      TRIM(lgd_code) = $5 AND
      TRIM(khasra_no) = $6
      LIMIT 1
    `,
        [state, district, tehsil, village, lgd_code, khasra_no]
      );

      console.log(queryResult);
      if (!queryResult) {
        await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
        res.status(400).send("Data not found");
        return;
      }

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
        res.status(400).json({ message: "No neighbouring polygons" });
      }

      apiCounter(saltKey,lgd_code,khasra_no);    // counter
     
      res.json(customQueryResult.rows);
    } else {
      res.json({ message: "Unauthorised Access" });
    }
  } catch (error) {
    console.error("Error executing queries", error);

    await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
      res.status(400).json({ message: "Data not found" });
    
      res.status(500).send("Internal Server Error");
    
  }
});





// async function checkStateExists(state) {
  
 
//   try {
//     // Acquire a client from the pool
    
//     const client = await pool.connect();

//     // Execute a query to check if the state exists
//     const result = await client.query(`SELECT 1 FROM  master_data WHERE state = $1`, [state]);
//       console.log(result.rows.length);
//     // Release the client back to the pool
//     client.release();
    

//     // Return true if rows are found, indicating the state exists
//     return result.rows.length > 0;
//   } catch (error) {
//     console.error('Error checking state:', error);
//     return false;
//   }
// }
// async function checkStateExists1(tehsil) {

  
//   try {
//     // Acquire a client from the pool
    
//     const client = await pool.connect();

//     // Execute a query to check if the state exists
//     const result = await client.query(`SELECT 1 FROM  master_data WHERE tehsil = $1`, [tehsil]);
//       console.log(result.rows.length);
//     // Release the client back to the pool
//     client.release();
    

//     // Return true if rows are found, indicating the state exists
//     return result.rows.length > 0;
//   } catch (error) {
//     console.error('Error checking tehsil:', error);
//     return false;
//   }
// }
// async function checkStateExists2(lgd_code) {
 
//   try {
//     // Acquire a client from the pool
    
//     const client = await pool.connect();

//     // Execute a query to check if the state exists
//     const result = await client.query(`SELECT 1 FROM  master_data WHERE lgd_code = $1`, [lgd_code]);
//       console.log(result.rows.length);
//     // Release the client back to the pool
//     client.release();
    

//     // Return true if rows are found, indicating the state exists
//     return result.rows.length > 0;
//   } catch (error) {
//     console.error('Error checking lgd_code:', error);
//     return false;
//   }
// }

// async function checkStateExists4(district) {

//   try {
//     // Acquire a client from the pool
    
//     const client = await pool.connect();

//     // Execute a query to check if the state exists
//     const result = await client.query(`SELECT 1 FROM  master_data WHERE district = $1`, [district]);
//       console.log(result.rows.length);
//     // Release the client back to the pool
//     client.release();
    

//     // Return true if rows are found, indicating the state exists
//     return result.rows.length > 0;
//   } catch (error) {
//     console.error('Error checking lgd_code:', error);
//     return false;
//   }
// }






app.get("/getData", async (req, res) => {
  const { saltKey, state, district, tehsil, village, lgd_code, khasra_no } =
    req.query;

    // console.log(req.query);
    // console.log(state+" after");


    //check salt key
  if ( saltKey === null || !(saltKey == "EgNIgHpqbW3ja1EgWrsPC1c4FQgJukYs9jhlswdC" || saltKey == "c4f1e08a2b5d1e3f8d9a0b6c3e2d5a1") ) {
    await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
    res
      .status(400)
      .json({ message: "Incorrect or missing salt key: UnAuthorized Acess" });
  }


  //trim spaces 
  
// state = state.trim();
// district = district.trim();
// tehsil = tehsil.trim();
// village = village.trim();


  //check every attribute
  // if ( !saltKey || !state || !district || !tehsil || !village || !lgd_code || !khasra_no) {
  //   res.status(400).json({ message: "Invalid Request Missing Fields" });
  // }




  
  if(!state){
    res.status(400).json({ message: "Invalid Request Missing Field State " });
  }

  if(!district){
    res.status(400).json({ message: "Invalid Request Missing Field district" });
  }

  if(!tehsil){
    res.status(400).json({ message: "Invalid Request Missing Field tehsil" });
  }

  if(!village){
    res.status(400).json({ message: "Invalid Request Missing Field village" });
  }

  if(!lgd_code){
    res.status(400).json({ message: "Invalid Request Missing Field lgd_code" });
  }

  if(!khasra_no){
    res.status(400).json({ message: "Invalid Request Missing Field khasra number" });
  }


  //check khasra present or not
  // try {
  //   const query = await pool.query(
  //     `SELECT khasra_no FROM ${district} WHERE district = $1 AND khasra_no = $2 AND lgd_code = $3 `,
  //     [district, khasra_no, lgd_code]
  //   );
   
  //  // console.log(query);
    
  //   if (query.rows.length === 0) {
  //     res
  //       .status(400)
  //       .json({ message: `Missing kasra number ${district} ${khasra_no} ` });
  //   } else {
  //     console.log("This is khasra data", query.rows);
  //   }
  // } catch (error) {
  //   console.error("Error getting khasra", error);
  // }





//Check State ,district ,tehsil and lgd_code in master_data
//try{




// async function fun0() {
//   const stateExists = await checkStateExists(state);
//   let d = state;
//   if (!stateExists) {
//     console.log('Failure: State does not exist in the Database');
//     res.status(401).json({ message: `No matching record found ${d}` });
//   }
//   console.log("state "+stateExists);
//   // Make sure to close the pool if necessary
//   // pool.end();
// };


// //tehsil check 
// async function fun1() {
//   const stateExists = await checkStateExists1(tehsil);
//   let d = tehsil;
//   if (!stateExists) {
//     console.log('Failure: tahshil does not exist in the Database.');
//     res.status(403).json({ message: `No matching record found ${d}` });
//   }
//   console.log("tehsil"+stateExists);
//   // Make sure to close the pool if necessary
//   // pool.end();
// };

// async function fun2() {
//   const stateExists = await checkStateExists2(lgd_code);
//   let d = lgd_code;
//   if (!stateExists) {
//     console.log('Failure: State does not exist in the Database');
//     res.status(404).json({ message: `No matching record found ${d}` });
//   }
//   console.log("lgd_code "+stateExists);
//   // Make sure to close the pool if necessary
//   // pool.end();
// };


// async function fun3(){
//   const stateExists = await checkStateExists4(district);
//   let d = district;
//   if (!stateExists) {
//     console.log('Failure: district does not exist in the Database');
//     res.status(402).json({ message: `No matching record found ${d}` });
//   }
//   console.log("district "+ stateExists);
//   // Make sure to close the pool if necessary
//   // pool.end();
// };

 


// fun0()
//   .then((result1) => {
   
//     return fun3();
//   })
//   .then((result2) => {
  
//     return fun1();
//   })
//   .then((result3) => {
   
//     return fun2();
//   })
//   .then((result4) => {
    
//   console.log("done all promises");
//   })
//   .catch((error) => {

  
//     // Handle any errors that occurred during the chain
//     console.error('Error during promise chain:', error);
//   });



// }finally{

// }



// function check (){
//   return true;
// }











          try {
            if (saltKey) {
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
                res.status(400).json({ message: "Invalid " });
                
              }

              // var missingFields = [];

               if (!queryResult.rows[0].geometry) {
                
                await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);
                res.status(400).json({ message: "Geometry not found" });
               }

              // if (!queryResult.rows[0].state) {
              //   missingFields.push("state");
              // }

              // if (!queryResult.rows[0].district) {
              //   missingFields.push("district");
              // }

              // if (!queryResult.rows[0].tehsil) {
              //   missingFields.push("tehsil");
              // }

              // if (!queryResult.rows[0].village) {
              //   missingFields.push("village");
              // }


              // if (!queryResult.rows[0].lgd_code) {
              //   missingFields.push("lgd_code");
              // }


              // if (!queryResult.rows[0].khasra_no) {
              //   missingFields.push("khasra_no");
              // }

               if (!queryResult.rows[0].area_ac) {
                res.status(400).json({ message: "area_ac  not found  " });
               }

              // if (missingFields.length > 0) {
              //   res.status(400).json({
              //     message: `Missing fields, empty response for ${missingFields}`,
              //   });
              // }


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


            

                let limit_counter = apiCounter(saltKey,lgd_code,khasra_no);
                if(limit_counter){
                  res.json(geoJsonResponse);
                } else {
                  res.json({message:"Trial ended"});
                } // counter


                
            
            }
          } catch (error) {
            // if (error.code === "42P01") {
            //   res.status(404).json({ message: "Check the district name" });
            // }
            await sendEmail(state, district, tehsil, village, lgd_code, khasra_no);

             if (error.code === "42P01") {
               res.status(404).json({ message: "Data not found" });
             }        


            console.error("Error executing query", error);
            res.status(500).send("Internal Server Error");
          }
        });

  function checkParam(state,district,tehsil,lgd_code,village){





  }      



//my code 



app.listen(6000, () => {
  console.log("Server is running on port 6000");
});

