/**
 * Created by cbuonocore on 6/24/17.
 */

const yahoo = require('yahoo-finance');
const request = require('request');
const stock = require('./stock');

const stockName = 'amzn';

request(stock.getClosestSymbolUrl(stockName), function (error, response, body) {
    console.log('error:', error); // Print the error if one occurred
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the HTML for the Google homepage.

    const bodyJson = JSON.parse(body);
    const results = bodyJson.ResultSet.Result;
    if (!results.length) {
       console.log('no results for ', stockName);
       return;
    }

    const symbol = bodyJson.ResultSet.Result[0].symbol;
    console.log('parsed symbol:', symbol);

    yahoo.quote({
        symbol: [symbol],
        modules: ['price', 'summaryDetail'] // see the docs for the full list
    }, function (err, res) {
        if (err) {
            console.error(err);
        }
        // TODO: extract from yahoo response.
        console.log(`res: ${res}`);

        const sharePrice = res.price.regularMarketPrice;
        console.log(`sharePrice: ${sharePrice}`);
    });
});

