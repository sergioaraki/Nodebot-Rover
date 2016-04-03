var basePath = '/home/pi/Robot';
var photoNumber = 1;

var levelup = require('levelup');

var db = levelup(basePath + '/RobotDB');
db.get('photoNumber', function (err, value) {
    if (!err)
      	photoNumber = parseInt(value);
});

var RaspiCam = require('raspicam');

var camera = new RaspiCam({
	mode: 'photo',
	output: basePath + '/web/img/photos/photo_'+photoNumber+'.jpg',
	encoding: 'jpg',
	timeout: 1 // take the picture immediately
});

camera.on('start',function(err, timestamp){
	photoNumber = photoNumber + 1;
	db.put('photoNumber', photoNumber.toString());
});

var fs = require('fs');

function deletePhotos() {
  try { var files = fs.readdirSync(basePath + '/web/img/photos'); }
    catch(e) { console.log(e); }
    if (files.length > 0){
      	for (var i = 0; i < files.length; i++) {
        	var filePath = basePath + '/web/img/photos' + '/' + files[i];
        	if (fs.statSync(filePath).isFile())
          		fs.unlinkSync(filePath);
        	else
          		deleteContentFiles(filePath);
      	}
    	db.put('photoNumber', '1');
    	photoNumber = 1;
    }
}

var pfio = require('piface-node');
var listening = false;
var prev_state = 0;
startListening();

function startListening() {
	pfio.init();
	listening = true;
	watchInputs();
}

function stopListening() {
  	if (listening){
    	pfio.deinit();
    	listening = false;
	}
}

function watchInputs() {
	if (listening){
		var state;
		state = pfio.read_input();
		if (state !== prev_state) {
			var changed = prev_state ^ state;
			for (var pin = 0; pin < 8; pin++) {
				if ((changed & (1 << pin)) === (1 << pin)) {
		    		switch (pin) {
		      			case 3:
		            		bothOff();
		          			break;
		        		case 2:
		          			takePhoto();
		          			break;
		        		case 1:
		          			reboot();
		          			break;
		        		case 0:
		          			shutdown();
		          			break;
		      		}
		    	}
		  }
		  prev_state = state;
		}
		setTimeout(watchInputs, 10);
	}
}

function firstOn(){
	if (listening){
		pfio.digital_write(0,1);
		pfio.digital_write(1,0);
	}
}

function secondOn(){
  	if (listening){
    	pfio.digital_write(0,0);
    	pfio.digital_write(1,1);
  	}
}

function bothOn(){
  	if (listening){
    	pfio.digital_write(0,1);
    	pfio.digital_write(1,1);
  	}
}

function bothOff(){
  	if (listening){
    	pfio.digital_write(0,0);
    	pfio.digital_write(1,0);
  	}
}

function takePhoto(){
  	camera.set('output',basePath + '/web/img/photos/photo_'+photoNumber+'.jpg');
  	camera.start();
}

function reboot(){
  	exec("sudo reboot", function (error, stdout, stderr) {});
}

function shutdown(){
  	exec("sudo shutdown -h now", function (error, stdout, stderr) {});
}

var exec = require('child_process').exec;

var CameraStream = require('./cameraStream.js');
var liveCamera = new CameraStream();

var io = require('socket.io').listen(8082);

io.sockets.on('connection', function (socket) {
  
  socket.emit('ready', 'Server ready');

  socket.on('gallery', function (fn) {
    fn(photoNumber-1);
  });
  
  socket.on('front', function () {
	bothOn();
  });

  socket.on('left', function () {
    firstOn(); 
  });

  socket.on('right', function () {
    secondOn(); 
  });

  socket.on('stop', function () {
    bothOff();
  });

  socket.on('photo', function () {
    takePhoto();
  });

  socket.on('deletePhotos', function () {
    deletePhotos();
  });

  socket.on('camera', function (width) {
    liveCamera.doStart(width,Math.round((width/16)*9),10);
  });

  socket.on('disconnect',function(){
    liveCamera.doStop();
  });

  socket.on('restart', function () {
    reboot();
  });

  socket.on('shutdown', function () {
    shutdown();
  });
});

var express = require('express');
var app = express();

app.use(express.static(__dirname + '/web'));

app.get('/liveCamera', function(req,res) {
  res.writeHead(200, { 
    'Cache-Control': 'no-cache', 
    'Cache-Control': 'private', 
    'Pragma': 'no-cache', 
    'Content-Type': 'multipart/x-mixed-replace; boundary=myboundary'
  }); 
  var consume = function(buffer) { 
    res.write("--myboundary\r\n"); 
    res.write("Content-Type: image/jpeg\r\n"); 
    res.write("Content-Length: " + buffer.length + "\r\n"); 
    res.write("\r\n"); 
    res.write(buffer,'binary'); 
    res.write("\r\n"); 
  } 
  liveCamera.on('image', consume); 
  res.connection.on('close', function(){
    liveCamera.removeListener('image', consume); 
  }); 
});

app.listen(process.env.PORT || 3000);

process.on('exit', stopListening);
process.on('SIGINT', stopListening);