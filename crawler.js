const Apify = require('apify');
const fs = require('fs');
const md5 = require('md5');
const { sendEmail } = require('./helpers/email_sender');
const config = require('./config/config.js');
//set API storage DIR
process.env.APIFY_LOCAL_STORAGE_DIR = 'apify_storage';

const generatePaginationLinks = (urls, itemId) => {
    const paginationUrls = [];
    let magicNumber = new RegExp('/ref=olp_page_2/(.*)?ie=UTF8').exec(urls[0])[1];
    const pages = urls.map(url => {
        return parseInt(new RegExp('ref=olp_page_(.*)/').exec(url)[1], 10);
    });
    const maxPage = Math.max(...pages);

    for (let p = 2; p <= maxPage; p++) {
        const hrf = config.baseOffersLink + itemId + '/ref=olp_page_' + p + '/' + magicNumber + '?ie=UTF8&f_all=true&startIndex=' + ((p - 1) * 10);
        paginationUrls.push(hrf);
    }

    return paginationUrls;
};

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

    let additionalPages = [];

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
            handlePageTimeoutSecs: 120,
            handlePageFunction: async ({ $, request }) => {

                const itemId = new RegExp('offer-listing/(.*)').exec(request.url)[1];

                const item = items.find(i => i.id === itemId);

                const pagesHrefs = [];

                $('#olpOfferList .olpOffer').each((i, el) => {
                    item.offers.push({
                        sellerName: $(el).find('.olpSellerName').text().trim(),
                        offer     : $(el).find('.olpOfferPrice').text().trim(),
                        shipping  : 'free',
                    });
                });

                const pagination = $('.a-pagination li:not(.a-disabled, .a-selected, .a-last)');

                if (pagination && pagination.length) {
                    pagination.each((idx, el) => {
                        const href = $(el).find('a').attr('href');
                        pagesHrefs.push(href);
                    });
                }

                if (pagesHrefs && pagesHrefs.length) {
                    const result = generatePaginationLinks(pagesHrefs, itemId);

                    additionalPages = [...additionalPages, ...result];
                }

            },
        });

        await crawler.run();

    }

    if (additionalPages && additionalPages.length) {
        const requestList = await Apify.openRequestList('pagination-' + datasetName, additionalPages);

        const _crawler = new Apify.CheerioCrawler({
            requestList,
            handlePageFunction: async ({ $, request }) => {

                const itemId = new RegExp('offer-listing/(.*)/ref=')[1];

                const item = items.find(i => i.id === itemId);

                $('#olpOfferList .olpOffer').each((i, el) => {
                    item.offers.push({
                        sellerName: $(el).find('.olpSellerName').text().trim(),
                        offer     : $(el).find('.olpOfferPrice').text().trim(),
                        shipping  : 'free',
                    });
                });
            },
        });

        await _crawler.run();
    }

    items.forEach(item => {
        delete item.id;
    });

    const dataset = await Apify.openDataset(datasetName);
    await dataset.pushData(items);

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

