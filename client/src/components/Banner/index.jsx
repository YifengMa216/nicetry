import React, { Component } from 'react'
import 'antd/dist/antd.css';
// import PureRenderMixin from 'react-addons-pure-render-mixin'
// import style from './style.css'
import { Image, Carousel } from 'antd';
import pics from './banner_1.png'

const carouselImgs = [
    import('./banner_1.png'),
    import('./banner_2.png'),
    import('./banner_3.png'),
]

export default class Banner extends Component {
    renderCarousel = (imgs) => {
        return imgs.map((item, index) =>
            <div key={index} >
                <Image preview={false} src={pics} />
            </div>
        )
    }

    render() {
        console.log(carouselImgs)
        console.log(pics)
        return (
            <Carousel autoplay>
                {this.renderCarousel(carouselImgs)}
            </Carousel>
        );
    }


}