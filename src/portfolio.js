/**
 * Created by cbuonocore on 6/21/17.
 */
'use strict';
const library = (function () {

    let userId = null;
    let portfolio = {};

    function getStockMap() {
        return JSON.parse(portfolio['StockMap']);
    }

    function setPortfolio(p) {
        if (p['StockMap'] === null || p['StockMap'] === '') {
            p['StockMap'] = '{}';
        }
        portfolio = p;
    }

    function updateHolding(stock, deltaShares, deltaBalance) {

        if (portfolio['Balance'] + deltaBalance < 0) {
            return false;
        }

        // Update the portfolio.
        const stockMap = getStockMap();
        if (!stockMap.hasOwnProperty(stock)) {
            stockMap[stock] = 0;
            if (deltaShares < 0) {
                return false;
            }
        }

        if (stockMap[stock] + deltaShares < 0) {
            return false;
        }

        stockMap[stock] += deltaShares;

        portfolio['StockMap'] = JSON.stringify(stockMap);
        portfolio['Balance'] += deltaBalance;

        return true; // user shouldn't have below 0 balance.
    }

    function getPortfolio() {
        return portfolio;
    }

    function setUser(u) {
        userId = u;
    }

    function getUser() {
        return userId;
    }

    function getUserFromEvent(event) {
        const userId = event.session.user.userId;
        const startIndex = Math.max(userId.length - 20, 0);
        return userId.substr(startIndex);
    }

    return {
        updateHolding: updateHolding,
        setUser: setUser,
        getUser: getUser,
        setPortfolio: setPortfolio,
        getPortfolio: getPortfolio,
        getUserFromEvent: getUserFromEvent,
        getStockMap: getStockMap,
    };

})();
module.exports = library;

