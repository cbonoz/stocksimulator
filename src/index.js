'use strict';
const Alexa = require('alexa-sdk');
const yahoo = require('yahoo-finance');
const request = require('request');

const stock = require('./stock');

//=========================================================================================================================================
// Constants and variable declarations.
//=========================================================================================================================================

//Replace with your app ID (OPTIONAL).  You can find this value at the top of your skill's page on http://developer.amazon.com.  
//Make sure to enclose your value in quotes, like this: const APP_ID = "amzn1.ask.skill.bb4045e6-b3e8-4133-b650-72923c5980f1";
const APP_ID = 'amzn1.ask.skill.f56869d8-4f28-4773-8185-e5177218108e';

const SKILL_NAME = stock.APP_NAME;
const HELP_MESSAGE = stock.HELP_TEXT;
const STOP_MESSAGE = stock.EXIT_TEXT;
const WELCOME_MESSAGE = stock.WELCOME_TEXT;
const CONFIRM_MESSAGE = 'Are you sure? Say yes or no.';
const NO_SHARES_MESSAGE = "I didn't find any shares to sell.";

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
    STOCKMODE: '_STOCKMODE',  // Prompt the user to say the number of shares followed by the stock. For example, 100 AMZN.
    BUYMODE: '_BUYMODE',
    SELLMODE: '_SELLMODE',
    RESTARTMODE: '_RESTARTMODE'
};

const buyHandlers = Alexa.CreateStateHandler(states.BUYMODE, {
    'AMAZON.NoIntent': function () {
        const noMessage = 'Buy canceled.';
        this.emit(':ask', noMessage + HELP_MESSAGE, HELP_MESSAGE);
    },
    'AMAZON.YesIntent': function () {


        // stock and number of shares.
        const stock = this.attributes['currentStock'];
        const amount = this.attributes['currentAmount'];

        // Update the user portfolio.
        const stockMap = JSON.parse(this.attributes['stocks']);
        if (stockMap.has(stock)) {
            stockMap[stock] += amount;
        } else {
            stockMap[stock] = amount;
        }
        // Deduct from the account balance.
        this.attributes['balance'] -= this.attributes['currentCost'];
        this.attributes['stocks'] = JSON.stringify(stockMap);
        this.emit(':ask', `Successfully purchased ${amount} ${stock} shares. What now?`, HELP_MESSAGE);
    }
});

const sellHandlers = Alexa.CreateStateHandler(states.SELLMODE, {
    'AMAZON.NoIntent': function () {
        const noMessage = 'Sell canceled.';
        this.emit(':ask', noMessage + HELP_MESSAGE, HELP_MESSAGE);
    },
    'AMAZON.YesIntent': function () {
        // stock and number of shares.
        const stock = this.attributes['currentStock'];
        const amount = this.attributes['currentAmount'];

        // Update the user portfolio.
        const stockMap = JSON.parse(this.attributes['stocks']);
        if (stockMap.has(stock)) {
            stockMap[stock] -= amount;
        } else {
            this.emit(':ask', NO_SHARES_MESSAGE + HELP_MESSAGE, HELP_MESSAGE)
            stockMap[stock] = 0;
        }
        // Add to the account balance.
        this.attributes['balance'] += this.attributes['currentCost'];
        this.attributes['stocks'] = JSON.stringify(stockMap);
        this.emit(':ask', `Successfully sold ${amount} ${stock} shares. What now?`, HELP_MESSAGE);
    }
});

const restartHandlers = Alexa.CreateStateHandler(states.RESTARTMODE, {
    'AMAZON.NoIntent': function () {
        const noMessage = 'Reset canceled, what do you want to do now?';
        this.emit(':ask', noMessage, HELP_MESSAGE);
    },
    'AMAZON.YesIntent': function () {
        this.attributes['balance'] = stock.STARTING_BALANCE;
        this.attributes['stocks'] = '{}';
        this.emit(':ask', `Account reset to ${stock.STARTING_BALANCE}. What now?`, HELP_MESSAGE);
    },
});

const queryHandlers = {
    'LaunchRequest': function () {
        this.emit('NewPortfolioIntent');
    },
    'NewPortfolioIntent': function () {
        if (Object.keys(this.attributes).length === 0) { // Check if it's the first time the skill has been invoked
            this.attributes['balance'] = stock.STARTING_BALANCE;
            this.attributes['stocks'] = '{}';
            this.emit(':ask', WELCOME_MESSAGE + HELP_MESSAGE, HELP_MESSAGE);
        } else {
            const balance = this.attributes['balance'];
            this.emit(':ask', 'Welcome back. ' + stock.balanceMessage(balance) + HELP_MESSAGE, HELP_MESSAGE);
        }
    },
    'QuoteIntent': function () {
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
        const stockMap = JSON.parse(this.attributes['stocks']);
        const balance = this.attributes['balance'];
        console.log('stockMap: ' + JSON.stringify(stockMap));

        const self = this;
        // This replaces the deprecated snapshot() API
        const symbols = stockMap.keys();
        yahoo.quote({
            symbol: [symbols],
            modules: ['price', 'summaryDetail'] // see the docs for the full list
        }, function (err, res) {
            if (err) {
                self.emit(':tellWithCard', err, SKILL_NAME, imageObj)
            }

            let stockValue = 0;
            for (let quote in res) {
                // current price from the quote response.
                const price = quote.price.regularMarketPrice;

                console.log(quote.price.shortName, price);
                stockValue += stockMap[quote.price.symbol] * price
            }
            const message = stock.portfolioMessage(stockValue, balance);
            console.log('portfolio message: ', message);
            this.emit(':tellWithCard', message, SKILL_NAME, imageObj)
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

                const sharePrice = res.price.regularMarketPrice;
                const cost = amount * sharePrice;
                console.log(`sharePrice: ${sharePrice}`);

                self.attributes['currentStock'] = symbol;
                self.attributes['currentCost'] = cost;
                self.attributes['currentAmount'] = amount;
                const balance = self.attributes['balance'];

                if (cost <= balance) {
                    self.handler.state = states.BUYMODE;
                    self.emit(':ask', `Buying ${amount} ${symbol} will cost $${cost}. Continue?`, BUY_REPROMPT);
                } else {
                    const message = stock.insufficientBalance(cost, balance);
                    self.emit(':ask', message + BUY_REPROMPT, BUY_REPROMPT);
                }
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

                const sharePrice = res.price.regularMarketPrice;
                const cost = amount * sharePrice;
                console.log(`sharePrice: ${sharePrice}`);

                self.attributes['currentStock'] = symbol;
                self.attributes['currentCost'] = cost;
                self.attributes['currentAmount'] = amount;
                const balance = self.attributes['balance'];

                const stockMap = JSON.parse(self.attributes['stocks']);
                let currentShares;
                if (stockMap.has(symbol)) {
                    currentShares = stockMap[symbol];
                } else {
                    currentShares = 0;
                }

                if (amount <= currentShares) {
                    self.handler.state = states.SELLMODE;
                    self.emit(':ask', `Selling ${amount} ${symbol} will yield $${cost}. Continue?`, SELL_REPROMPT);
                } else {
                    const message = stock.insufficientShares(amount, currentShares, symbol);
                    self.emit(':ask', message + SELL_REPROMPT, SELL_REPROMPT);
                }
            });
        });
    },
    'RestartIntent': function () {
        this.handler.state = states.RESTARTMODE;
        const resetMessage = `This will reset your account and reset your balance to ${stock.STARTING_BALANCE}. {CONFIRM_MESSAGE}`;
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