'use strict';
const Alexa = require('alexa-sdk');
const yahoo = require('yahoo-finance');
const request = require('request');
const co = require('co');

// local libraries.
const stock = require('./stock');
const portfolio = require('./portfolio');
const api = require('./api');

//=========================================================================================================================================
// Constants and variable declarations.
//=========================================================================================================================================

//Replace with your app ID (OPTIONAL).  You can find this value at the top of your skill's page on http://developer.amazon.com.  
//Make sure to enclose your value in quotes, like this: const APP_ID = "amzn1.ask.skill.bb4045e6-b3e8-4133-b650-72923c5980f1";
const APP_ID = 'amzn1.ask.skill.f56869d8-4f28-4773-8185-e5177218108e';

const SKILL_NAME = stock.APP_NAME;
const HELP_MESSAGE = stock.HELP_TEXT;
const STOP_MESSAGE = stock.EXIT_TEXT;
const CONFIRM_MESSAGE = 'Are you sure? Say yes or no.';

const BUY_REPROMPT = "Say a number of shares to buy followed by the stock, such as 'buy 100 amazon', or say cancel.";
const SELL_REPROMPT = "Say a number of shares to sell followed by the stock, like 'sell 200 google', or say cancel.";


const imageObj = {
    smallImageUrl: './img/stock_sim.png',
    largeImageUrl: './img/stock_sim.png',
};

//=========================================================================================================================================
// Skill logic below
//=========================================================================================================================================

const states = {
    QUERYMODE: '_QUERYMODE', // User is deciding which query to run
    BUYMODE: '_BUYMODE',
    SELLMODE: '_SELLMODE',
    RESTARTMODE: '_RESTARTMODE'
};

let lastStock = null;
let lastStockAmount = null;
let lastStockPrice = null;

const buyHandlers = Alexa.CreateStateHandler(states.BUYMODE, {
    'AMAZON.NoIntent': function () {
        this.handler.state = states.QUERYMODE;
        const noMessage = 'Buy cancelled.';
        this.emit(':ask', noMessage + HELP_MESSAGE, HELP_MESSAGE);
    },
    'AMAZON.YesIntent': function () {
        this.handler.state = states.QUERYMODE;
        // stock and number of shares.
        const self = this;
        const requestUrl = api.getPortfolio(portfolio.getUserFromEvent(this.event));
        const promise = api.createPromise(requestUrl, "GET");
        promise.then((res) => {
            const myPortfolio = res;
            portfolio.setPortfolio(myPortfolio);
            const purchaseTotal = lastStockAmount * lastStockPrice;

            // Attempt to update with the buy transaction (returns false if impossible).
            if (!portfolio.updateHolding(lastStock, lastStockAmount, -purchaseTotal)) {
                self.emit(":tell", `You need $${purchaseTotal - myPortfolio['Balance']} to complete this purchase`);
            }

            const requestUrl = api.postPorfolio();
            request.post({url: requestUrl, form: portfolio.getPortfolio()}, (err, res, body) => {
                if (err) {
                    self.emit("Error buying stock: " + err);
                }

                self.emit(':ask', `Successfully purchased ${lastStockAmount} ${lastStock} shares. What now?`, HELP_MESSAGE);

            });
        }).catch(function (err) {
            // Portfolio API call failed...
            self.emit(':tell', "Error getting portfolio: " + err)
        });
    }
});

const sellHandlers = Alexa.CreateStateHandler(states.SELLMODE, {
    'AMAZON.NoIntent': function () {
        this.handler.state = states.QUERYMODE;
        const noMessage = 'Sell canceled.';
        this.emit(':ask', noMessage + HELP_MESSAGE, HELP_MESSAGE);
    },
    'AMAZON.YesIntent': function () {
        this.handler.state = states.QUERYMODE;
        // stock and number of shares.
        const self = this;
        const requestUrl = api.getPortfolio(portfolio.getUserFromEvent(this.event));
        const promise = api.createPromise(requestUrl, "GET");
        promise.then((res) => {
            portfolio.setPortfolio(res);
            const stockMap = portfolio.getStockMap();

            const saleTotal = lastStockAmount * lastStockPrice;

            // Update with the sell transaction.
            if (!portfolio.updateHolding(lastStock, -lastStockAmount, saleTotal)) {
                const currentShares = stockMap.hasOwnProperty(lastStock) ? stockMap[lastStock] : 0;
                self.emit(":tell", `You don't have enough shares of ${lastStock} to sell - you asked to sell ` +
                    `${lastStockAmount}, but currently have ${currentShares}.`);
            }

            const requestUrl = api.postPorfolio();
            request.post({url: requestUrl, form: portfolio.getPortfolio()}, (err, res, body) => {
                if (err) {
                    self.emit(":tell", "Error selling stock: " + err);
                }

                this.emit(':ask', `Successfully sold ${lastStockAmount} ${lastStock} shares. What now?`, HELP_MESSAGE);

            });
        }).catch(function (err) {
            // Portfolio API call failed...
            self.emit(':tell', "Error getting portfolio: " + err)
        });
    }
});

const restartHandlers = Alexa.CreateStateHandler(states.RESTARTMODE, {
    'AMAZON.NoIntent': function () {
        this.handler.state = states.QUERYMODE;
        const noMessage = 'Reset canceled, what do you want to do now?';
        this.emit(':ask', noMessage, HELP_MESSAGE);
    },
    'AMAZON.YesIntent': function () {
        this.handler.state = states.QUERYMODE;
        const requestUrl = api.getStartOver(portfolio.getUserFromEvent(this.event));
        const promise = api.createPromise(requestUrl, "GET");
        promise.then((res) => {
            this.emit(':ask', `Successfully reset account and balance. What now?`, HELP_MESSAGE);
        }).catch((err) => {
            self.emit(':tell', "Error reseting account balance: " + err);
        })
    },
});

