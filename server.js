const fs = require("fs");
const index = fs.readFileSync('./index.html');
const http = require('http');

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf8'});
    res.end(index);
}).listen(3000, '127.0.0.1');
console.log('Server running at http://127.0.0.1:3000/');