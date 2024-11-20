import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/asset-inventory/:category", async (req, res) => {
  const { category } = req.params;
  try {
    const result = await pool.query(
      `
        SELECT 
          ai_assets.asset_id,
          ai_assets.serial_number,
          ai_assets.brand,
          ai_assets.model,
          ai_assets.purchase_date,
          ai_categories.name,
          ai_statuses.status_type,
          ai_logs.history_id,
          ai_logs.event_type,
          ai_logs.event_date,
          ai_logs.description,
          ai_configs.config_id,
          ai_configs.config_key,
          ai_configs.config_value,
          ai_users.user_id,
          ai_users.name AS user_name,
          ai_locations.location_name,
          ai_locations.desk
        FROM  
          "asset_inventory".assets ai_assets
        JOIN 
          "asset_inventory".categories ai_categories ON ai_assets.category = ai_categories.id
        JOIN 
          "asset_inventory".status_types ai_statuses ON ai_assets.status = ai_statuses.status_id
        LEFT JOIN 
          "asset_inventory".other_configurations ai_configs ON ai_assets.asset_id = ai_configs.asset_id
        LEFT JOIN 
          "asset_inventory".history_logs ai_logs ON ai_assets.asset_id = ai_logs.asset_id
        LEFT JOIN 
          "asset_inventory".user_assets ai_user_assets ON ai_assets.asset_id = ai_user_assets.asset_id
        LEFT JOIN 
          "asset_inventory".users ai_users ON ai_user_assets.user_id = ai_users.user_id
        LEFT JOIN 
          "asset_inventory".location ai_locations ON ai_users.location = ai_locations.location_id
        WHERE 
          ai_categories.name = $1
      `,
      [category]
    );

    const groupedResults = result.rows.reduce((acc, row) => {
      const {
        asset_id,
        history_id,
        event_type,
        event_date,
        description,
        user_id,
        user_name,
        location_name,
        desk,
        config_key,
        config_value,
        ...assetData
      } = row;

      if (!acc[asset_id]) {
        acc[asset_id] = {
          asset_id,
          ...assetData,
          user: user_id
            ? { user_id, user_name, location: { location_name, desk } }
            : null,
          history_logs: [],
          other_configs: {},
        };
      }

      if (
        history_id &&
        !acc[asset_id].history_logs.some((log) => log.history_id === history_id)
      ) {
        acc[asset_id].history_logs.push({
          history_id,
          event_type,
          event_date,
          description,
        });
      }

      if (config_key) {
        acc[asset_id].other_configs[config_key] = config_value;
      }

      return acc;
    }, {});

    res.json(Object.values(groupedResults));

    // res.json(result.rows);
  } catch (err) {
    console.error("Database query error:", err.message);
    res.status(500).json({ error: "Database query failed" });
  }
});

router.get(
  "/asset-inventory/:category/history-log/:serialNo",
  async (req, res) => {
    const { serialNo } = req.params;

    try {
      const result = await pool.query(
        `
            SELECT
              ai_logs.history_id,
              ai_logs.event_type,
              ai_logs.event_date,
              ai_logs.description
            FROM  
              "asset_inventory".assets ai_assets
            LEFT JOIN 
              "asset_inventory".history_logs ai_logs ON ai_assets.asset_id = ai_logs.asset_id
            WHERE
              ai_assets.serial_number = $1
        `,
        [serialNo]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Database query error:", err.message);
      res.status(500).json({ error: "Database query failed" });
    }
  }
);

// router.get("/asset-inventory", async (req, res) => {
//   try {
//     const result = await pool.query(
//       `
//                     SELECT
//                      ai_statuses.status_type
//                     FROM
//                      "asset_inventory".assets ai_assets
//                     JOIN
//                      "asset_inventory".status_types ai_statuses ON ai_assets.status = ai_statuses.status_id

//                 `
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error("Database query error:", err.message);
//     res.status(500).json({ error: "Database query failed" });
//   }
// });

router.get("/asset-inventory", async (req, res) => {
  console.log("Query Parameters:", req.query);
  const { user } = req.query; // Extract the user query parameter

  if (!user) {
    return res.status(400).json({ error: "User query parameter is required" });
  }

  try {
    const result = await pool.query(
      `
            SELECT 
              ai_assets.asset_id,
              ai_assets.serial_number,
              ai_assets.brand,
              ai_assets.model,
              ai_categories.name AS category_name
            FROM
              "asset_inventory".assets ai_assets
            JOIN 
              "asset_inventory".categories ai_categories ON ai_assets.category = ai_categories.id
            LEFT JOIN 
              "asset_inventory".user_assets ai_user_assets ON ai_assets.asset_id = ai_user_assets.asset_id
            LEFT JOIN 
              "asset_inventory".users ai_users ON ai_user_assets.user_id = ai_users.user_id
            WHERE 
              ai_users.name ILIKE $1
          `,
      [`%${user}%`]
    ); // Use ILIKE for case-insensitive search on user name
    res.json(result.rows);
  } catch (error) {}
});

export default router;
