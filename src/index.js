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

const imageObj = {
    smallImageUrl: './img/stock_sim_108.png',
    largeImageUrl: './img/stock_sim_512.png',
};

let conversationStateMap = {};

//=========================================================================================================================================
// Skill logic below
//=========================================================================================================================================

const states = {
    MAINSTATE: 'M',
    BUYSTATE: 'B',
    SELLSTATE: 'S',
    RESTARTSTATE: 'R'
};

function setState(event, state) {
    const userId = portfolio.getUserFromEvent(event);
    conversationStateMap[userId] = state;
    console.log('setState:', userId, ' in state ', state);
}

function getState(event) {
    const userId = portfolio.getUserFromEvent(event);
    const state = conversationStateMap.hasOwnProperty(userId) ? conversationStateMap[userId] : states.MAINSTATE;
    console.log('getState:', userId, state);
    return state;
}

const handlers = {
    'Unhandled': function () {
        const self = this;
        console.log("UNHANDLED");
        let message = "";
        switch (getState(self.event)) {
            case states.BUYSTATE:
                message = "Say yes to buy or no to cancel";
                break;
            case states.SELLSTATE:
                message = "Say yes to sell or no to cancel";
                break;
            case states.RESTARTSTATE:
                message = "Say yes to restart your account or no to cancel";
                break;
            default: // MAINSTATE
                message = HELP_MESSAGE;
                break;
        }
        message = "Sorry I didn't get that. " + message;
        this.emit(':ask', message, message);
    },

    'AMAZON.YesIntent': function () {
        const self = this;
        switch (getState(self.event)) {
            case states.BUYSTATE:
                self.emit('YesBuyIntent');
                break;
            case states.SELLSTATE:
                self.emit('YesSellIntent');
                break;
            case states.RESTARTSTATE:
                self.emit('YesRestartIntent');
                break;
            default: // MAINSTATE
                self.emit('AMAZON.HelpIntent');
                break;
        }
    },

    'AMAZON.NoIntent': function () {
        const self = this;
        switch (getState(self.event)) {
            case states.BUYSTATE:
                self.emit('NoBuyIntent');
                break;
            case states.SELLSTATE:
                self.emit('NoSellIntent');
                break;
            case states.RESTARTSTATE:
                self.emit('NoRestartIntent');
                break;
            default: // MAINSTATE
                self.emit('AMAZON.HelpIntent');
                break;
        }
    },
    'NoBuyIntent': function () {
        const self = this;
        setState(self.event, states.MAINSTATE);
        const noMessage = 'Cancelled sell order - ';
        self.emit(':ask', noMessage + HELP_MESSAGE, HELP_MESSAGE);
    },
    'YesBuyIntent': function () {
        const self = this;
        setState(self.event, states.MAINSTATE);

        const lastStockAmount = self.attributes['lastStockAmount'];
        const lastStockPrice = self.attributes['lastStockPrice'];
        const lastStockSymbol = self.attributes['lastStockSymbol'];
        const lastStockName = self.attributes['lastStockName'];
        self.attributes = {};

        const requestUrl = api.getPortfolio(portfolio.getUserFromEvent(this.event));
        const promise = api.createPromise(requestUrl, "GET");
        promise.then((res) => {
            const myPortfolio = res;
            portfolio.setPortfolio(myPortfolio);
            const purchaseTotal = lastStockPrice * lastStockAmount;

            // Attempt to update with the buy transaction (returns false if impossible).
            if (!portfolio.updateHolding(lastStockSymbol, lastStockAmount, -purchaseTotal)) {
                self.emit(":tell", `You need $${purchaseTotal - myPortfolio['Balance']} to complete this purchase`);
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
                    self.emit("Error buying stock: " + err);
                }
                const remainingCapital = myPortfolio['Balance'] - purchaseTotal;

                self.emit(':askWithCard',
                    `Successfully purchased ${lastStockAmount} ${lastStockName} shares, you have $${remainingCapital} remaining. What next?`,
                    HELP_MESSAGE,
                    SKILL_NAME,
                    imageObj
                );

            });
        }).catch(function (err) {
            // Portfolio API call failed...
            self.emit(':tell', "Error getting portfolio: " + err)
        });
    },

    'NoSellIntent': function () {
        const self = this;
        setState(self.event, states.MAINSTATE);
        const noMessage = 'Cancelled buy order - ';
        self.emit(':ask', noMessage + HELP_MESSAGE, HELP_MESSAGE);
    },
    'YesSellIntent': function () {
        const self = this;
        setState(self.event, states.MAINSTATE);

        const requestUrl = api.getPortfolio(portfolio.getUserFromEvent(self.event));
        const promise = api.createPromise(requestUrl, "GET");

        const lastStockAmount = self.attributes['lastStockAmount'];
        const lastStockPrice = self.attributes['lastStockPrice'];
        const lastStockSymbol = self.attributes['lastStockSymbol'];
        const lastStockName = self.attributes['lastStockName'];
        self.attributes = {};

        promise.then((res) => {
            portfolio.setPortfolio(res);
            const stockMap = portfolio.getStockMap();

            const saleTotal = lastStockPrice * lastStockAmount;

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
                    self.emit(":tell", "Error selling stock: " + err);
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
            self.emit(':tell', "Error getting portfolio: " + err)
        });
    },
    'NoRestartIntent': function () {
        const self = this;
        setState(self.event, states.MAINSTATE);
        const noMessage = 'Reset canceled, what do you want to do now?';
        self.emit(':ask', noMessage, HELP_MESSAGE);
    },
    'YesRestartIntent': function () {
        const self = this;
        setState(self.event, states.MAINSTATE);
        const requestUrl = api.getStartOver(portfolio.getUserFromEvent(self.event));
        const promise = api.createPromise(requestUrl, "GET");
        promise.then((res) => {
            console.log(res);
            self.emit(':ask', `Successfully reset account and balance. What now?`, HELP_MESSAGE);
        }).catch((err) => {
            self.emit(':tell', "Error resetting account balance: " + err);
        })
    },
    'LaunchRequest': function () {
        const self = this;
        setState(self.event, states.MAINSTATE);
        self.emit('PortfolioIntent');
    },
    'QuoteIntent': function () {
        const self = this;
        setState(self.event, states.MAINSTATE);
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
                    self.emit(':tell', "Web error retrieving stock information, " + err);
                }

                // current price from the quote response.
                const sharePrice = res.price.regularMarketPrice;
                const regularMarketChange = Math.round(res.price.regularMarketChange * 100) / 100;
                const message = `The last market price for ${likelyStockName}, symbol ${symbol}, was $${sharePrice}, with a recent change of $${regularMarketChange}`;

                self.emit(':tellWithCard', message, SKILL_NAME, imageObj)
            });
        });
    },
    'PortfolioIntent': function () {
        const self = this;
        setState(self.event, states.MAINSTATE);
        const requestUrl = api.getPortfolio(portfolio.getUserFromEvent(this.event));
        const promise = api.createPromise(requestUrl, "GET");
        promise.then((res) => {
            portfolio.setPortfolio(res);

            const stockMap = portfolio.getStockMap();
            const symbols = Object.keys(stockMap);
            console.log('symbols: ' + symbols);

            co(function *() {

                // Gather and resolve promises simultaneously.
                const promises = symbols.map((symbol) => {
                    return Promise.resolve(yahoo.quote(symbol, ['price']));
                });

                const res = yield promises;
                console.log(res);

                const stockMap = portfolio.getStockMap();
                const cashBalance = portfolio.getPortfolio()['Balance'];
                console.log('stockMap: ' + JSON.stringify(stockMap));

                let stockValue = 0;
                for (let i in res) {
                    // current price from the quote response.
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
                        stockArr.push(`${stockMap[symb]} ${stock.getNameFromSymbol(symb)} shares`)
                    });

                    const stockString = stockArr.join(", ");
                    message = stock.portfolioMessage(stockString, stockValue, cashBalance);
                }
                console.log('portfolio message: ', message);
                self.emit(':ask', message + stock.ACTION_TEXT, stock.ACTION_TEXT);
            });
        }).catch(function (err) {
            // Portfolio API call failed...
            self.emit(':tell', "Error getting portfolio: " + err)
        });
    },

    // Two phase intents below:

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
                setState(self.event, states.MAINSTATE);
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
                    self.emit(':tellWithCard', err, SKILL_NAME, imageObj);
                    return;
                }

                self.attributes['lastStockName'] = likelyStockName;
                self.attributes['lastStockSymbol'] = symbol;
                self.attributes['lastStockPrice'] = quotes.price.regularMarketPrice;
                self.attributes['lastStockAmount'] = amount;

                setState(self.event, states.BUYSTATE);
                const buyString = `Buying ${self.attributes['lastStockAmount']} ${likelyStockName} will cost $${self.attributes['lastStockPrice'] * self.attributes['lastStockAmount']}. Continue?`;
                self.emit(':ask', buyString, buyString);
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
                const errorMessage = `Could not find a symbol match for ${stockName}.` + REPHRASE_PROMPT;
                console.log(error, errorMessage);
                setState(self.event, states.MAINSTATE);
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

                setState(self.event, states.SELLSTATE);
                const sellString = `Selling ${self.attributes['lastStockAmount']} ${likelyStock} would yield $${self.attributes['lastStockPrice'] * self.attributes['lastStockAmount']}. Continue?`;
                self.emit(':ask', sellString, sellString);
            });
        });
    },

    'RestartIntent': function () {
        const self = this;
        setState(self.event, states.RESTARTSTATE);
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
        setState(self.event, states.MAINSTATE);
        self.emit(':ask', HELP_MESSAGE, HELP_MESSAGE);
    },
    'AMAZON.CancelIntent': function () {
        const self = this;
        setState(self.event, states.MAINSTATE);
        self.emit(':tell', STOP_MESSAGE);
    },
    'AMAZON.StopIntent': function () {
        const self = this;
        setState(self.event, states.MAINSTATE);
        self.emit(':tell', STOP_MESSAGE);
    },
    'SessionEndedRequest': function () {
        const self = this;
        console.log('session ended!');
        const userId = portfolio.getUserFromEvent(self.event);
        if (conversationStateMap.hasOwnProperty(userId)) {
            delete conversationStateMap[userId];
        }
    },
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers); // , sellHandlers, buyHandlers, restartHandlers);
    // alexa.dynamoDBTableName = 'StockSimulator'; // table not needed for tracking session attributes.
    alexa.execute();
};