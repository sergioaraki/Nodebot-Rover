var child_process = require('child_process');
var fs = require('fs');
var events = require('events');
var util = require('util');

function CameraStream()
{
  // processus fils pour raspistill
  this.cameraProcess = null;

  // Observateur de dossier
  this.fsWatcher = null;

  // emplacement de l'exacutable raspistill
  this.cmd = '/opt/vc/bin/raspistill';
};

// prise en charge de la gestion d'événements
util.inherits( CameraStream, events.EventEmitter );

CameraStream.prototype.doStop = function()
{
  // tue le process raspistill
  if(this.cameraProcess)
  {
    this.cameraProcess.kill();
    this.cameraProcess = null;
  }

  // stopper le monitoring du dossier
  if(this.fsWatcher)
  {
    this.fsWatcher.close();
    this.fsWatcher = null;
  }

  // déclenche un evt
  this.emit('close');
};


CameraStream.prototype.doStart = function(w, h, q)
{
  // paramètres du timelapse
  var args = [
    '--output', '/ram/image.jpg',
    '--width', w,
    '--height', h,
    '--quality', q,
    '--thumb','none',
    '--timeout','9999999',
    '--timelapse','0',
    '--nopreview',
    '-bm'
  ];

  // lancement du timelapse
  this.cameraProcess = child_process.spawn(this.cmd, args);

  var self = this;

  this.cameraProcess.stdout.on('data', function (data){
    self.emit('out', data);
  });

  this.cameraProcess.stderr.on('data', function (data){
    self.emit('error', data);
  });

  this.cameraProcess.on('close', function (code){
    self.cameraProcess = null;
    self.emit( 'close', code );
  });

  // observation du dossier qui accueille les images
  this.fsWatcher = fs.watch('/ram/', function(event, filename){

    // "rename" est appelé une seule fois pendant le process d'enregistrement d'une image
    // on utilise donc cet evt comme signal d'une nouvelle image disponible
    if(event === "rename")
    {
      fs.readFile('/ram/' + filename, function(err, data){

        if(err)
        {
          return;
        }
        self.emit("image", data);
      });
    }
  });

  this.emit("start");
};

module.exports = CameraStream;
