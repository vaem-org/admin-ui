module.exports = {
  configureWebpack: {
    devtool: process.env.NODE_ENV === 'production' ? false : 'eval-source-map'
  },
  publicPath: './'
};