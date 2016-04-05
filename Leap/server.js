var io = require('socket.io-client');
var socket = io.connect('http://192.168.42.1:8082');

socket.on('connect', function () { 
	console.log("socket connected"); 
});

var Leap = require('leapjs');
var prevPalmPosition, currentPalmPosition, tolerance = 50;
var stopped = true;
Leap.loop({enableGestures: true}, function(frame) {
	if (frame.hands.length > 0){
		hand = frame.hands[0];
		currentPalmPosition = hand.palmPosition;
		if (prevPalmPosition) {
			var changeX = currentPalmPosition[0] - prevPalmPosition[0];
			var changeY = currentPalmPosition[1] - prevPalmPosition[1];
			if (Math.abs(changeX) > tolerance) {
				if (changeX > 0){
					socket.emit('right');
					stopped = false;
				}
				else if (changeX < 0){
					socket.emit('left');
					stopped = false;
				}
				prevPalmPosition = currentPalmPosition;
			} else {
				// Reset direction
			}
			if (Math.abs(changeY) > tolerance) {
				if (changeY > 0){
					socket.emit('front');
					stopped = false;
				}
				else if (changeY < 0){
					socket.emit('stop');
					stopped = true;
				}
				prevPalmPosition = currentPalmPosition;
			} else {
			    // Reset direction
			}
		} else 
			prevPalmPosition = currentPalmPosition;
	}
	else {
		if (!stopped){
			socket.emit('stop');
			stopped = true;
		}
	}
});

var keypress = require('keypress');
keypress(process.stdin);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.setRawMode(true);

process.stdin.on('keypress', function (ch, key) {
  if (!key) { 
  	return; 
  }
  if (key.name === 'q') {
    console.log('Quitting');
    process.exit();
  } else if (key.name === 'up') {
    socket.emit('front');
  } else if (key.name === 'down') {
    socket.emit('stop');
  } else if (key.name === 'left') {
    socket.emit('left');
  } else if (key.name === 'right') {
    socket.emit('right');
  } else if (key.name === 'space') {
    socket.emit('photo');
  }
});