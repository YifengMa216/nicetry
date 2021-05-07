import React from "react";
import style from "./style.module.css";
import { Button } from "antd";
import { SmileOutlined } from "@ant-design/icons";

export const Logined = (props) => (
    <div className={style.container}>
        <SmileOutlined spin fontSize="40px" />
        <p>欢迎：{props.userInfo.username}</p>
        {/* <p className={style.centerP}>光临我的博客~</p> */}
        {props.userInfo.userType === "admin" ? (
            <Button
                onClick={() => props.history.push("/admin/managerUser")}
                type="primary"
            >
                点击进入管理页面
            </Button>
        ) : null}
    </div>
);
