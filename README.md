# StockSimulator Alexa Skill 
<img src="https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/fact/header._TTH_.png" />

[![Voice User Interface](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/navigation/1-off._TTH_.png)](https://github.com/alexa/skill-sample-nodejs-fact/blob/master/step-by-step/1-voice-user-interface.md)[![Lambda Function](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/navigation/2-off._TTH_.png)](https://github.com/alexa/skill-sample-nodejs-fact/blob/master/step-by-step/2-lambda-function.md)[![Connect VUI to Code](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/navigation/3-off._TTH_.png)](https://github.com/alexa/skill-sample-nodejs-fact/blob/master/step-by-step/3-connect-vui-to-code.md)[![Testing](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/navigation/4-off._TTH_.png)](https://github.com/alexa/skill-sample-nodejs-fact/blob/master/step-by-step/4-testing.md)[![Customization](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/navigation/5-off._TTH_.png)](https://github.com/alexa/skill-sample-nodejs-fact/blob/master/step-by-step/5-customization.md)[![Publication](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/navigation/6-off._TTH_.png)](https://github.com/alexa/skill-sample-nodejs-fact/blob/master/step-by-step/6-publication.md)

## What does this app do? 
* Users can set up their own virtual stock portfolios by making verbal market and sell orders.
* Each user starts with 25k to purchase any stock they want.
* Stock prices are retrieved in real-time using yahoo finance api's.
* If you go poor or bankrupt, no worries. You can always start over by saying 'restart'.
* Natural Language processing search allows translation from company names to stock tickers behind the scenes.

## To install. 
"""
*  cd src/ 
*  npm install
"""

## Ok, how do I interact with Stock Simulator? 

*  "Alexa, ask Stock Simulator for my portfolio"
*  "Alexa, ask Stock Simulator to buy 100 amazon."
*  "Alexa, ask Stock Simulator to sell 200 tesla."
*  "Alexa, ask Stock Simulator for amazon quote"

Alexa will respond to all of these requests with responses like these:

*  "You currently have 100 amazon shares, 200 tesla shares, and $2500 in your account, for a total current market value of $X.
*  "Buying 100 amazon will cost $100,000. Continue?"
*  "Selling 200 tesla will yield $60,000. Continue?"
*  "The last regular market price of amazon was $1000."

