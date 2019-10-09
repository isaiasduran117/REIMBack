// Requires
var express = require('express');
var varias = require('../public/varias');
var configuracion = require('../config/config');

// Inicializar variables
var app = express();

var path = require('path');
var fs = require('fs');

const AWS = require('aws-sdk');





// Rutas
app.get('/:tipo/:img', (req, res, netx) => {

  var tipo = req.params.tipo;
  var img = req.params.img;

  // var pathImagen = path.resolve(__dirname, `../uploads/${tipo}/${img}`);

  // if (fs.existsSync(pathImagen)) {
  //   res.sendFile(pathImagen);
  // } else {
  //   var pathNoImagen = path.resolve(__dirname, `../assets/no-img.jpg`);
  //   res.sendFile(pathNoImagen);
  // }


  var s3 = new AWS.S3(configuracion.CONFIG_BUCKET);


  const params = {
    Bucket: "bucketcontainerpark",
    Key: `${tipo}/${img}`
  };


  s3.getObject(params, (err, data) => {
    if (err) {
      console.error('ERROR EN CALLBACK ' + `${tipo}/${img}`);
      return res.status(400).json({
        ok: false,
        mensaje: 'No se encontraron fotos',
        errors: { message: 'No se encontro el documento' }
      });

    } else {
      console.log(data);
      res.setHeader('Content-disposition', 'atachment; filename=' + img);
      res.setHeader('Content-length', data.ContentLength);
      res.send(data.Body);
    }
  });
});

// Recupera Fotos de Maniobra (Lavado o Reparacion)
app.get('/:id/:LR/:img', (req, res, netx) => {
  var id = req.params.id;
  var img = req.params.img;
  var LR = req.params.LR;

  var pathImagen = path.resolve(__dirname, `../uploads/maniobras/${id}/${LR}/${img}`);
  if (fs.existsSync(pathImagen)) {
    res.sendFile(pathImagen);
  } else {
    var pathNoImagen = path.resolve(__dirname, `../assets/no-img.jpg`);
    res.sendFile(pathNoImagen);
  }
});

// Fotos Lavados y Reparaciones de la carpeta
app.get('/:maniobra&:LR', (req, res, netx) => {
  var idManiobra = req.params.maniobra;
  var lavado_reparacion = req.params.LR;
  var pathFotos = "";
  var array = [];

  pathFotos = varias.DevuelveRutaFotosLR(idManiobra, lavado_reparacion);

  if (pathFotos !== "" && fs.existsSync(pathFotos)) {
    fs.readdir(pathFotos, function(err, files) {
      var allowedExtensions = /(.jpg|.jpeg|.png|.gif)$/i;
      var a = files.filter(function(file) { return allowedExtensions.exec(file); })
      a.forEach(foto => {
        var data = {
          name: foto,
          source: pathFotos + '\\' + foto
        };
        array.push(data)
      });

      res.status(200).json({
        ok: true,
        fotos: JSON.parse(JSON.stringify(array)),
        total: array.length
      });
      // res.json(array)
    });
  } else {
    // return res.status(400).json({
    //     ok: false,
    //     mensaje: 'No se encontraron fotos',
    //     errors: { message: 'No existen fotos para ' + lavado_reparacion }
    // });
  }
});

// export
module.exports = app;