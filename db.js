require('dotenv').config();

const mysql = require('mysql2/promise');

const createConnection = async () => {
    return mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
};

module.exports = { createConnection };