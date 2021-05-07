import React, { Component } from 'react'
import FirstPage from './containers/FirstPage'
import Loading from './components/Loading'
import TopMenu from './components/TopMenu'

export default class App extends Component {
  render() {
    return (
      <div>
        App..
        <Loading />
        <TopMenu />
        <FirstPage />
      </div>
    )
  }
}
