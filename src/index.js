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

const BUY_REPROMPT = "Say a number of shares to buy followed by the stock, such as 'buy 100 shares of amazon', or say cancel.";
const SELL_REPROMPT = "Say a number of shares to sell followed by the stock, like 'sell 200 shares of google', or say cancel.";


const imageObj = {
    smallImageUrl: './img/stock_sim_108.png',
    largeImageUrl: './img/stock_sim_512.png',
};

//=========================================================================================================================================
// Skill logic below
//=========================================================================================================================================

const states = {
    MAINSTATE: '_MAINSTATE',
    BUYMODE: '_BUYMODE',
    SELLMODE: '_SELLMODE',
    RESTARTMODE: '_RESTARTMODE'
};

function clearState(alexaContext) {
    alexaContext.handler.state = '';
    alexaContext.attributes['STATE'] = undefined;
}

const buyHandlers = Alexa.CreateStateHandler(states.BUYMODE, {
    'AMAZON.NoIntent': function () {
        const self = this;
        clearState(self);
        const noMessage = 'Cancelled sell order - ';
        self.emit(':ask', noMessage + HELP_MESSAGE, HELP_MESSAGE);
    },
    'AMAZON.YesIntent': function () {
        const self = this;
        clearState(self);

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
            request.post({url: requestUrl, form: portfolio.getPortfolio()}, (err, res, body) => {
                if (err) {
                    self.emit("Error buying stock: " + err);
                }

                self.emit(':ask', `Successfully purchased ${lastStockAmount} ${lastStockName} shares. What now?`, HELP_MESSAGE);

            });
        }).catch(function (err) {
            // Portfolio API call failed...
            self.emit(':tell', "Error getting portfolio: " + err)
        });
    },
    'Unhandled': function() {
        const self = this;
        const message = "Sorry I didn't get that. Say yes to buy or no to cancel";
        self.emit(':ask', message, message);
    }
});

const sellHandlers = Alexa.CreateStateHandler(states.SELLMODE, {
    'AMAZON.NoIntent': function () {
        const self = this;
        clearState(self);
        const noMessage = 'Cancelled buy order - ';
        self.emit(':ask', noMessage + HELP_MESSAGE, HELP_MESSAGE);
    },
    'AMAZON.YesIntent': function () {
        const self = this;
        clearState(self);

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
            request.post({url: requestUrl, form: portfolio.getPortfolio()}, (err, res, body) => {
                if (err) {
                    self.emit(":tell", "Error selling stock: " + err);
                }

                self.emit(':ask', `Successfully sold ${lastStockAmount} ${lastStockName} shares. What now?`, HELP_MESSAGE);

            });
        }).catch(function (err) {
            // Portfolio API call failed...
            self.emit(':tell', "Error getting portfolio: " + err)
        });
    },
    'Unhandled': function() {
        const self = this;
        const message = "Sorry I didn't get that. Say yes to sell or no to cancel";
        self.emit(':ask', message, message);
    }
});

const restartHandlers = Alexa.CreateStateHandler(states.RESTARTMODE, {
    'AMAZON.NoIntent': function () {
        const self = this;
        clearState(self);
        const noMessage = 'Reset canceled, what do you want to do now?';
        self.emit(':ask', noMessage, HELP_MESSAGE);
    },
    'AMAZON.YesIntent': function () {
        const self = this;
        clearState(self);
        const requestUrl = api.getStartOver(portfolio.getUserFromEvent(self.event));
        const promise = api.createPromise(requestUrl, "GET");
        promise.then((res) => {
            self.emit(':ask', `Successfully reset account and balance. What now?`, HELP_MESSAGE);
        }).catch((err) => {
            self.emit(':tell', "Error resetting account balance: " + err);
        })
    },
    'Unhandled': function () {
        const self = this;
        const message = "Sorry I didn't get that. Say yes to restart your account or no to cancel";
        self.emit(':ask', message, message);
    }
});



