if (process.env.NODE_ENV === 'production') {
  module.exports = process.env.dt_db;
} else {
  module.exports = 'mongodb://localhost/dynamic-tutorials';
}
