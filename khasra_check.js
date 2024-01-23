const express = require("express");
const app = express();
const { Pool } = require("pg");
function check  (){
    try {
        const query = await pool.query(
          `SELECT khasra_no FROM ${district} WHERE state = $1 AND district = $2 AND tehsil = $3 AND village = $4 AND lgd_code = $5 AND khasra_no = $6`,
          [state, district, tehsil, village, lgd_code, khasra_no]
        );
      
        if (query.rows.length === 0) {
          res.status(400).json({ message: "Khasra number not in DB" });
        } else {
          console.log("This is khasra data", query.rows);
        }
      } catch (error) {
        console.error("Error getting khasra", error);
      }
      
}  

module.exports = check;