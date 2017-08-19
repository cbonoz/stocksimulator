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
// const APP_ID = 'amzn1.ask.skill.f56869d8-4f28-4773-8185-e5177218108e';
const APP_ID = 'amzn1.ask.skill.562665fb-3f00-4feb-befc-53177256f19f';

const SKILL_NAME = stock.APP_NAME;
const HELP_MESSAGE = stock.HELP_TEXT;
const STOP_MESSAGE = stock.EXIT_TEXT;
const CONFIRM_MESSAGE = 'Are you sure? Say yes or no.';
const REPHRASE_PROMPT = 'Try rephrasing or ask for another company.';
const REPEAT_PROMPT = "Sorry I didn't get that. ";

const imageObj = {
    smallImageUrl: './img/stock_sim_108.png',
    largeImageUrl: './img/stock_sim_512.png',
};

//=========================================================================================================================================
// Skill logic below
//=========================================================================================================================================

const states = {
    BUYMODE: '_BUYMODE',
    SELLMODE: '_SELLMODE',
    RESTARTMODE: '_RESTARTMODE'
};

function roundTwo(val) {
    return Math.round(val * 100) / 100;
}

const restartHandlers = Alexa.CreateStateHandler(states.RESTARTMODE, {
    'AMAZON.YesIntent': function () {
        const self = this;
        self.handler.state = '';
        const requestUrl = api.getStartOver(portfolio.getUserFromEvent(self.event));
        const promise = api.createPromise(requestUrl, "GET");
        promise.then((res) => {
            console.log(res);
            self.emit(':ask', `Successfully reset account and balance. What now?`, HELP_MESSAGE);
        }).catch((err) => {
            self.emit(':tell', "Internet Error resetting account balance: " + err);
        })
    },
    'AMAZON.NoIntent': function () {
        const self = this;
        self.handler.state = '';
        const noMessage = 'Reset canceled, what do you want to do now?';
        self.emit(':ask', noMessage, HELP_MESSAGE);
    },
    'Unhandled': function () {
        const message = `${REPEAT_PROMPT} Say yes to restart your account or no to cancel.`;
        this.emit(':ask', message, message);
    }
});

const buyHandlers = Alexa.CreateStateHandler(states.BUYMODE, {
    'AMAZON.YesIntent': function () {
        const self = this;
        self.handler.state = '';

        const lastStockAmount = self.attributes['lastStockAmount'];
        const lastStockPrice = self.attributes['lastStockPrice'];
        const lastStockSymbol = self.attributes['lastStockSymbol'];
        const lastStockName = self.attributes['lastStockName'];

        const requestUrl = api.getPortfolio(portfolio.getUserFromEvent(self.event));
        const promise = api.createPromise(requestUrl, "GET");
        promise.then((res) => {
            const myPortfolio = res;
            portfolio.setPortfolio(myPortfolio);
            const purchaseTotal = roundTwo(lastStockPrice * lastStockAmount);

            // Attempt to update with the buy transaction (returns false if impossible).
            if (!portfolio.updateHolding(lastStockSymbol, lastStockAmount, -purchaseTotal)) {
                self.emit(":tell", `You need $${purchaseTotal - myPortfolio['Balance']} to complete this purchase`);
                return;
            }

            const requestUrl = api.postPorfolio();
            const options = {
                headers: {
                    "Content-Type": "application/json"
                },
                url: requestUrl,
                body: JSON.stringify(portfolio.getPortfolio()),
                json: true
            };
            request.post(options, (err, res, body) => {
                if (err) {
                    self.emit(":tell", "Internet Error buying stock: " + err);
                }
                const remainingCapital = roundTwo(myPortfolio['Balance'] - purchaseTotal);
                self.emit(':askWithCard',
                    `Successfully purchased ${lastStockAmount} ${lastStockName} shares, you have $${remainingCapital} remaining. What next?`,
                    HELP_MESSAGE,
                    SKILL_NAME,
                    imageObj
                );

            });
        }).catch(function (err) {
            // Portfolio API call failed...
            self.emit(':tell', "Internet Error getting portfolio: " + err)
        });
    },
    'AMAZON.NoIntent': function () {
        const self = this;
        self.handler.state = '';
        const noMessage = 'Cancelled buy order. ';
        self.emit(':tell', noMessage);
    },
    'Unhandled': function () {
        const message = `${REPEAT_PROMPT} Say yes to complete the buy order or no to cancel.`;
        this.emit(':ask', message, message);
    }
});

