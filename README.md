# StockSimulator Alexa Skill 
<img src="https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/fact/header._TTH_.png" />

## What does this app do? 
* Users can set up their own virtual stock portfolios by making verbal market and sell orders.
* Each user starts with $25k to purchase public stocks at last market values. 
* Stock prices are retrieved in real-time using yahoo finance api's.
* If you go poor or bankrupt, no worries. You can always start over by saying 'restart'.
* Natural Language processing search allows translation from company names to stock tickers behind the scenes.

Stock Simulator
-
Each user starts with $100,000 to purchase public and trade stocks in a virtual portfolio.
Stock prices are retrieved in real-time from the internet.
If you go poor or bankrupt, no worries. You can always start over by saying 'restart' or 'start over'.
App will automatically translate the company name you say to the best match stock ticker behind the scenes.

How to play:
---

* YOU: Alexa, open stock simulator.
* ALEXA: Welcome to stock simulator. You have a new account with $100,000 available. What would you like to do?
* YOU: give me an Tesla quote.
* ALEXA: The last market price for Tesla Inc, symbol TSLA, was $360.25, with a recent change of $4.70.
* YOU: Alexa, ask stock simulator to buy 100 shares of Tesla.
* ALEXA: Buying 100 shares of Tesla will cost $36,025.00. Continue?
* YOU: Yes
* ALEXA: Successfully bought 100 shares of tesla. 
* YOU: Alexa, ask stock simulator to sell 50 shares of tesla.
* ALEXA: Selling 50 shares of Tesla will cost $X. Continue?
* YOU: Yes
* ALEXA: Successfully sold 100 shares of tesla.
* YOU: Alexa, ask stock simulator for my portfolio.
* ALEXA: You have 50 TSLA and $81,987.50 in your account for a total value of $X.

And so on....

Commands:
---

* "Alexa, ask Stock Simulator for my portfolio"
* "Alexa, ask Stock Simulator to buy 100 shares of amazon."
* "Alexa, ask Stock Simulator to sell 200 shares of tesla."
* "Alexa, ask Stock Simulator for the current amazon share price"
* "Alexa, ask Stock Simulator to reset"

Alexa will respond to all of these requests with responses like these:

* "You currently have 100 amazon, 200 tesla in your account with $25000 in your account, for a net value of $200,000.
* "Buying 100 amazon will cost $100,000. Continue?" (or 'not enough balance remaining' message)
* "Selling 200 tesla will yield $60,000. Continue?"
* "The last regular market price of amazon inc., symbol AMZN, was $1000 with a recent change of $5.00"

### Dev Notes

Installing App Dependencies:
```
cd src/ 
npm install
```
Prepare for aws submission (run zip command from /src): 
```
 zip -r -X ../src.zip *
```
