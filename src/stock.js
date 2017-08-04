'use strict';
const library = (function () {

    const appName = 'Stock Simulator';
    const welcomeText = "Welcome to " + appName + ". I am a verbal simulator for stock trading.";
    const actionText = "You can perform an action like 'buy 100 AMAZON', or 'sell 100 GOOGLE'.";
    const helpText = "You can say 'my portfolio' for current balance information, or " + actionText;
    const exitText = 'Closed ' + appName + ".";
    const noResultsText = "Could not find any results for: ";
    const authErrorText = "There was an authentication issue while retrieving your information, please reinstall " +
        "or re-authenticate the alexa app";
    const askAgainText = "Ask me something else?";
    const serverErrorText = "Could not retrieve information from server. " + askAgainText;
    const startingBalance = 25000;

    function getClosestSymbolUrl(stockName)  {
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

    function portfolioMessage(stockValue, cashValue) {
        return `You currently have ${stockValue} worth of stock and $${cashValue} in your account, for a total value of ${totalValue}.`
    }

    function newPortfolioMessage(cashValue) {
        return `${welcomeText}. You are starting with a new account with $${cashValue} in your account. ${actionText}`;
    }

    const cid = 'amzn1.application-oa2-client.9067f49fda8e4332916bb47dd513e34e';
    const csec = '2c8e3c5602f72efb91e72f94206cef7e2351ad9c5addbaffb8bdf0cdfd630d7';

    const hello = () => {
        return 'hello';
    };

    return {
        APP_NAME: appName,
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