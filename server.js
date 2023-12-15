const express = require("express");
const app = express();
const { Pool } = require("pg");

// Replace these values with your PostgreSQL connection details
const dbConfig = {
  user: "tcgs_ap",
  host: "geoserver.quantasip.com",
  database: "qg_verse",
  password: "FwC&bc$2#tj4%#ZQ",
  port: 5432, // Default PostgreSQL port
};

const pool = new Pool(dbConfig);

// Test the connection
pool.query("SELECT NOW()", (err, result) => {
  if (err) {
    console.error("Error connecting to the database", err);
  } else {
    console.log(
      "Connected to the database. Current timestamp:",
      result.rows[0].now
    );
  }
});

// Route that queries the database for the first 100 rows
app.get("/getData", async (req, res) => {
  console.log("Request received");

  const { state, district, tehsil, village, lgd_code, khasra_no } = req.query;

  try {
    const queryResult = await pool.query(
      `
      SELECT
        ST_AsGeoJSON(geom) AS geometry,
        state,
        district,
        tehsil,
        village,
        khasra_no,
        area_ac,
        shape_leng,
        shape_area
      FROM global_india_khasra
      WHERE
        state = $1 AND
        district = $2 AND
        tehsil = $3 AND
        village = $4 AND
        lgd_code = $5 AND
        khasra_no = $6
      LIMIT 100
    `,
      [state, district, tehsil, village, lgd_code, khasra_no]
    );

    // Transform the result into GeoJSON format
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

    res.json(geoJsonResponse);
  } catch (error) {
    console.error("Error executing query", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(6000, () => {
  console.log("Server is running on port 3000");
});
