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
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

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
                        random.term = term;
                        res.send({
                            response_type: 'ephemeral',
                            replace_original: true,
                            attachments: [{
                                callback_id: 'gif',
                                fallback: 'Valgif',
                                image_url: random.src,
                                title_link: random.href,
                                actions: [
                                    {
                                        name: 'option',
                                        text: 'Send',
                                        type: 'button',
                                        value: 'send-' + JSON.stringify(random),
                                        style: 'primary'
                                    },
                                    {
                                        name: 'option',
                                        text: 'Shuffle',
                                        type: 'button',
                                        value: 'shuffle-' + term
                                    },
                                    {
                                        name: 'option',
                                        text: 'Cancel',
                                        type: 'button',
                                        value: 'cancel',
                                        style: 'danger'
                                    }
                                ]
                            }]
                        });
                    } else {
                        res.send({
                            delete_original: true,
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

app.post('/command', (req, res) => {
    if (!req.body || !req.body.text) {
        res.send({
            delete_original: true,
            response_type: 'ephemeral',
            text: 'Invalid query.'
        });
    } else {
        sendQuery(req.body.text, res);
    }
});

app.post('/interactive', (req, res) => {
    if (req.body && req.body.payload && req.body.payload) {
        let payload = JSON.parse(req.body.payload);
        let action = payload.actions[0];
        if (action.value.startsWith('send-')) {
            let newVal = action.value.replace('send-', '');
            let imageData = JSON.parse(newVal);
            res.send({
                response_type: 'in_channel',
                as_user: true,
                delete_original: true,
                text: '*' + imageData.term + '* - posted by *' + payload.user.name + '*',
                attachments: [{
                    callback_id: 'gif',
                    fallback: 'Valgif',
                    image_url: imageData.src,
                    title_link: imageData.href
                }]
            });
        } else if (action.value.startsWith('shuffle-')) {
            sendQuery(action.value.replace('shuffle-', ''), res);
        } else {
            res.send({
                delete_original: true
            });
        }
    } else {
        res.send({
            delete_original: true
        });
    }
});

app.listen(3000, () => {
    console.log('Listening on port 3000.')
});