'use strict';
const request = require("request");
const sanitizer = require("sanitize")();
const dateformat = require("dateformat");
const uniqid = require('uniqid');

const Strings = {
    Errors: { 
        OOPS: 'Oops...we have detected an issue, please try again.'
    },
    Stations: {
        LOWEST_FUEL_PRICE: (price, stationName) => { return 'The cheapest fuel in your area is '+ price + ' at '+ stationName },
        NO_STATIONS_FOUND: 'Sorry we dont have any stations in your area.',
        Errors: {
            INVALID_LOCATION_FOUND: 'Only postcodes are supported, please provide a valide postcode',
            NO_LOCATION_FOUND: 'Please specify a location, example https://wt-.../getFuel?location=2000'
        }
    },
};

const StationService = {
    getCheapestFuelPrice: (location, fuelAPIKey, fuelAccessToken, onComplete) => {
        request.post({
            "headers": { 
                "apikey": fuelAPIKey,
                "transactionid": uniqid,
                "requesttimestamp": dateformat(new Date(),"dd/mm/yyyy hh:MM:ss TT"),
                "Authorization": "Bearer " + fuelAccessToken,
                "Content-Type": "application/json"
                //"Accept": "application/json"
            },
            "url": "https://api.onegov.nsw.gov.au/FuelPriceCheck/v1/fuel/prices/location",
            "body": JSON.stringify({
                "fueltype":"P95",
                "namedlocation": location,
                "sortby": "price",
                "sortascending":"true"
            })
        }, (error, response, body) => {
            body = JSON.parse(body);
            if(body.errorDetails) { 
                // Make sure process all the errors in the array!
                console.error(body.errorDetails);
                return onComplete(Strings.Errors.OOPS);
            }

            if (body.stations.length > 0) {
                let station = body.stations.filter(item => item.code === body.prices[0].stationcode);
                return onComplete(Strings.Stations.LOWEST_FUEL_PRICE(body.prices[0].price, station[0].name));
            }
            
            return onComplete(Strings.Stations.NO_STATIONS_FOUND);
        });
    }
};

module.exports = function(context, cb) {
    //Sanitize and validate query input
    let location = sanitizer.value(context.query.location, 'int');
    if (!location) return cb(null, Strings.Stations.Errors.NO_LOCATION_FOUND);
    if (isNaN(location)) return cb(null, Strings.Stations.Errors.INVALID_LOCATION_FOUND);
    
     StationService.getCheapestFuelPrice(location, context.secrets.fuelAPIKey, context.secrets.fuelAccessToken, function(response) {
        return cb(null, response);
    });
}   
