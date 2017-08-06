const yahoo = require('yahoo-finance');
const request = require('request');
const co = require('co');

// local libraries.
const stock = require('./stock');
const portfolio = require('./portfolio');
const api = require('./api');


const stockName = 'amzn';
const amount = 100;


// request(stock.getClosestSymbolUrl(stockName), function (error, response, body) {
//     console.log('error:', error); // Print the error if one occurred
//     console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
//     console.log('body:', body); // Print the HTML for the Google homepage.
//
//     const bodyJson = JSON.parse(body);
//     const results = bodyJson.ResultSet.Result;
//     if (!results.length) {
//        console.log('no results for ', stockName);
//        return;
//     }
//
//     const symbol = bodyJson.ResultSet.Result[0].symbol;
//     console.log('parsed symbol:', symbol);
//
//     yahoo.quote({
//         symbol: [symbol],
//         modules: ['price', 'summaryDetail'] // see the docs for the full list
//     }, function (err, res) {
//         if (err) {
//             console.error(err);
//         }
//         // TODO: extract from yahoo response.
//         console.log(`res: ${res}`);
//
//         const sharePrice = res.price.regularMarketPrice;
//         console.log(`sharePrice: ${sharePrice}`);
//     });
// });

// request(stock.getClosestSymbolUrl(stockName), function (error, response, body) {
//     const bodyJson = JSON.parse(body);
//
//     const results = bodyJson.ResultSet.Result;
//     if (!results.length || error) {
//         const errorMessage = `Could not find a symbol match for ${stockName}, try rephrasing or ask for another company?`;
//         console.log(errorMessage);
//         self.emitWithState(':tellWithCard', errorMessage, SKILL_NAME, imageObj)
//     }
//
//     const symbol = results[0].symbol;
//     console.log('parsed symbol:', symbol);
//     yahoo.quote({
//         symbol: [symbol],
//         modules: ['price', 'summaryDetail'] // see the docs for the full list
//     }, function (err, res) {
//         if (err) {
//             self.emitWithState(':tellWithCard', err, SKILL_NAME, imageObj)
//         }
//
//         // current price from the quote response.
//         const sharePrice = res.price.regularMarketPrice;
//         const regularMarketChange = res.price.regularMarketChange;
//         const message = `The last market price for ${symbol} was $${sharePrice}, recently changing by ${regularMarketChange}%`;
//
//         console.log(':tellWithCard', message, SKILL_NAME, imageObj)
//     });
// });

// BUY
// request(stock.getClosestSymbolUrl(stockName), function (error, response, body) {
//     const bodyJson = JSON.parse(body);
//
//     const results = bodyJson.ResultSet.Result;
//     if (!results.length || error) {
//         const errorMessage = `Could not find a symbol match for ${stockName}, try rephrasing or ask for another company?`;
//         console.log(errorMessage);
//         console.log(':tellWithCard', errorMessage, SKILL_NAME, imageObj)
//     }
//
//     const mostLikelyStock = results[0];
//     const symbol = mostLikelyStock.symbol;
//     const stockName = mostLikelyStock.name;
//     console.log(`parsed most likely stockName/symbol: ${stockName}/${symbol}`);
//
//     yahoo.quote({
//         symbol: [symbol],
//         modules: ['price', 'summaryDetail'] // see the docs for the full list
//     }, function (err, quotes) {
//         if (err) {
//             console.log(':tellWithCard', err, SKILL_NAME, imageObj)
//         }
//
//         lastStock = symbol;
//         lastStockPrice = quotes.price.regularMarketPrice;
//         lastStockAmount = amount;
//
//         console.log(':ask', `Buying ${lastStockAmount} ${lastStock} will cost $${lastStockPrice * lastStockAmount}. Continue?`)
//     });
// });

let lastStock = 'amzn';
let lastStockPrice = 100.50;
let lastStockAmount = 3;

const self = this;

let event = {session: {user: {userId: null}}};
event['session']['user']['userId'] = "chris_test";
const requestUrl = api.getPortfolio(portfolio.getUserFromEvent(event));
const promise = api.createPromise(requestUrl, "GET");
promise.then((res) => {
    portfolio.setPortfolio(res);

    const stockMap = portfolio.getStockMap();
    const symbols = Object.keys(stockMap);
    console.log('symbols: '+ symbols);

    // This replaces the deprecated snapshot() API

    co(function *() {

        const promises = symbols.map((symbol) => {
            return Promise.resolve(yahoo.quote(symbol, ['price']));
        });

        const res = yield promises;
        console.log(res);

        const stockMap = portfolio.getStockMap();
        const balance = portfolio.getPortfolio()['Balance'];
        console.log('stockMap: ' + JSON.stringify(stockMap));

        let stockValue = 0;
        for (let i in res) {
            // current price from the quote response.
            const quote = res[i];
            const price = quote.price.regularMarketPrice;

            console.log(quote.price.shortName, price);
            stockValue += stockMap[symbols[i]] * price
        }
        // Check if new account
        let message = "";
        if (stockValue === 0 && balance === stock.STARTING_BALANCE) {
            message = stock.newPortfolioMessage(balance);
        } else {
            message = stock.portfolioMessage(stockMap, stockValue, balance);
        }
        console.log('portfolio message: ', message);


    }).catch((err) => {
        console.log(err);
        console.log(':tell', "error retrieving quote information, " + err);
    });

});

//
// const requestUrl = api.getPortfolio(portfolio.getUserFromEvent(event));
// const promise = api.createPromise(requestUrl, "GET");
// promise.then((res) => {
//     const myPortfolio = res;
//     portfolio.setPortfolio(myPortfolio);
//     const purchaseTotal = lastStockAmount * lastStockPrice;
//
//     // Attempt to update with the buy transaction (returns false if impossible).
//     if (!portfolio.updateHolding(lastStock, lastStockAmount, -purchaseTotal)) {
//         console.log(":tell", `You don't have sufficient capital, you currently only have $${myPortfolio['Balance']}`);
//         return;
//     }
//
//     const requestUrl = api.postPorfolio();
//     let p = portfolio.getPortfolio();
//     const reqBody = JSON.stringify(p);
//     console.log('url: ' + requestUrl);
//     console.log('body: ' + reqBody);
//     request.post({url: requestUrl, form: reqBody}, (err, res, body) => {
//         if (err) {
//             console.log("Error buying stock: " + err);
//         }
//         console.log("response: " + JSON.stringify(res));
//
//         console.log(':ask', `Successfully purchased ${lastStockAmount} ${lastStock} shares. What now?`);
//
//     });
// }).catch(function (err) {
//     // Portfolio API call failed...
//     console.log(':tell', "Error getting portfolio: " + err)
// });
