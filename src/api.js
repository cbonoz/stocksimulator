/**
 * Created by cbuonocore on 7/20/17.
 */
'use strict';
const library = (function () {

    const rp = require('request-promise');

    const baseUrl = "http://172.31.26.60:9003/api";

    function getPortfolio(userId) {
        return `${baseUrl}/portfolio/${userId}`;
    }

    function postPortfolio() {
        return `${baseUrl}/portfolio/save`;
    }

    function getStartOver(userId) {
        return `${baseUrl}/startover/${userId}`;
    }

    /*
     * url: request url
     * method: "GET", "POST", etc.
     * token: auth token retrieved from toast usermgmt
     * restaurantGuid: rsGuid retrieved from toast usermgmt
     */
    function createPromise(url, method) {
        const options = {
            method: method,
            uri: url,
            headers: {},
            json: true // Automatically parses the JSON string in the response
        };
        console.log('options: ' + JSON.stringify(options));
        return rp(options);
    }

    return {
        getPortfolio: getPortfolio,
        getStartOver: getStartOver,
        postPorfolio: postPortfolio,
        createPromise: createPromise,
    };

})();
module.exports = library;
