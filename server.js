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
    console.error('Error calculating distance:', error);
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
    console.error('Error calculating distance:', error);
    res.status(500).send("Internal Server Error");
  }
});







// Query to get ogc_fid from global_india_khasra
app.get("/adjData", async (req, res) => {
  const { saltKey, state, district, tehsil, village, lgd_code, khasra_no } =
    req.query;

  try {
    if (saltKey == "c4f1e08a2b5d1e3f8d9a0b6c3e2d5a1") {
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
        res.status(404).send("Record not found");
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

      // Process the result as needed
      res.json(customQueryResult.rows);
    } else {
      res.json({ message: "Unauthorised Access" });
    }
  } catch (error) {
    console.error("Error executing queries", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/getData", async (req, res) => {
  console.log("Request received");

  const { saltKey, state, district, tehsil, village, lgd_code, khasra_no } =
    req.query;

  try {
    if (saltKey === "EgNIgHpqbW3ja1EgWrsPC1c4FQgJukYs9jhlswdC") {
      const tableName = district;
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
    } else {
      res.status(401).json({ message: "Unauthorized Access" });
    }
  } catch (error) {
    console.error("Error executing query", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(6000, () => {
  console.log("Server is running on port 6000");
});

