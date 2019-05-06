const Apify = require('apify');
const fs = require('fs');
const md5 = require('md5');
const { sendEmail } = require('./helpers/email_sender');
const config = require('./config/config.js');
//set API storage DIR
process.env.APIFY_LOCAL_STORAGE_DIR = 'apify_storage';

const buildOffersLinks = async (datasetName, key) => {
    const items = [];
    const requestQueue = await Apify.openRequestQueue(datasetName);
    const url = `${config.baseUrl}s?k=${key}&ref=nb_sb_noss`;

    await requestQueue.addRequest({ url: url });

    let count = 0;
    const handlePageFunction = async ({ request, $ }) => {
        if (count) {
            items.push({
                title      : $('#productTitle').text().trim(),
                itemUrl    : request.url,
                description: $('#productDescription').text().trim(),
                keyword    : key,
            });
        }
        if (!count) {
            await Apify.utils.enqueueLinks({
                $,
                selector  : '.s-result-list [data-component-type="s-product-image"] .a-link-normal',
                pseudoUrls: [],
                requestQueue,
                baseUrl   : config.baseUrl,
            });
        }
        count += 1;
    };
    const handleFailedRequestFunction = async ({ request }) => {
        // console.log(`Request ${request.url} failed too many times`);
        await Apify.pushData({
            '#debug': Apify.utils.createRequestDebugInfo(request),
        });
    };
    // Set up the crawler, passing a single options object as an argument.
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        handlePageFunction,
        // useApifyProxy: true,
        handleFailedRequestFunction,
    });

    await crawler.run();

    return items;
};

const getResult = async (datasetName, items) => {
    const sources = items.reduce((acc, item) => {
        const itemId = item.itemUrl.split('/')[5];
        item.id = itemId;
        item.offers = [];
        return [...acc, config.baseOffersLink + itemId];
    }, []);

    if (sources && sources.length) {
        const requestList = await Apify.openRequestList('offers-' + datasetName, sources);

        const crawler = new Apify.CheerioCrawler({
            requestList,
            handlePageFunction: async ({ $, request }) => {

                const item = items.find(i => i.id === request.url.split('/').reverse()[0]);

                $('#olpOfferList .olpOffer').each((i, el) => {
                    item.offers.push({
                        sellerName: $(el).find('.olpSellerName').text().trim(),
                        offer     : $(el).find('.olpOfferPrice').text().trim(),
                        shipping  : 'free',
                    });
                });
            },
        });


        await crawler.run();

        items.forEach(item => {
            delete item.id;
        });

        const dataset = await Apify.openDataset(datasetName);
        await dataset.pushData(items);
    }

};


module.exports.scrape = async (key, emailTo) => {
    console.log(key, emailTo);
    const datasetName = md5(emailTo + '_' + new Date().getTime());
    const items = await buildOffersLinks(datasetName, key);
    let resFilesLinks = [];

    await getResult(datasetName, items);

    fs.readdirSync('./' + config.baseFilesFolder + datasetName + '/').forEach(file => {
        resFilesLinks.push(config.baseDomain + config.baseFilesFolder + datasetName + '/' + file);
    });

    sendEmail(emailTo, 'Crawler Results', resFilesLinks.join('\n'));
};

