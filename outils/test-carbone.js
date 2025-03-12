import fs from 'fs'
import carbone from 'carbone'

// Data to inject
var data = {
  nom : 'David Bruant',
  dateNaissance : new Date()
};

// Generate a report using the sample template provided by carbone module
// This LibreOffice template contains "Hello {d.firstname} {d.lastname} !"
// Of course, you can create your own templates!
carbone.render('./outils/template-1.odt', data, function(err, result){
  if (err) {
    return console.log(err);
  }
  // write the result
  fs.writeFileSync('./result-carbone.odt', result);
});