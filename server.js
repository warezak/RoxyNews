var app = require('http').createServer(handler),
  io = require('socket.io').listen(app),
  fs = require('fs'),
  mysql = require('mysql'),
  connectionsArray = [],
  connection = mysql.createConnection({
    host: 'enterhost',
	user              :   'enteruser',
    password          :   'enterpwd',
    database          :   'enterdb',
    debug             :   false,
	port: 3306
  }),
  POLLING_INTERVAL = 10000,
  pollingTimer;

// If there is an error connecting to the database
connection.connect(function(err) {
  // connected! (unless `err` is set)
  if (err) {
    console.log(err);
  }
});

// creating the server ( localhost:8000 )
app.listen(8000);

// on server started we can load our client.html page
function handler(req, res) {
  fs.readFile(__dirname + '/index.html', function(err, data) {
    if (err) {
      console.log(err);
      res.writeHead(500);
      return res.end('Error loading client.html');
    }
    res.writeHead(200);
    res.end(data);
  });
}


var pollingLoop = function() {

  // Doing the database query
  var sql = 'SELECT a.item_date as pubdate, a.feed_name as heading, substr(concat(a.item_title, " - ", a.item_content),1,250) as body, a.item_title, a.item_content,  a.item_url, a.logo, a.feed_id, c.category, c.sub_category, a.s3key from p9_rss_content a use index(idx_date), p9_devices_rss b, p9_categories c where a.feed_id = b.feed_id and b.deviceid = "default" and b.username="clone" and b.active = "Y" and a.feed_id = c.id and a.item_date <= now() and a.processed = "Y" ORDER BY pubdate DESC LIMIT 30'
		
  
  var query = connection.query(sql),
      
  users = []; // this array will contain the result of our db query

  // setting the query listeners
  query
    .on('error', function(err) {
      // Handle error, and 'end' event will be emitted after this as well
      console.log(err);
      updateSockets(err);
    })
    .on('result', function(user) {
      // it fills our array looping on each user row inside the db
      users.push(user);
    })
    .on('end', function() {
      // loop on itself only if there are sockets still connected
      if (connectionsArray.length) {

        pollingTimer = setTimeout(pollingLoop, POLLING_INTERVAL);

        updateSockets({
          users: users
        });
      } else {

        console.log('The server timer was stopped because there are no more socket connections on the app')

      }
    });
};

var isInitNotes = false
// creating a new websocket to keep the content updated without any AJAX request
io.sockets.on('connection', function(socket) {

  console.log('Number of connections:' + connectionsArray.length);
  // starting the loop only if at least there is one user connected
  if (!connectionsArray.length) {
    pollingLoop();
  }

  socket.on('disconnect', function() {
    var socketIndex = connectionsArray.indexOf(socket);
    console.log('socketID = %s got disconnected', socketIndex);
    if (~socketIndex) {
      connectionsArray.splice(socketIndex, 1);
    }
  });

  console.log('A new socket is connected!');
  connectionsArray.push(socket);
  

   posts = [];
   isInitNotes = true

	

});

var updateSockets = function(data) {
  // adding the time of the last update
  data.time = new Date();
  console.log('Pushing new data to the clients connected ( connections amount = %s ) - %s', connectionsArray.length , data.time);
  // sending new data to all the sockets connected
  connectionsArray.forEach(function(tmpSocket) {
    tmpSocket.volatile.emit('notification', data);
  });
};

console.log('Please use your browser to navigate to http://localhost:8000');