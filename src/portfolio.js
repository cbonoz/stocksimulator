/**
 * Created by cbuonocore on 6/21/17.
 */
'use strict';
const library = (function () {

    let userId = null;
    let portfolio = {};

    function setPortfolio(p) {
        portfolio = p;
    }

    function updateHolding(stock, deltaShares, deltaBalance) {

        if (portfolio['balance'] + deltaBalance < 0) {
            return false;
        }

        // Update the portfolio.
        const stocks = portfolio['stock_holdings'];
        if (stocks.hasOwnProperty(stock)) {
            if (stocks[stock] + deltaShares < 0) {
                return false;
            }
            stocks[stock] += deltaShares;
        } else {
            if (deltaShares < 0) {
                return false;
            }
            stocks[stock] = deltaShares;
        }

        portfolio['balance'] += deltaBalance;

        return true; // user shouldn't have below 0 balance.
    }

    function getPortfolio() {
        return p;
    }

    function setUser(u) {
        userId = u;
    }

    function getUser() {
        return userId;
    }


    return {
        updatePortfolio: updateHolding,
        setUser: setUser,
        getUser: getUser,
        setPortfolio: setPortfolio,
        getPortfolio: getPortfolio,
    };

})();
module.exports = library;

