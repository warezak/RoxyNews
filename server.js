var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    fs = require('fs'),
    mysql = require('mysql'),
    connectionsArray = { length: 0 },
    connection = mysql.createConnection({
      host: 'enterhost',
      user              :   'enteruser',
      password          :   'enterpwd',
      database          :   'enterdb',
      debug             :   false,
      port: 3306
    }),
    POLLING_INTERVAL = 10000,
    pollingTimer,
    isInitNotes = false,
    isPolling = false,
    conf = JSON.parse(fs.readFileSync('conf.json'));

//********** Initialize & Start **********

// If there is an error connecting to the database
connection.connect(function(err) {
  // connected! (unless `err` is set)
  if (err) {
    console.log('DB connection error: ' + err.code);
  }
});

// creating the server ( localhost:8000 )
app.listen(8000);

console.log('Please use your browser to navigate to http://localhost:8000');


//********** Functions **********

// on server started we can load our client.html page
function handler(req, res) {
  console.log('Request!');
  fs.readFile(__dirname + '/index.html', function(err, data) {
    if (err) {
      console.log(err);
      res.writeHead(500);
      return res.end('Error loading index.html');
    }
    res.writeHead(200);
    res.end(data);
  });
}

// creating a new websocket to keep the content updated without any AJAX request
io.sockets.on('connection', function(socket) {
  console.log('A new socket is connected!');
  connectionsArray[socket.id] = { sock: socket, name: 'client' + (++connectionsArray.length), new: true };
  console.log('Number of connections:' + connectionsArray.length);
  
  // send initial data
  setTimeout(function () { initData(socket); }, 100);
  
  // starting the polling loop (if it's not already polling)
  if (!isPolling) {
    console.log('Start polling!');
    isPolling = true;
    setTimeout(pollingLoop, POLLING_INTERVAL);
  }

  posts = [];
  isInitNotes = true;
  
  socket.on('disconnect', function() {
    if (connectionsArray[socket.id]) {
      console.log('socketID = %s got disconnected', connectionsArray[socket.id].name);
      delete connectionsArray[socket.id];
      connectionsArray.length -= 1;
    }
  });  
});

function initData(socket) {
  var sqla = [];
  Object.keys(conf.idata).forEach(function (key) { 
//    sqla.push(`SELECT a.item_date as pubdate, a.feed_name as heading, substr(concat(a.item_title, " - ", a.item_content),1,250) as body, a.item_title, a.item_content, a.item_url, a.logo, a.feed_id, c.category, c.sub_category, a.s3key from p9_rss_content a use index(idx_date), p9_devices_rss b, p9_categories c where a.feed_id = b.feed_id and b.deviceid = "default" and b.username="clone" and b.active = "Y" and a.feed_id = c.id and a.item_date <= now() and a.processed = "Y" and c.category = "${key}" LIMIT ${conf.idata[key]}`);
    sqla.push('(SELECT a.item_date as pubdate, a.feed_name as heading, substr(concat(a.item_title, " - ", a.item_content),1,250) as body, a.item_title, a.item_content, a.item_url, a.logo, a.feed_id, c.category, c.sub_category, a.s3key from p9_rss_content a use index(idx_date), p9_devices_rss b, p9_categories c where a.feed_id = b.feed_id and b.deviceid = "default" and b.username="clone" and b.active = "Y" and a.feed_id = c.id and a.item_date <= now() and a.processed = "Y" and c.category = "' + key + '" LIMIT ' + conf.idata[key] + ')');
  });

  var query = connection.query(sqla.join(' UNION ') + ' ORDER BY 1'),
      users = [];

  query
    .on('error', function(err) {
      console.log(err);
      if (connectionsArray[socket.id] && socket.connected) {
        initSocket(socket, err);
      }
    })
    .on('result', function(user) {
      users.push(user);
    })
    .on('end', function() {
      if (connectionsArray[socket.id] && socket.connected) {
        initSocket(socket, { users: users });
      }
    });
};

function pollingLoop() {
  // Doing the database query
  var sql = 'SELECT a.item_date as pubdate, a.feed_name as heading, substr(concat(a.item_title, " - ", a.item_content),1,250) as body, a.item_title, a.item_content, a.item_url, a.logo, a.feed_id, c.category, c.sub_category, a.s3key from p9_rss_content a use index(idx_date), p9_devices_rss b, p9_categories c where a.feed_id = b.feed_id and b.deviceid = "default" and b.username="clone" and b.active = "Y" and a.feed_id = c.id and a.item_date <= now() and a.processed = "Y" ORDER BY pubdate DESC LIMIT 30';

  var query = connection.query(sql),
      users = []; // this array will contain the result of our db query

  // setting the query listeners
  query
    .on('error', function(err) {
      // Handle error, and 'end' event will be emitted after this as well
      console.log(err);
      if (connectionsArray.length) {
        updateSockets(err);
      }
    })
    .on('result', function(user) {
      // it fills our array looping on each user row inside the db
      users.push(user);
    })
    .on('end', function() {
      // loop on itself only if there are sockets still connected
      if (connectionsArray.length) {
        pollingTimer = setTimeout(pollingLoop, POLLING_INTERVAL);
        updateSockets({ users: users });
      } else {
        console.log('The server timer was stopped because there are no more socket connections on the app');
        isPolling = false;
      }
    });
};

function initSocket(socket, data) {
  data.time = new Date();
  console.log('Pushing initial data to %s - %s', connectionsArray[socket.id].name, data.time);
  socket.emit('notification', data);
  connectionsArray[socket.id].new = false;
}

function updateSockets(data) {
  // adding the time of the last update
  data.time = new Date();
//  console.log('Pushing new data to the clients connected ( connections amount = %s ) - %s', connectionsArray.length , data.time);
  // sending new data to all the sockets connected
  Object.keys(connectionsArray).forEach(function (id) {
    if (id === 'length') return;
    if (!connectionsArray[id].new) {
      console.log('Pushing new data to %s - %s', connectionsArray[id].name, data.time);
      connectionsArray[id].sock.emit('notification', data);   
    }
  });
};