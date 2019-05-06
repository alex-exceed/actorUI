const Apify = require('apify');
const baseOffersLink = 'https://www.amazon.com/gp/offer-listing/';

const items = [];

const offers = [];

const buildOffersLinks = async key => {

    const requestQueue = await Apify.openRequestQueue();
    const url = `https://www.amazon.com/s?k=${ key }&ref=nb_sb_noss`;

    await requestQueue.addRequest({ url: url });

    let count = 0;
    const handlePageFunction = async ({ request, $ }) => {
        const links = $('.s-result-list [data-component-type="s-product-image"] .a-link-normal');

        if ( count )
            items.push({
                title      : $('#productTitle').text().trim(),
                itemUrl    : request.url,
                description: $('#productDescription').text().trim(),
                keyword    : key,
            });
        count += 1;
        await Apify.utils.enqueueLinks({
            $,
            selector  : '.s-result-list [data-component-type="s-product-image"] .a-link-normal',
            pseudoUrls: [],
            requestQueue,
            baseUrl   : 'https://www.amazon.com/'
        });

        // const href = $(link).attr('href');
        //
        // links.each(function (n, link) {
        //     items.push({
        //         url: baseOffersLink + href.split('/')[3],
        //         title: href.text().trim(),
        //         description: "",
        //         keyword: key
        //     });
        // });
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
        handleFailedRequestFunction
    });

    await crawler.run();
};

const getResult = async () => {

    const sources = items.reduce((acc, item) => {
        const itemId = item.itemUrl.split('/')[5];
        item.id = itemId;
        item.offers = [];
        return [...acc, baseOffersLink + itemId];
    }, []);

    console.log('@@@@@@@@@@@@ sources', sources);

    const requestList = await Apify.openRequestList('offers', sources);
    const dataset = [];

    const crawler = new Apify.CheerioCrawler({
        requestList,
        handlePageFunction: async ({ $, request }) => {

            // const result = {
            //     'title'      : 'Apple iPhone 6 a1549 16GB Space Gray Unlocked (Certified Refurbished)',
            //     'itemUrl'    : 'https://www.amazon.com/Apple-iPhone-Unlocked-Certified-Refurbished/dp/B00YD547Q6/ref=sr_1_2?s=wireless&ie=UTF8&qid=1539772626&sr=1-2&keywords=iphone',
            //     'description': 'What\'s in the box: Certified Refurbished iPhone 6 Space Gray 16GB Unlocked , USB Cable/Adapter. Comes in a Generic Box with a 1 Year Limited Warranty.',
            //     'keyword'    : 'iphone',
            //     'offers'     : []
            // };
            console.log('@@@@@@@@@@@@ 111', request.url.split('/').reverse()[0]);

            const item = items.find(i => i.id === request.url.split('/').reverse()[0]);

            console.log('@@@@@@@@@@@@ item', item);

            if ( item ) {
                $('#olpOfferList .olpOffer').each((i, el) => {
                    item.offers.push({
                        sellerName: $(el).find('.olpSellerName').text().trim(),
                        offer     : $(el).find('.olpOfferPrice').text().trim(),
                        shipping  : 'free'
                    });
                });

                await Apify.pushData(items);
            }

        }
    });

    await crawler.run();
};

(async function () {
    Apify.main(async () => {
        await buildOffersLinks('iphone');
        console.log(JSON.stringify(items[0], null, 2));
        await getResult(items);
        console.log('@@@@@@@@@@@@ items results', items);
    });
})();

