/**
 * Created by cbuonocore on 7/20/17.
 */
'use strict';
const library = (function () {
    const axios = require('axios');

    // point to server url.
    const BASE_URL = "https://35.167.54.81:9003/ss";

    function getClosestSymbolUrl(stockName) {
        return axios.get(`http://d.yimg.com/aq/autoc?query=${stockName}&region=US&lang=en-US`);
    }

    function getPortfolio(userId) {
        return axios.get(`${BASE_URL}/portfolio/${userId}`);
    }

    function getRestart(userId) {
        return axios.get(`${BASE_URL}/restart/${userId}`);
    }

    function postPortfolio(userId, portfolio) {
        return axios.post(`${BASE_URL}/portfolio/save`, {
            userId: userId,
            portfolio: portfolio
        });
    }

    function getErrorMessage(again) {
        return `Internet error ${action}, please try again`;
    }

    return {
        getClosestSymbolUrl: getClosestSymbolUrl,
        getErrorMessage: getErrorMessage,
        getPortfolio: getPortfolio,
        getRestart: getRestart,
        postPorfolio: postPortfolio
    };

})();
module.exports = library;
