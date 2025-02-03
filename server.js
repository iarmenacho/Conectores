const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Ruta para procesar el archivo
app.post('/process', upload.single('excelFile'), (req, res) => {
  try {
    const deposito = req.body.deposito;
    const filePath = req.file.path;

    // Leer el archivo de Excel
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let data = xlsx.utils.sheet_to_json(sheet);

    // Filtrar datos
    data = data.filter(row => row.CANT > 0 && row.DEPOSITO === deposito);

    // Generar archivo de texto plano
    let textContent = '';
    let Nreg = 1;
    let NPed = 0;
    let Cont = 0;
    let TotReg = data.length;

    // INICIO
    textContent += `${String(Nreg).padStart(7, '0')}00000001001\n`;
    Nreg++;

    // ARCHIVO 440 CABECERA
    let Rq = 0;
    for (let x = 0; x < data.length; x++) {
      if (Rq !== data[x].REQ) {
        Cont = 0;
        Rq = data[x].REQ;
        NPed++;
      }
      if (Cont >= 36) {
        NPed++;
        Cont = 0;
      }
      Cont++;
      textContent += `${String(Nreg).padStart(7, '0')}044000010011${data[x].SUC}REQ${String(NPed).padStart(8, '0')}${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${' '.repeat(15)}${data[x].DESC}${' '.repeat(1)}${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String((new Date().getDate() - new Date().getDate()), '000')}07610${data[x].NOTAS}${' '.repeat(255 - data[x].NOTAS.length)}607${data[x].BODEGA}${data[x].BODEGA_SALIDA}${' '.repeat(20)}\n`;
      Nreg++;
    }

    // ARCHIVO 441 MOVIMIENTO
    Rq = 0;
    NPed = 0;
    for (let i = 0; i < data.length; i++) {
      if (Rq !== data[i].REQ) {
        Rq = data[i].REQ;
        Cont = 0;
        NPed++;
      }
      while (Rq === data[i].REQ) {
        if (Cont === 36) {
          NPed++;
          Cont = 1;
        } else {
          Cont++;
        }
        textContent += `${String(Nreg).padStart(7, '0')}04410001001${data[i].SUC}REQ${String(NPed).padStart(8, '0')}${String(Cont).padStart(10, '0')}0000000${data[i].ART}${' '.repeat(40)}${' '.repeat(20)}${' '.repeat(20)}${' '.repeat(20)}${data[i].BODEGA}${'60501'}${String(data[i].CANT).padStart(4, ' ')}${String(data[i].PRECIO).padStart(19, '0')}${'000000000000000.0000'}${new Date().toISOString().slice(0, 10).replace(/-/g, '')}001${data[i].SUC}99${' '.repeat(15)}${' '.repeat(15)}${' '.repeat(255)}${' '.repeat(2000)}\n`;
        Nreg++;
        i++;
        if (i >= TotReg) break;
      }
      if (i < TotReg - 1) i--;
    }

    // FIN
    textContent += `${String(Nreg).padStart(7, '0')}99990001001\n`;

    // Enviar el archivo plano como respuesta
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename=Requisicion.txt');
    res.send(textContent);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al procesar el archivo.');
  }
});

// Servir archivos estáticos
app.use(express.static('public'));

// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor iniciado en http://localhost:3000');
});