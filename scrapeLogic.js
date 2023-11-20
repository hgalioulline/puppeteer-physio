import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import('dotenv/config');

const scrapeLogic = async (res) => {
  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  try {
    const page = await browser.newPage();
    await page.goto('https://www.tbooking.ch/de/book/3293-3788', { waitUntil: 'networkidle2' });

    // Selector for the element you want to click
    const selector = '#container-row > div > div > router-view > div > div:nth-child(3) > div > treatment-view > article';
    await page.waitForSelector(selector);
    await page.click(selector);
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.waitForSelector('#calendar-0 > calendar > div.au-target.calendar-container > div.table-responsive.calendar > table > tbody > tr:nth-child(1)');
    
    // Execute script in the page context
    const totalTimings = await page.evaluate(() => {
        let topRow = document.querySelector('#calendar-0 > calendar > div.au-target.calendar-container > div.table-responsive.calendar > table > tbody > tr:nth-child(1)');
        let bottomRow = document.querySelector('#calendar-0 > calendar > div.au-target.calendar-container > div.table-responsive.calendar > table > tbody > tr:nth-child(2)');
        let dates = document.querySelector('#calendar-0 > calendar > div.au-target.calendar-container > div.table-responsive.calendar > table > thead > tr.cal-day-row');
        let totalTimings = "";
        for (let i = 1; i < topRow.childNodes.length - 2; i++) {
            let timings = "";
            let optionsMorning = topRow.childNodes[i].childNodes
            let optionsAfternoon = bottomRow.childNodes[i].childNodes
            for (let j = 1; j < 30; j++) {
                timings += optionsMorning[j].innerText + "; ";
            }
            for (let j = 1; j < optionsAfternoon.length - 2; j++) {
                timings += optionsAfternoon[j].innerText + "; ";
            }
            if (optionsMorning.length > 3 || optionsAfternoon.length > 3) {
                timings = dates.childNodes[i].innerText + " options: " + timings + "\n";
            }
            totalTimings += timings;
        }
        return totalTimings;
    });
    console.log(totalTimings);
    res.send(totalTimings);

    // Trigger the Webhook
    if (totalTimings.length > 0) {
        const event = "Physio";
        const key = "sAa4A7qLjqvIMKk2LsO2E";
        const url = `https://maker.ifttt.com/trigger/${event}/json/with/key/${key}`;

        const data = JSON.stringify({ "timings": totalTimings });

        const response = await fetch(url, {
            method: "POST",
            body: data,
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            console.log("Webhook triggered successfully!");
        } else {
            console.log("Error triggering webhook: ", response.statusText);
        }
    }
  }
  catch (e) {
    console.error(e);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    await browser.close();
  }
};

export { scrapeLogic };
