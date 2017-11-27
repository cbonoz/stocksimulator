'use strict';
// Server code for githelpers project.
// Author: Chris Buonocore (2017)
// License: MIT

const axios = require('axios');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const pg = require('pg');
const path = require('path');

// Variable and Server Setup //
const prod = true;

let globalAccessToken = "";

const dbUser = process.env.ADMIN_DB_USER;
const dbPass = process.env.ADMIN_DB_PASS;
const dbName = 'stocksim';
const connectionString = process.env.GITHELPERS_DATABASE_URL
    || `postgres://${dbUser}:${dbPass}@localhost:5432/${dbName}`;
console.log('connectionString', connectionString);

const pool = new pg.Pool({
    connectionString: connectionString,
})

const PORT = 9003;

const app = express();
const server = require('http').createServer(app);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// TODO: reduce cors.
app.use(cors());

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err)
    process.exit(-1)
})

// Endpoints //

app.get('/ss/hello', (req, res) => {
    return res.json("hello world");
});

app.get('/ss/portfolio/:userId', (req, res, next) => {
    const userId = req.params.userId;

    pool.query(`SELECT * FROM portfolios where userId=$1`, [`%${userId}%`], (err, result) => {
        if (err) {
            console.error('getPortfolio error', err, creator, result)
            return res.status(500).json(err);
        }
        return res.json(result.rows);
    })
});

app.get('/ss/restart/:userId', (req, res, next) => {
    const userId = req.params.userId;

    pool.query(`DELETE FROM portfolios where userId=$1`, [`%${userId}%`], (err, result) => {
        if (err) {
            console.error('getPortfolio error', err, creator, result)
            return res.status(500).json(err);
        }
        return res.status(200).json(true)
    });
});

// Perform the db search for the passed query -> return a list of active issue results
app.post('/ss/portfolio/save', (req, res) => {
    const body = req.body;
    const userId = body.userId;
    const portfolio = body.portfolio;
    // TODO: implement stronger search filtering (including languages).

    pool.query(`DELETE FROM portfolios where userId=$1`, [`%${userId}%`], (err, result) => {
        if (err) {
            console.error('error deleting during save', err, creator, result)
            return res.status(500).json(err);
        }
        pool.query(`insert into portfolios(userId, portfolio) values(${userId}, ${portfolio})`, (err2, result2) => {
            if (err2) {
                console.error('error inserting during save', err, creator, result)
                return res.status(500).json(err);
            }
            // Return the newly-created row.
            return res.status(200).json(result.rows)
        });
    });
});

// DB Connection and server start //

pool.connect((err, client, done) => {
    if (err) {
        console.error('postgres connection error', err)
        if (prod) {
            console.error('exiting')
            return;
        }
        console.error('continuing with disabled postgres db');
    }

    server.listen(PORT, () => {
        console.log('Express server listening on localhost port: ' + PORT);
    });
})