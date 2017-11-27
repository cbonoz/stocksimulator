-- DROP DATABASE IF EXISTS githelpers;
CREATE DATABASE stocksim;

\c stocksim;

CREATE TABLE portfolios (
  ID SERIAL PRIMARY KEY,
  userId VARCHAR,
  portfolio VARCHAR(510)
);
