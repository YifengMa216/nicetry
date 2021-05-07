import React from 'react'
import { Spin } from 'antd';
import style from './style.module.css'
export const Loading=()=>(
        <div className={style.container}>
            <Spin size="large"/>
        </div>
);