const express = require('express');
const mdAutenticacion = require('../middlewares/autenticacion');
const Merma = require('../models/merma');
const app = express();
const mongoose = require('mongoose');
const mermasController = require('../controllers/mermasController');

// ==========================================
//  Obtener todas las Mermas
// ==========================================

app.get('/', mdAutenticacion.verificaToken, (req, res) => {
    const result = mermasController.consultaMermas(req, res);
    result.then(mermas => {
        res.status(200).json({
            ok: true,
            mermas,
            totalRegistros: mermas.length
        });
    }).catch(error => {
        return res.status(500).json({
            ok: false,
            mensaje: 'Error cargando mermas',
            errors: error
        });
    });
});

// ==========================================
//  Obtener Merma por ID
// ==========================================
app.get('/merma/:id', mdAutenticacion.verificaToken, (req, res) => {
    const result = mermasController.consultaMermaById(req, res);
    result.then(merma => {
        if (merma) {
            res.status(200).json({
                ok: true,
                merma,
            });
        } else {
            return res.status(400).json({
                ok: false,
                mensaje: `La merma con el id ${req.params.id} no existe`,
                errors: { message: 'No existe una merma con ese ID' }
            });
        }
    }).catch(error => {
        return res.status(500).json({
            ok: false,
            mensaje: 'Error buscando merma',
            errors: error
        });
    });
});

// ==========================================
// Crear una nueva merma
// ==========================================
app.post('/merma/', mdAutenticacion.verificaToken, (req, res) => {
    const body = req.body;
    const merma = new Merma({
        motivo: body.motivo,
        materiales: body.materiales,
        usuarioAlta: req.usuario._id
    });

    merma.save((err, mermaGuardada) => {
        if (err) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Error al crear merma',
                errors: err
            });
        }
        res.status(201).json({
            ok: true,
            mensaje: 'Merma creada con éxito.',
            merma: mermaGuardada
        });
    });
});

// ==========================================
// Actualizar merma
// ==========================================

app.put('/merma/:id', mdAutenticacion.verificaToken, (req, res) => {
    const id = req.params.id;
    const body = req.body;
    Merma.findById(id, (err, merma) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al buscar merma',
                errors: err
            });
        }
        if (!merma) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La merma con el id ' + id + ' no existe',
                errors: { message: 'No existe una merma con ese ID' }
            });
        }

        if (!merma.fAprobacion) {
            merma.motivo = body.motivo;
            merma.materiales = body.materiales;
            merma.usuarioMod = req.usuario._id;
            merma.fMod = new Date();
            merma.save((err, mermaGuardada) => {
                if (err) {
                    return res.status(400).json({
                        ok: false,
                        mensaje: 'Error al actualizar merma',
                        errors: err
                    });
                }
                res.status(200).json({
                    ok: true,
                    merma: mermaGuardada
                });
            });
        } else {
            return res.status(400).json({
                ok: false,
                mensaje: 'No puedes actualizar esta merma por que ya esta aprobada.',
                errors: { message: 'No puedes actualizar esta merma por que ya esta aprobada.' }
            });
        }
    });
});

// ============================================
//  Borrar un Merma por el id
// ============================================
app.delete('/merma/:id', mdAutenticacion.verificaToken, (req, res) => {
    const result = mermasController.consultaMermaById(req, res);
    result.then(merma => {
        if (merma) {
            if (!merma.fAprobacion) {
                merma.remove();
                res.status(200).json({
                    ok: true,
                    merma
                });
            } else {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'No puedes eliminar esta merma por que ya esta aprobada.',
                    errors: { message: 'No puedes eliminar esta merma por que ya esta aprobada.' }
                });
            }
        } else {
            return res.status(400).json({
                ok: false,
                mensaje: `La merma con el id ${req.params.id} no existe`,
                errors: { message: 'No existe una merma con ese ID' }
            });
        }
    }).catch(error => {
        return res.status(500).json({
            ok: false,
            mensaje: 'Error buscando merma',
            errors: error
        });
    });
});

// ==========================================
// Aprobar Merma 
// ==========================================
app.put('/aprobar/merma/:id', mdAutenticacion.verificaToken, (req, res) => {
    const idMerma = req.params.id;
    const fAprobacion = new Date();
    const comentario = req.body.comentarioAprobacion;
    if (req.usuario.role === 'ADMIN_ROLE' || req.usuario.role === 'PATIOADMIN_ROLE') {
        Merma.updateOne({ "_id": new mongoose.Types.ObjectId(idMerma) }, {
            $set: {
                "usuarioAprobacion": new mongoose.Types.ObjectId(req.usuario._id),
                "fAprobacion": fAprobacion,
                "comentarioAprobacion": comentario
            }
        }, (err, mermaActualizada) => {
            if (err) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'Error al autorizar merma',
                    errors: err
                });
            }
            res.status(200).json({
                ok: true,
                mermaActualizada
            });
        });
    } else {
        return res.status(400).json({
            ok: false,
            mensaje: 'No tienes privilegios para Aprobar Mermas'
        });
    }
});

// ==========================================
// Desaprobar merma
// ==========================================

app.put('/desaprobar/merma/:id', mdAutenticacion.verificaToken, (req, res) => {
    const id = req.params.id;

    if (req.usuario.role === 'ADMIN_ROLE' || req.usuario.role === 'PATIOADMIN_ROLE') {
        Merma.updateOne({ "_id": id }, { $unset: { "usuarioAprobacion": undefined, "fAprobacion": undefined, "comentarioAprobacion": undefined } }, (err, mermaDesaprobada) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al desaprobar merma',
                    errors: err
                });
            }

            if (!mermaDesaprobada) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'No existe una maniobra con ese id',
                    errors: { message: 'No existe una maniobra con ese id' }
                });
            }

            res.status(200).json({
                ok: true,
                merma: mermaDesaprobada
            });
        });
    }
});
module.exports = app;