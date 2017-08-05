/**
 * Created by cbuonocore on 7/20/17.
 */
'use strict';
const library = (function () {
    const rp = require('request-promise');

    // point to server url.
    const baseUrl = "http://35.167.54.81:9003/api";

    function getPortfolio(userId) {
        return `${baseUrl}/portfolio/${userId}`;
    }

    function postPortfolio() {
        return `${baseUrl}/portfolio/save`;
    }

    function getStartOver(userId) {
        return `${baseUrl}/restart/${userId}`;
    }

    /*
     * url: request url
     * method: "GET", "POST", etc.
     * token: auth token retrieved from toast usermgmt
     * restaurantGuid: rsGuid retrieved from toast usermgmt
     */
    function createPromise(url, method, body) {
        const options = {
            method: method,
            uri: url,
            headers: {
            },
            json: true // Automatically parses the JSON string in the response
        };
        if (body !== undefined) {
            options['json'] = body;
        }
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
