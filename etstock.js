const http = require('http');
const fs = require('fs');
const url = require('url');
const zlib = require('zlib');
const htmlparser = require('htmlparser2');

const listen_port = process.env.PORT || 5000;

http.createServer(function (req, res) {
  if (req.method === 'GET') {
    var q = url.parse(req.url, true).query;
    if (q.quote != undefined) {
      var options = {
        host: 'www.etnet.com.hk',
        port: 80,
        path: '/www/tc/stocks/realtime/quote_super.php?code='+q.quote,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US)',
          'Referer' : 'http://www.etnet.com.hk/www/tc/stocks/realtime/quote_super.php?code='+q.quote,
          'Accept-Encoding' : 'gzip, deflate'
        }
      };

      http.get(options, function(http_res) {
        if (http_res.statusCode != 200) console.log('Got response: ' + http_res.statusCode);
        res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});

        var stream;
        if( http_res.headers['content-encoding'] == undefined) {
          stream = http_res;
        } else if ( http_res.headers['content-encoding'] == 'gzip' ) {
          stream = zlib.createGunzip();
          http_res.pipe(stream);
          //console.info('content-encoding: ' + http_res.headers['content-encoding']);
        } else if ( http_res.headers['content-encoding'] == 'deflate' ) {
          stream = zlib.createInflate();
          http_res.pipe(stream);
          //console.info('content-encoding: ' + http_res.headers['content-encoding']);
        } else {
          console.error('Unsupported content-encoding: ' + http_res.headers['content-encoding']);
          stream = http_res;
        }

        var read=0;
        var parser = new htmlparser.Parser({
          onopentag: function(tagname, attribs) {
            if (read > 0) read++;
            if (read > 0 && tagname == 'table') res.write('\n');
            if (attribs.id == 'indexbar_stock' || attribs.id == 'content') read=1;
            else if (attribs.id == 'Rsearch') read=0;
          },
          ontext: function(text) {
            if (read > 0) {
              text = text.trim();
              if (text!='' && text!='#')
                res.write(text + '|');
            }
          },
          onclosetag: function(tagname) {
            if (read > 0 ) read--;
          },
          onend: function() {
            res.end('\n');
          },
          onerror: function(e) {
            res.write(e.message);
            res.end('\n');
          }
        }, {decodeEntities: true});
        
        stream.pipe(parser);
      }).on('error', function(e) {
        console.log('Got error: ' + e.message);
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.write('Internal Server Error' + '\n' + e.message);
        res.end('\n');
      });
    } else {
      var pathname = url.parse(req.url, true).pathname;
      console.log(pathname);
      switch(pathname/*.substr(pathname.length-4,4)*/)
      {
        case "/favicon.ico":
          res.writeHead(200, {'Content-Type': 'image/x-icon; charset=utf-8'});
          fs.createReadStream('.'+pathname).pipe(res)
          break;
        case "/":
          res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
          fs.createReadStream('./index.html').pipe(res)
          break;
        // case "html":
        // case ".htm":
        //   res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        //   fs.createReadStream('./'+pathname).pipe(res)
        //   break;
        default:
          res.writeHead(400, {'Content-Type': 'text/plain'});
          res.write('Bad Request');
          res.end('\n');
          break;
      }
    }
  } else {
    res.writeHead(405, {'Content-Type': 'text/plain'});
    res.write('Method Not Allowed');
    res.end('\n');
  }
}).listen(listen_port, () => console.log(`Listening on ${ listen_port }`));
