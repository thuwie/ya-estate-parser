const {writeFileSync} = require('fs');
const {resolve} = require('path');
const {createServer} = require('http');
const url = require('url');
const axios = require('axios');
const cheerio = require('cheerio');
const port = 5000;

const requestHandler = async (req, res) => {
  if (req.url === '/favicon.ico') return;
  const queryObject = url.parse(req.url, true).query;
  const data = await retrieveEstateData(queryObject.url);
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify(data));
  res.end();
};
const server = createServer(requestHandler);
server.listen(port, (err) => {
  if (err) {
    return console.log(err);
  }
  console.log(`server is listening on ${port}`)
});

async function retrieveEstateData(url) {
  if (!url) throw new Error('URL is empty');
  try {
    const response = await axios.get(url);

    const $ = cheerio.load(response.data, {decodeEntities: true});
    $('script').remove();
    $('styles').remove();
    $('.BuildingInfo__features-list li .BuildingInfoFeature__by-yandex-data').remove();
    const config = {
      address: {
        selector: '.OfferHeader__address',
        getValue: function (node) {
          return $(node).text();
        },
      },
      fullPrice: {
        selector: '.OfferBaseInfo__price .Price .price',
        getValue: function (node) {
          const tempString = $(node).text().split(String.fromCharCode(160)).join('');
          return tempString.substring(0, tempString.indexOf('₽') - 1).trimEnd();
        },
      },
      squarePrice: {
        selector: '.OfferBaseInfo__text-info',
        getValue: function (node) {
          const tempString = $(node).text().split(String.fromCharCode(160)).join('');
          return tempString.split(' ').join('').substring(0, tempString.indexOf('₽') - 1);
        },
      },
      stations: {
        selector: '.OfferHeaderLocation .MetroWithTime',
        array: true,
        getValue: function (node) {
          return $(node).text() + '\n';
        }
      },
      sellInfo: {
        selector: '.OfferDealDescription__sell-info',
        getValue: function (node) {
          return $(node).text();
        },
      },
      techInfo: {
        selector: '.OfferTechDescription__list li',
        array: true,
        getValue: function (node) {
          return $(node).text() + '\n';
        },
      },
      description: {
        selector: '.OfferTextDescription__text',
        getValue: function (node) {
          return $(node).text();
        }
      },
      features: {
        selector: '.BuildingInfo__features-list li',
        array: true,
        getValue: function (node) {
          return $(node).text() + '\n';
        },
      },
      images: {
        selector: '.GalleryThumbsThumb',
        array: true,
        getValue: function (node) {
          const imgUrl = $(node).find('img').attr('src');
          const fullUrl = `https:${imgUrl.replace('minicard', 'large')} \n`;
          return fullUrl;
        }
      },
    };

    const result = {};

    Object.entries(config).forEach(([itemName, itemConfig]) => {
      const node = $(itemConfig.selector);
      let parsedResult;

      if (itemConfig.array) {
        parsedResult = [];
        $(itemConfig.selector).each((i, node) => {
          parsedResult.push(itemConfig.getValue(node));
        });
        parsedResult = parsedResult.join('');
      } else {
        parsedResult = itemConfig.getValue(node);
      }
      result[itemName] = parsedResult.toString();
    });

    return result;
  } catch (e) {
    console.error(e);
  }
}
