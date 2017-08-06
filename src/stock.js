'use strict';
const library = (function () {

    const appName = 'Stock Simulator';
    const welcomeText = "Welcome to " + appName + ". I am a verbal simulator for stock trading.";
    const actionText = "You can say something like 'buy 100 shares of AMAZON', or 'sell 100 shares of TESLA'.";
    const helpText = "You can ask 'my portfolio', or " + actionText;
    const exitText = 'Closed ' + appName + ".";
    const noResultsText = "Could not find any results for: ";
    const authErrorText = "There was an authentication issue while retrieving your information, please reinstall " +
        "or re-authenticate the alexa app";
    const askAgainText = "Ask me something else?";
    const serverErrorText = "Could not retrieve information from server. " + askAgainText;
    const startingBalance = 100000;

    function getClosestSymbolUrl(stockName) {
        return `http://d.yimg.com/aq/autoc?query=${stockName}&region=US&lang=en-US`;
    }

    function insufficientShares(amount, currentShares, stock) {
        return `Can't sell ${amount}. You currently only have ${currentShares} of ${stock}.`;
    }

    function insufficientBalance(cost, balance) {
        return `You need ${cost} to make that purchase, you currently have ${balance}.`;
    }

    function balanceMessage(balance) {
        return `You currently have ${balance} available, what would you like to do?`;
    }

    function portfolioMessage(stockMap, stockValue, cashValue) {
        stockValue = Math.round(stockValue * 100) / 100;
        cashValue = Math.round(cashValue * 100) / 100;

        let stockArr = [];
        Object.keys(stockMap).map((stock) => {
            stockArr.push(`${stockMap[stock]} ${stock} shares`)
        });

        const stockString = stockArr.join(", ");

        return `Hello, here is your portfolio: You own ${stockString}, alongside $${cashValue} in capital - ` +
            `for a total account value of $${stockValue + cashValue}.`;
    }

    function newPortfolioMessage(cashValue) {
        return `${welcomeText} You have a new account with $${cashValue} available.`;
    }

    const cid = 'amzn1.application-oa2-client.9067f49fda8e4332916bb47dd513e34e';
    const csec = '2c8e3c5602f72efb91e72f94206cef7e2351ad9c5addbaffb8bdf0cdfd630d7';

    const hello = () => {
        return 'hello';
    };

    return {
        APP_NAME: appName,
        ACTION_TEXT: actionText,
        WELCOME_TEXT: welcomeText,
        HELP_TEXT: helpText,
        EXIT_TEXT: exitText,
        AUTH_ERROR_TEXT: authErrorText,
        SERVER_ERROR_TEXT: serverErrorText,
        NO_RESULTS_TEXT: noResultsText,
        ASK_AGAIN_TEXT: askAgainText,
        CID: cid,
        CSEC: csec,
        hello: hello,
        getClosestSymbolUrl: getClosestSymbolUrl,
        balanceMessage: balanceMessage,
        insufficientShares: insufficientShares,
        insufficientBalance: insufficientBalance,
        portfolioMessage: portfolioMessage,
        newPortfolioMessage: newPortfolioMessage,
        STARTING_BALANCE: startingBalance
    };

})();
module.exports = library;