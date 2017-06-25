# StockSimulator Alexa Skill 
<img src="https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/fact/header._TTH_.png" />

## What does this app do? 
* Users can set up their own virtual stock portfolios by making verbal market and sell orders.
* Each user starts with 25k to purchase public stocks at last market values. 
* Stock prices are retrieved in real-time using yahoo finance api's.
* If you go poor or bankrupt, no worries. You can always start over by saying 'restart'.
* Natural Language processing search allows translation from company names to stock tickers behind the scenes.


## Ok, so how do I interact with Stock Simulator? 

*  "Alexa, ask Stock Simulator for my portfolio"
*  "Alexa, ask Stock Simulator to buy 100 amazon."
*  "Alexa, ask Stock Simulator to sell 200 tesla."
*  "Alexa, ask Stock Simulator for amazon quote"

Alexa will respond to all of these requests with responses like these:

*  "You currently have 100 amazon shares, 200 tesla shares, and $2500 in your account, for a total current market value of $X.
*  "Buying 100 amazon will cost $100,000. Continue?"
*  "Selling 200 tesla will yield $60,000. Continue?"
*  "The last regular market price of amazon was $1000."

### Dev Notes

Installing App Dependencies.
```
cd src/ 
npm install
```

