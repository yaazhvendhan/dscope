const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/analyze',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(JSON.stringify({ path: 'src' })); // Use a path that exists but might take a tiny bit to scan, or any path

// Abort request immediately to test cancellation
setTimeout(() => {
    console.log('Aborting request...');
    req.destroy();
}, 5); // Very short timeout to trigger abort during processing
