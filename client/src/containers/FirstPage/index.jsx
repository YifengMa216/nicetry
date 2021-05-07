import React, { Component } from 'react'
import { connect } from 'react-redux'
import Banner from '../../components/Banner'

export class FirstPage extends Component {
    render() {
        return (
            <div>
                <Banner />
                FirstPage..
            </div>
        )
    }
}

const mapStateToProps = (state) => ({

})

const mapDispatchToProps = {

}

export default connect(mapStateToProps, mapDispatchToProps)(FirstPage)
