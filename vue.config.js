const webpack = require('webpack')
const StyleLintPlugin = require('stylelint-webpack-plugin')

module.exports = {
  css: {
    loaderOptions: {
      sass: {
        prependData: `@import "~@/assets/styles/variable.scss";`,
      },
      less: {
        modifyVars: {
          'primary-color': '#e86b99',
          'link-color': '#e86b99',
          'border-radius-base': '4px',
        },
        javascriptEnabled: true,
      },
    },
  },
  chainWebpack: config => {
    config.module
      .rule('images')
      .use('url-loader')
      .loader('url-loader')
      .tap(options => Object.assign(options, { limit: 10240 }))
  },
  configureWebpack: {
    plugins: [
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      new StyleLintPlugin({
        files: ['src/**/*.{vue,html,css,scss,sass,less}'],
        failOnError: false,
        cache: false,
        fix: false,
      })
    ],
  },
}