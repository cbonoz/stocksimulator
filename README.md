# StockSimulator Alexa Skill 
<img src="https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/fact/header._TTH_.png" />

## What does this app do? 
* Users can set up their own virtual stock portfolios by making verbal market and sell orders.
* Each user starts with $25k to purchase public stocks at last market values. 
* Stock prices are retrieved in real-time using yahoo finance api's.
* If you go poor or bankrupt, no worries. You can always start over by saying 'restart'.
* Natural Language processing search allows translation from company names to stock tickers behind the scenes.


## Ok, so how do I interact with Stock Simulator? 

Each user starts with $100,000 to purchase public and trade stocks in a virtual portfolio.
Stock prices are retrieved in real-time using yahoo finance API's.
If you go poor or bankrupt, no worries. You can always start over by saying 'restart' or 'start over'.
Language processing will automatically translate from your stated company name to the individual stock tickers behind the scenes.

Ok, so how do I interact with Stock Simulator?

* "Alexa, ask Stock Simulator for my portfolio"
* "Alexa, ask Stock Simulator to buy 100 shares of amazon."
* "Alexa, ask Stock Simulator to sell 200 shares of tesla."
* "Alexa, ask Stock Simulator for the current amazon share price"

Alexa will respond to all of these requests with responses like these:

* "You currently have 100 amazon, 200 tesla in your account with $25000 in your account, for a net value of $200,000.
* "Buying 100 amazon will cost $100,000. Continue?" (or 'not enough balance remaining' message)
* "Selling 200 tesla will yield $60,000. Continue?"
* "The last regular market price of amazon was $1000."

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
