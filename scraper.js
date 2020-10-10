const puppeteer = require('puppeteer');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

let browser;

function getPlayerFromArgs(args) {
    return args.join(' ');
}

async function inputPlayer(page, player) {
    await page.waitForSelector('div.stats-search__top > input');

    await page.evaluate(() => {
        let div = document.querySelector('div.stats-search__top > input');
        div.classList.remove('ng-hide');
    });

    await page.type('div.stats-search__top > input', player, { delay: 100 });

    /* This works as well */
    /* await page.focus('div.stats-search__top > input'); 
    await page.keyboard.type('luka doncic', { delay: 100 }); */

    if (await page.$('div[class="stats-search__section ng-hide"]') !== null)
    {
        console.error('Player not found.');
        throw 'Player not found.';
    }

    await page.evaluate(() => {
        let a = document.querySelector('div.stats-search__section a');
        a.click();
    });
}

async function selectOption(page, name, val) {
    let selector = `select[name="${name}"]`;
    let selectoropts = selector + ' option';

    await page.waitForSelector(selector);

    let season = await page.evaluate((selectoropts, val) => {
        let options = document.querySelectorAll(selectoropts);
        let option = Array.from(options).find(o => o.text === val);
        option.selected = true;

        return option.attributes['value'].value;
    }, selectoropts, val);
    await page.select(selector, season);
}

async function getTableData(page) {
    let stats = await page.evaluate(() => {
        let arr = [];
        let rows = document.querySelector('div.nba-stat-table__overflow').querySelectorAll('table > tbody > tr');
        
        rows.forEach((row) => {
            let obj = {};
            let cellsList = row.querySelectorAll('td');
            let cells = Array.from(cellsList);
            try 
            {
                obj.season = cells[0].innerText;
                obj.score = cells[9].innerText;

                arr.push(obj);
            }
            catch (err) { }
        });
        return arr;
    });
    return stats;
}

function run(player) {
    console.log('Getting data ...');
    return new Promise(async (resolve, reject) => {
        try {
            browser = await puppeteer.launch({
                headless: true,
                defaultViewport: null,
                args:[
                    '--start-maximized' // you can also use '--start-fullscreen'
                ]
            });
            let page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
            await page.goto("https://stats.nba.com/");
            await page.setViewport({ width: 1920, height: 1080});

            await page.waitForSelector('#onetrust-accept-btn-handler');
            await page.click('#onetrust-accept-btn-handler')

            /* await page.waitForNavigation({ waitUntil: 'networkidle2' }); */
            /* await page.waitForResponse(response => response.ok()); */
            await page.waitForNavigation({ waitUntil: 'load' });

            await inputPlayer(page, player);

            await page.waitForSelector('p[class="player-summary__first-name"]');
            let playerFirstName = await page.$eval('p.player-summary__first-name', element => element.innerText);
            let playerLastName = await page.$eval('p.player-summary__last-name', element => element.innerText);
            let playerTeam;
            try {
                playerTeam = await page.$eval('span.player-summary__team-name', element => element.innerText);
            }
            catch { 
                playerTeam = ''; 
            }

            await sleep(2000);
            
            await selectOption(page, 'SeasonType', 'Regular Season');

            await sleep(500);

            await selectOption(page, 'PerMode', 'Per 40 Minutes');

            await sleep(2000);

            await page.waitForSelector('nba-stat-table[template="player/player-traditional"]');

            /* await page.screenshot({ path: 'table.png' }); */

            console.log(playerFirstName, playerLastName, playerTeam);
            let stats = await getTableData(page);

            return resolve(stats);   
        } 
        catch (e) {
            err = {};
            err.message = "Sorry, could not get selected player's statistics.";
            err.exception = e;
            return reject(err);
        }
        finally {
            browser.close();
        }
})}

module.exports = { getPlayerFromArgs, run };