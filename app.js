const scraper = require('./scraper');

let arguments = process.argv.slice(2);

if (arguments.length == 0) {
    console.log("This app returns specified NBA player's three pointer average for every season.");
    console.log("App usage: node app.js player name (example: node app.js luka doncic)");
    process.exit();
}

let player = scraper.getPlayerFromArgs(arguments);

scraper.run(player)
    .then(stats => {
        stats.forEach((stat) => {
            console.log(stat.season, stat.score);
        });
    })
    .catch(err => {
        console.log(err.message);
    })