const sellHandlers = Alexa.CreateStateHandler(states.SELLMODE, {
    'AMAZON.YesIntent': function () {
        const self = this;
        self.handler.state = '';
        const requestUrl = api.getPortfolio(portfolio.getUserFromEvent(self.event));
        const promise = api.createPromise(requestUrl, "GET");

        const lastStockAmount = self.attributes['lastStockAmount'];
        const lastStockPrice = self.attributes['lastStockPrice'];
        const lastStockSymbol = self.attributes['lastStockSymbol'];
        const lastStockName = self.attributes['lastStockName'];

        promise.then((res) => {
            portfolio.setPortfolio(res);
            const stockMap = portfolio.getStockMap();

            const saleTotal = roundTwo(lastStockPrice * lastStockAmount);

            // Update with the sell transaction.
            if (!portfolio.updateHolding(lastStockSymbol, -lastStockAmount, saleTotal)) {
                const currentShares = stockMap.hasOwnProperty(lastStockSymbol) ? stockMap[lastStockSymbol] : 0;
                self.emit(":tell", `You don't have enough shares of ${lastStockName} to sell - you asked to sell ` +
                    `${lastStockAmount}, but currently have ${currentShares}.`);
            }

            const requestUrl = api.postPorfolio();
            const options = {
                headers: {
                    "Content-Type": "application/json"
                },
                url: requestUrl,
                body: JSON.stringify(portfolio.getPortfolio()),
                json: true
            };
            request.post(options, (err, res, body) => {
                if (err) {
                    self.emit(":tell", "Internet Error selling stock: " + err);
                }

                self.emit(':askWithCard',
                    `Successfully sold ${lastStockAmount} ${lastStockName} shares for $${saleTotal}. What next?`,
                    HELP_MESSAGE,
                    SKILL_NAME,
                    imageObj
                );

            });
        }).catch(function (err) {
            // Portfolio API call failed...
            self.emit(':tell', "Internet Error getting portfolio: " + err)
        });
    },

    'AMAZON.NoIntent': function () {
        const self = this;
        self.handler.state = '';
        const noMessage = 'Cancelled sell order. ';
        self.emit(':tell', noMessage);
    },
    'Unhandled': function () {
        const message = `${REPEAT_PROMPT} Say yes to complete the sell order or no to cancel.`;
        this.emit(':ask', message, message);
    }
});

