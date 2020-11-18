/** Shared config for application; can be req'd many places. */

require("dotenv").config();

const SECRET_KEY = process.env.SECRET_KEY || "test";

const PORT = +process.env.PORT || 3000;

// database is:
//
// - on Heroku, get from env var DATABASE_URL
// - in testing, 'jobly-test'
// - else: 'jobly'

let DB_URI;
let BCRYPT_HASHING_ROUNDS;

if (process.env.NODE_ENV === "test") {
  DB_URI = "jobly-test";
  BCRYPT_HASHING_ROUNDS = 1;
} else {
  DB_URI = process.env.DATABASE_URL || "jobly";
  BCRYPT_HASHING_ROUNDS = 12;
}

module.exports = {
  SECRET_KEY,
  PORT,
  DB_URI,
  BCRYPT_HASHING_ROUNDS
};
