let React = require('react')
  , { Link, RouteHandler } = require('react-router')

let { AppCanvas, AppBar } = require('material-ui')

let App = React.createClass({
  render() {
    return (
      <AppCanvas predefinedLayout={1}>
        <AppBar zDepth={0} showMenuIconButton={false}
            title=<Link to="home"><h1 className="mui-app-bar-title">Bascodeball</h1></Link> >
        </AppBar>
        <div className="mui-app-content-canvas">
          <RouteHandler />
        </div>
      </AppCanvas>
    )
  }
})

module.exports = App
