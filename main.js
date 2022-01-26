const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");
const express = require('express');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const $ = cheerio.load("body");
const app = express();
const port = 3000;
const ejs = require('ejs');

let site = {
    performance: null,
    accessibility: null,
    best_practice: null,
    seo: null,
    errors: null,
    contrastErrors: null
}

const launchChromeAndRunLighthouse = async (url) => {
    const chrome = await chromeLauncher.launch({chromeFlags: ["--headless"]});
    const options = {logLevel: "info", onlyCategories: ["performance", "accessibility", "best-practices", "seo"], port: chrome.port};
    const results = await lighthouse(url, options);
    site.performance = results.lhr.categories.performance.score * 100;
    site.accessibility = results.lhr.categories.accessibility.score * 100;
    site.best_practice = results.lhr.categories["best-practices"].score * 100;
    site.seo = results.lhr.categories.seo.score * 100;
    console.log('Report is done for', results.lhr.finalUrl);
    console.log('Performance score was', results.lhr.categories.performance.score * 100);
    console.log('Accessibility score was', results.lhr.categories.accessibility.score * 100);
    console.log('Best Practices score was', results.lhr.categories["best-practices"].score * 100);
    console.log('SEO score was', results.lhr.categories.seo.score * 100);
    await chrome.kill();
};

const launchPuppeteer = async (url) => {
    await puppeteer
        .launch()
        .then(function(browser) {
            return browser.newPage();
        })
        .then(function(page) {
            return page.goto(url, { waitUntil: "networkidle0" }).then(function() {
                return page.content();
            });
        })
        .then(function(html) {
            $("#error span", html).each(function() {
                site.errors = $(this).text();
                console.log(site.errors);
            });
            $("#contrast span", html).each(function() {
                site.contrastErrors = $(this).text();
                console.log(site.contrastErrors);
            });
        })
        .catch(function(err) {
            console.log(err);
        });
}

app.set("view engine", "ejs");

app.get('/', (req, res) => {
    res.render('pages/index.ejs', {
        funcResultsPerformance: "", 
        funcResultsAccessibility: "",
        funcResultsBestPractice: "",
        funcResultsSEO: "",
        funcResultsErrors: "",
        funcResultsContrastErrors: "",
        URLName: ""
    });
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
})

app.use(express.urlencoded());

app.post('/', async function(req, res){
    console.log(req.body.url);
    let destination = req.body.url;
    if (destination.toString().includes("https://") || destination.toString().includes("http://")) {
        await launchChromeAndRunLighthouse(destination.toString());
        await launchPuppeteer("https://wave.webaim.org/report#/"+destination.toString().replace(/(^\w+:|^)\/\//, ''));
        console.log(destination.toString().replace(/(^\w+:|^)\/\//, ''));
        res.render('pages/index.ejs', {
            funcResultsPerformance: site.performance, 
            funcResultsAccessibility: site.accessibility,
            funcResultsBestPractice: site.best_practice,
            funcResultsSEO: site.seo,
            funcResultsErrors: site.errors,
            funcResultsContrastErrors: site.contrastErrors,
            URLName: destination
        });
    } else {
        await launchChromeAndRunLighthouse("https://"+destination.toString());
        await launchPuppeteer("https://wave.webaim.org/report#/"+destination.toString().replace(/(^\w+:|^)\/\//, ''));
        console.log(destination.toString().replace(/(^\w+:|^)\/\//, ''));
        res.render('pages/index.ejs', {
            funcResultsPerformance: site.performance, 
            funcResultsAccessibility: site.accessibility, 
            funcResultsBestPractice: site.best_practice,
            funcResultsSEO: site.seo,
            funcResultsErrors: site.errors,
            funcResultsContrastErrors: site.contrastErrors,
            URLName: destination
        });
    }
 });