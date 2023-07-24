const mysql = require('mysql2');
const fs = require('fs');

// create the connection to database
// const db = mysql.createPool({
//   host: 'localhost',
//   user: 'root',
//   password: 'password',
//   database: 'attribute_annotation'
// });
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync('/Users/zhengyuzhang/Downloads/DigiCertGlobalRootG2.crt.pem')
  }
});
module.exports = db;
