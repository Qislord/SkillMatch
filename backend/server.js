const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const app = require("./src/app");
const pool = require("./src/db");

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await pool.query("SELECT NOW()");

    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });

    console.log("PostgreSQL connected");
  } catch (error) {
    console.error(error);
  }
}

start();
