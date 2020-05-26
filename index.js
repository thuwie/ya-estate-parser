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

    const body = $.html();
    const address = $('.OfferHeader__address').text();
    const fullPrice = $('.OfferBaseInfo__price .Price .price').text();
    const squarePrice = $('.OfferBaseInfo__text-info').text();
    const stations = [];
    $('.OfferHeaderLocation .MetroWithTime').each((i, node) => {
      stations.push($(node).text());
    });
    const sellInfo = $('.OfferDealDescription__sell-info').text();
    const techInfo = [];
    $('.OfferTechDescription__list li').each((i, node) => {
      techInfo.push($(node).text());
    });
    const description = $('.OfferTextDescription__text').text();
    const features = [];
    $('.BuildingInfo__features-list li .BuildingInfoFeature__by-yandex-data').remove();
    $('.BuildingInfo__features-list li').each((i, node) => {
      features.push($(node).text());
    });
    const images = [];
    $('.GalleryThumbsThumb').each((i, node) => {
      const imgUrl = $(node).find('img').attr('src');
      const fullUrl = `https:${imgUrl.replace('minicard', 'large')}`;
      images.push(fullUrl);
    });

    return {
      url,
      address,
      fullPrice,
      squarePrice,
      stations,
      sellInfo,
      techInfo,
      description,
      features,
      images,
    };
  } catch (e) {
    console.error(e);
  }
}