// Base level (main state) handlers).
const handlers = {
    'Unhandled': function () {
        console.log("UNHANDLED");
        const message = `${REPEAT_PROMPT} ${HELP_MESSAGE}`;
        this.emit(':ask', message, message);
    },
    'LaunchRequest': function () {
        const self = this;
        self.emit('PortfolioIntent');
    },
    'QuoteIntent': function () {
        const self = this;
        const quoteStockName = self.event.request.intent.slots.Stock.value;
        request(stock.getClosestSymbolUrl(quoteStockName), function (error, response, body) {
            const bodyJson = JSON.parse(body);

            const results = bodyJson.ResultSet.Result;
            if (!results.length || error) {
                const errorMessage = `Could not find a symbol match for ${quoteStockName}.` + REPHRASE_PROMPT;
                console.log(errorMessage);
                self.emit(':tellWithCard', errorMessage, SKILL_NAME, imageObj);
                return;
            }

            const mostLikelyStock = results[0];
            const symbol = mostLikelyStock.symbol;
            const likelyStockName = mostLikelyStock.name;

            console.log('parsed symbol:', symbol);
            yahoo.quote({
                symbol: [symbol],
                modules: ['price'] // see the docs for the full list
            }, function (err, res) {
                if (err) {
                    self.emit(':tell', "Internet error retrieving stock information, " + err);
                }

                // current price from the quote response.
                const sharePrice = res.price.regularMarketPrice;
                const regularMarketChange = roundTwo(res.price.regularMarketChange);
                const message = `The last market price for ${likelyStockName}, symbol ${symbol}, was $${sharePrice}, with a recent change of $${regularMarketChange}`;

                self.emit(':tellWithCard', message, SKILL_NAME, imageObj)
            });
        });
    },
    'PortfolioIntent': function () {
        const self = this;
        const requestUrl = api.getPortfolio(portfolio.getUserFromEvent(self.event));
        const promise = api.createPromise(requestUrl, "GET");
        promise.then((res) => {
            portfolio.setPortfolio(res);

            const stockMap = portfolio.getStockMap();
            const symbols = Object.keys(stockMap);
            console.log('symbols: ' + symbols);

            co(function *() {

                // Gather and resolve promises simultaneously.
                const promises = symbols.map((symbol) => {
                    return Promise.resolve(yahoo.quote(symbol, ['price']).catch((err) => {
                        console.log('error getting quote for ', symbol, err);
                    }));
                });

                const res = yield promises;
                console.log(res);

                const stockMap = portfolio.getStockMap();
                const cashBalance = portfolio.getPortfolio()['Balance'];
                console.log('stockMap: ' + JSON.stringify(stockMap));

                let stockValue = 0;
                for (let i in res) {
                    // current price from the quote response.
                    if (res === undefined || !res[i].hasOwnProperty('price')) {
                        continue;
                    }
                    const quote = res[i];
                    const price = quote.price.regularMarketPrice;

                    console.log(quote.price.shortName, price);
                    stockValue += stockMap[symbols[i]] * price
                }

                let message = "";
                // Check if new account
                if (stockValue === 0 && cashBalance === stock.STARTING_BALANCE) {
                    message = stock.newPortfolioMessage(cashBalance);
                } else {
                    let stockArr = [];
                    Object.keys(stockMap).map((symb) => {
                        if (stockMap[symb] > 0) {
                            stockArr.push(`${stockMap[symb]} ${stock.getNameFromSymbol(symb)} shares`)
                        }
                    });

                    const stockString = stockArr.join(", ");
                    message = stock.portfolioMessage(stockString, stockValue, cashBalance);
                }
                console.log('portfolio message: ', message);
                self.emit(':ask', message + stock.ACTION_TEXT, stock.ACTION_TEXT);
            });
        }).catch(function (err) {
            // Portfolio API call failed...
            self.emit(':tell', "Internet Error getting portfolio: " + err)
        });
    },

    // ** TWO PHASE INTENTS BELOW ** //
    'BuyIntent': function () {
        const self = this;
        const amount = parseInt(self.event.request.intent.slots.Amount.value);
        const stockName = self.event.request.intent.slots.Stock.value;

        request(stock.getClosestSymbolUrl(stockName), function (error, response, body) {
            const bodyJson = JSON.parse(body);

            const results = bodyJson.ResultSet.Result;
            if (!results.length || error) {
                const errorMessage = `Could not find a symbol match for ${stockName}.` + REPHRASE_PROMPT;
                console.log(error, errorMessage);
                self.emit(':askWithCard',
                    errorMessage,
                    REPHRASE_PROMPT,
                    SKILL_NAME,
                    imageObj);
                return;
            }

            const mostLikelyStock = results[0];
            const symbol = mostLikelyStock.symbol;
            const likelyStockName = mostLikelyStock.name;
            console.log(`parsed most likely stockName/symbol: ${likelyStockName}/${symbol}`);

            yahoo.quote({
                symbol: [symbol],
                modules: ['price'] // see the docs for the full list
            }, function (err, quotes) {
                if (err) {
                    self.emit(':tellWithCard', "Internet error, " + err, SKILL_NAME, imageObj);
                    return;
                }

                self.attributes['lastStockName'] = likelyStockName;
                self.attributes['lastStockSymbol'] = symbol;
                self.attributes['lastStockPrice'] = quotes.price.regularMarketPrice;
                self.attributes['lastStockAmount'] = amount;

                const buyCost = roundTwo(self.attributes['lastStockPrice'] * self.attributes['lastStockAmount']);

                self.handler.state = states.BUYMODE;
                const buyString = `Buying ${self.attributes['lastStockAmount']} ${likelyStockName} will cost $${buyCost}. Continue?`;
                console.log('buyString: ', buyString);
                self.emit(':ask', buyString, buyString);
            });
        });
    },
    'SellIntent': function () {
        const self = this;
        const amount = parseInt(self.event.request.intent.slots.Amount.value);
        const stockName = self.event.request.intent.slots.Stock.value;

        request(stock.getClosestSymbolUrl(stockName), function (error, response, body) {
            const bodyJson = JSON.parse(body);

            const results = bodyJson.ResultSet.Result;
            if (!results.length || error) {
                const errorMessage = `Could not find a symbol match for ${stockName}.` + REPHRASE_PROMPT;
                console.log(error, errorMessage);
                self.emit(':tellWithCard', errorMessage, SKILL_NAME, imageObj);
                return;
            }

            const mostLikelyStock = results[0];
            const symbol = mostLikelyStock.symbol;
            const likelyStock = mostLikelyStock.name;
            console.log(`parsed most likely stockName/symbol: ${likelyStock}/${symbol}`);

            yahoo.quote({
                symbol: [symbol],
                modules: ['price'] // see the docs for the full list
            }, function (err, quotes) {
                if (err) {
                    self.emit(':tellWithCard', err, SKILL_NAME, imageObj);
                    return;
                }

                self.attributes['lastStockName'] = likelyStock;
                self.attributes['lastStockSymbol'] = symbol;
                self.attributes['lastStockPrice'] = quotes.price.regularMarketPrice;
                self.attributes['lastStockAmount'] = amount;

                const sellCost = roundTwo(self.attributes['lastStockPrice'] * self.attributes['lastStockAmount']);

                self.handler.state = states.SELLMODE;
                const sellString = `Selling ${self.attributes['lastStockAmount']} ${likelyStock} would yield $${sellCost}. Continue?`;
                console.log('sellString: ', sellString);
                self.emit(':ask', sellString, sellString);
            });
        });
    },

    'RestartIntent': function () {
        const self = this;
        self.handler.state = states.RESTARTMODE;
        const resetMessage = `Did you want to reset your account? This will set your balance back to ${stock.STARTING_BALANCE}. ${CONFIRM_MESSAGE}`;
        self.emit(':ask', resetMessage, resetMessage);
    },

    // ** AMAZON INTENTS BELOW ** //

    'AMAZON.StartOverIntent': function () {
        const self = this;
        self.emit("RestartIntent")
    },

    'AMAZON.HelpIntent': function () {
        const self = this;
        self.emit(':ask', HELP_MESSAGE, HELP_MESSAGE);
    },
    'AMAZON.CancelIntent': function () {
        const self = this;
        self.emit(':tell', STOP_MESSAGE);
    },
    'AMAZON.StopIntent': function () {
        const self = this;
        self.emit(':tell', STOP_MESSAGE);
    }
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers, sellHandlers, buyHandlers, restartHandlers);
    // alexa.dynamoDBTableName = 'StockSimulator'; // table not needed for tracking session attributes.
    alexa.execute();
};