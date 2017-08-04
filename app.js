[
    ['warn',  '\x1b[33m'],
    ['error', '\x1b[31m'],
    ['info',   '\x1b[35m'],
    ['log',   '\x1b[2m']
].forEach((pair) => {
    let method = pair[0], reset = '\x1b[0m', color = '\x1b[36m' + pair[1];
    console[method] = console[method].bind(console, color, method.toUpperCase(), reset);
});

process.on('uncaughtException', (err) => {
    console.error(new Date(), 'Uncaught Exception:', err.stack ? err.stack : err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error(new Date(), 'Unhandled Rejection:', err.stack ? err.stack : err);
    process.exit(1);
});

const https = require('https');
const htmlparser = require('htmlparser');
const express = require('express');
const app = express();

function sendQuery(term, res) {
    https.get({
        host: 'www.google.com',
        port: '443',
        path: '/search?safe=active&tbs=ift:gif&tbm=isch&q=' + encodeURIComponent(term),
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36'
        }
    }, (response) => {
        let body = '';
        response.on('data', function (d) {
            body += d;
        });

        response.on('end', function () {
            let handler = new htmlparser.DefaultHandler((err, dom) => {
                if (err) {
                    console.error('HTML Parse Error:', err);
                } else {
                    let imageRows = dom[1].children[1].children[12].children[3].children[3].children[1].children[0].children[1].children[1].children[1].children[2].children[0].children[0].children[0].children[1].children[0].children;

                    let images = [];
                    imageRows.forEach((row) => {
                        if (row.children) {
                            try {
                                let data = JSON.parse(row.children[1].children[0].data);
                                images.push({
                                    href: data.ru,
                                    src: data.ou
                                });
                            } catch (e) {}
                        }
                    });

                    let random = images[Math.floor(Math.random()*(images.length-1))];
                    if (random) {
                        res.send({
                            response_type: 'ephemeral',
                            attachments: [{
                                fallback: 'Valgif',
                                image_url: random.src,
                                title_link: random.href,
                            }]
                        });
                    } else {
                        res.send({
                            response_type: 'ephemeral',
                            text: 'Failed to get an image.'
                        });
                    }
                }
            });

            let parser = new htmlparser.Parser(handler);
            parser.parseComplete(body);
        });
    });
}

app.get('/gif', (req, res, next) => {
    if (!req.query.q) {
        res.send({
            response_type: 'ephemeral',
            text: 'Invalid query parameter.'
        });
    } else {
        sendQuery(req.query.q, res);
    }
});

app.listen(3000, () => {
    console.log('Listening on port 3000.')
});