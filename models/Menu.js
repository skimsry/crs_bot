const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  url: { type: String, required: true },
  order: { type: Number, default: 0 }
});

const menuSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  button_text: { type: String, required: true },
  title: { type: String, required: true },

  videos: [videoSchema]
});

module.exports = mongoose.model('Menu', menuSchema);