const handlers = {
    'Unhandled': function () {
        console.log("UNHANDLED");
        const self = this;
        const message = HELP_MESSAGE;
        clearState(self);
        self.emit(':ask', message, message);
    },
    'LaunchRequest': function () {
        const self = this;
        clearState(self);
        self.emit('PortfolioIntent');
    },
    'QuoteIntent': function () {
        const self = this;
        clearState(self);
        const stockName = self.event.request.intent.slots.Stock.value;
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
                modules: ['price'] // see the docs for the full list
            }, function (err, res) {
                if (err) {
                    self.emit(':tellWithCard', err, SKILL_NAME, imageObj)
                }

                // current price from the quote response.
                const sharePrice = res.price.regularMarketPrice;
                const regularMarketChange = Math.round(res.price.regularMarketChange * 100) / 100;
                const message = `The last market price for ${symbol} was $${sharePrice}, with a recent change of ${regularMarketChange}`;

                self.emit(':tellWithCard', message, SKILL_NAME, imageObj)
            });
        });
    },
    'PortfolioIntent': function () {
        const self = this;
        clearState(self);
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

                let message = "";
                // Check if new account
                if (stockValue === 0 && balance === stock.STARTING_BALANCE) {
                    message = stock.newPortfolioMessage(balance);
                } else {
                    message = stock.portfolioMessage(stockMap, stockValue, balance);
                }
                console.log('portfolio message: ', message);
                self.emit(':ask', message, message);
            });
        }).catch(function (err) {
            // Portfolio API call failed...
            self.emit(':tell', "Error getting portfolio: " + err)
        });
    },

    // Two phase intents below:

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
                clearState(self);
                self.emit(':tellWithCard', errorMessage, SKILL_NAME, imageObj)
            }

            const mostLikelyStock = results[0];
            const symbol = mostLikelyStock.symbol;
            const stockName = mostLikelyStock.name;
            console.log(`parsed most likely stockName/symbol: ${stockName}/${symbol}`);

            yahoo.quote({
                symbol: [symbol],
                modules: ['price'] // see the docs for the full list
            }, function (err, quotes) {
                if (err) {
                    self.emit(':tellWithCard', err, SKILL_NAME, imageObj)
                }

                self.attributes['lastStockName'] = stockName;
                self.attributes['lastStockSymbol'] = symbol;
                self.attributes['lastStockPrice'] = quotes.price.regularMarketPrice;
                self.attributes['lastStockAmount'] = amount;

                self.handler.state = states.BUYMODE;
                self.emitWithState(':ask', `Buying ${self.attributes['lastStockAmount']} ${stockName} will cost $${self.attributes['lastStockPrice'] * self.attributes['lastStockAmount']}. Continue?`
                    , BUY_REPROMPT);
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
                clearState(self);
                self.emit(':tellWithCard', errorMessage, SKILL_NAME, imageObj)
            }

            const mostLikelyStock = results[0];
            const symbol = mostLikelyStock.symbol;
            const stockName = mostLikelyStock.name;
            console.log(`parsed most likely stockName/symbol: ${stockName}/${symbol}`);

            yahoo.quote({
                symbol: [symbol],
                modules: ['price'] // see the docs for the full list
            }, function (err, quotes) {
                if (err) {
                    self.emit(':tellWithCard', err, SKILL_NAME, imageObj)
                }

                self.attributes['lastStockName'] = stockName;
                self.attributes['lastStockSymbol'] = symbol;
                self.attributes['lastStockPrice'] = quotes.price.regularMarketPrice;
                self.attributes['lastStockAmount'] = amount;

                self.handler.state = states.SELLMODE;
                self.emitWithState(':ask', `Selling ${self.attributes['lastStockAmount']} ${stockName} would yield $${self.attributes['lastStockPrice'] * self.attributes['lastStockAmount']}. Continue?`
                    , SELL_REPROMPT);
            });
        });
    },

    'RestartIntent': function () {
        const self = this;
        self.handler.state = states.RESTARTMODE;
        const resetMessage = `Did you want to reset your account? This will set your balance back to ${stock.STARTING_BALANCE}. ${CONFIRM_MESSAGE}`;
        self.emitWithState(':ask', resetMessage, resetMessage);
    },

    // ** AMAZON INTENTS BELOW ** //

    'AMAZON.StartOverIntent': function () {
        const self = this;
        self.emit("RestartIntent")
    },

    'AMAZON.HelpIntent': function () {
        const self = this;
        clearState(self);
        self.emit(':ask', HELP_MESSAGE, HELP_MESSAGE);
    },
    'AMAZON.CancelIntent': function () {
        const self = this;
        clearState(self);
        self.emit(':tell', STOP_MESSAGE);
    },
    'AMAZON.StopIntent': function () {
        const self = this;
        clearState(self);
        self.emit(':tell', STOP_MESSAGE);
    },
    'SessionEndedRequest': function () {
        const self = this;
        console.log('session ended!');
        clearState(self);
        self.emit(':saveState', true);
    },
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers, sellHandlers, buyHandlers, restartHandlers);
    // alexa.dynamoDBTableName = 'StockSimulator'; // table not needed for tracking session attributes.
    alexa.execute();
};