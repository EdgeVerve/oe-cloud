const fs = require('fs');
const path = require('path');

function normalizeMixinName(str, normalization) {
  switch (normalization) {
    case false:
    case 'none': return str;
    // eslint-disable-next-line no-undefined
    case undefined:
    case 'classify':
      str = String(str).replace(/([A-Z]+)/g, ' $1').trim();
      str = String(str).replace(/[\W_]/g, ' ').toLowerCase();
      str = str.replace(/(?:^|\s|-)\S/g, function (c) {
        return c.toUpperCase();
      });
      str = str.replace(/\s+/g, '');
      return str;

    case 'dasherize':
      str = String(str).replace(/([A-Z]+)/g, ' $1').trim();
      str = String(str).replace(/[\W_]/g, ' ').toLowerCase();
      str = str.replace(/\s+/g, '-');
      return str;

    default:
      if (typeof normalization === 'function') {
        return normalization(str);
      }

      var err = new Error('Invalid normalization format - "%s"',
        normalization);
      err.code = 'INVALID_NORMALIZATION_FORMAT';
      throw err;
  }
}

module.exports.getMixins = (folder, normalization) => {
  var mixinInstructions = [];

  if (fs.existsSync(folder)) {
    fs.readdirSync(folder).forEach(file => {
      var filepath = path.resolve(folder, file);
      var ext = path.extname(filepath);
      if (!ext || ext.toLowerCase() !== '.js') {
        return;
      }

      var name = path.basename(filepath, ext);
      name = normalizeMixinName(name, normalization);
      mixinInstructions.push(name);
    });
  }

  return mixinInstructions;
};