const queryHandlers = {
    'LaunchRequest': function () {
        this.handler.state = states.QUERYMODE;
        this.emit('PortfolioIntent');
    },
    'QuoteIntent': function () {
        this.handler.state = states.QUERYMODE;
        const self = this;
        const stockName = this.event.request.intent.slots.Stock.value;
        request(stock.getClosestSymbolUrl(stockName), function (error, response, body) {
            const bodyJson = JSON.parse(body);

            const results = bodyJson.ResultSet.Result;
            if (!results.length || error) {
                const errorMessage = `Could not find a symbol match for ${stockName}, try rephrasing or ask for another company?`;
                console.log(errorMessage);
                self.emit(':tellWithCard', errorMessage, SKILL_NAME, imageObj)
            }

            const symbol = results[0].symbol;
            console.log('parsed symbol:', symbol);
            yahoo.quote({
                symbol: [symbol],
                modules: ['price', 'summaryDetail'] // see the docs for the full list
            }, function (err, res) {
                if (err) {
                    self.emit(':tellWithCard', err, SKILL_NAME, imageObj)
                }

                // current price from the quote response.
                const sharePrice = res.price.regularMarketPrice;
                const message = `The last regular market price for ${symbol} was $${sharePrice}`;
                self.emit(':tellWithCard', message, SKILL_NAME, imageObj)
            });
        });
    },
    'PortfolioIntent': function () {
        const self = this;
        this.handler.state = states.QUERYMODE;
        const requestUrl = api.getPortfolio(portfolio.getUserFromEvent(this.event));
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
                    message = stock.portfolioMessage(stockValue, balance);
                }
                console.log('portfolio message: ', message);
                self.emit(':ask', message, message);
            });
        }).catch(function (err) {
            // Portfolio API call failed...
            self.emit(':tell', "Error getting portfolio: " + err)
        });
    },
    'BuyIntent': function () {
        const self = this;
        const amount = parseInt(this.event.request.intent.slots.Amount.value);
        const stockName = this.event.request.intent.slots.Stock.value;

        request(stock.getClosestSymbolUrl(stockName), function (error, response, body) {
            const bodyJson = JSON.parse(body);

            const results = bodyJson.ResultSet.Result;
            if (!results.length || error) {
                const errorMessage = `Could not find a symbol match for ${stockName}, try rephrasing or ask for another company?`;
                console.log(errorMessage);
                self.emit(':tellWithCard', errorMessage, SKILL_NAME, imageObj)
            }

            const symbol = results[0].symbol;
            console.log('parsed symbol:', symbol);

            yahoo.quote({
                symbol: [symbol],
                modules: ['price', 'summaryDetail'] // see the docs for the full list
            }, function (err, quotes) {
                if (err) {
                    self.emit(':tellWithCard', err, SKILL_NAME, imageObj)
                }

                lastStock = symbol;
                lastStockPrice = quotes.price.regularMarketPrice;
                lastStockAmount = amount;

                self.handler.state = states.BUYMODE;
                self.emit(':ask', `Buying ${lastStockAmount} ${lastStock} will cost $${lastStockPrice * lastStockAmount}. Continue?`, BUY_REPROMPT);
            });
        });
    },
    'SellIntent': function () {
        const self = this;
        const amount = parseInt(this.event.request.intent.slots.Amount.value);
        const stockName = this.event.request.intent.slots.Stock.value;

        request(stock.getClosestSymbolUrl(stockName), function (error, response, body) {
            const bodyJson = JSON.parse(body);

            const results = bodyJson.ResultSet.Result;
            if (!results.length || error) {
                const errorMessage = `Could not find a symbol match for ${stockName}, try rephrasing or ask for another company?`;
                console.log(errorMessage);
                self.emit(':tellWithCard', errorMessage, SKILL_NAME, imageObj)
            }

            const symbol = results[0].symbol;
            console.log('parsed symbol:', symbol);

            yahoo.quote({
                symbol: [symbol],
                modules: ['price', 'summaryDetail'] // see the docs for the full list
            }, function (err, quotes) {
                if (err) {
                    self.emit(':tellWithCard', err, SKILL_NAME, imageObj)
                }

                lastStock = symbol;
                lastStockPrice = quotes.price.regularMarketPrice;
                lastStockAmount = amount;

                self.handler.state = states.SELLMODE;
                self.emit(':ask', `Selling ${lastStockAmount} ${lastStock} would yield $${lastStockPrice * lastStockAmount}. Continue?`, SELL_REPROMPT);
            });
        });
    },
    'RestartIntent': function () {
        this.handler.state = states.RESTARTMODE;
        const resetMessage = `This will reset your account and reset your balance to ${stock.STARTING_BALANCE}. ${CONFIRM_MESSAGE}`;
        this.emit(':ask', resetMessage, resetMessage);
    },

    // ** AMAZON INTENTS BELOW ** //

    'AMAZON.HelpIntent': function () {
        this.emit(':ask', HELP_MESSAGE, HELP_MESSAGE);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    }
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.dynamoDBTableName = 'StockSimulator'; // That's it!
    alexa.registerHandlers(queryHandlers, restartHandlers, sellHandlers, buyHandlers);
    alexa.execute();
};