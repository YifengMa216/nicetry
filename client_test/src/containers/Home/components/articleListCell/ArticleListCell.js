import React from "react";
import style from "./style.module.css";
import {
    CommentOutlined,
    EyeOutlined,
    CalendarOutlined,
    ArrowRightOutlined,
} from "@ant-design/icons";

export const ArticleListCell = (props) => (
    <div
        className={`${style.container} `}
        onClick={() => {
            props.history.push(`/detail/${props.data._id}`, {
                id: props.data._id,
            });
            props.getArticleDetail(props.data._id);
        }}
    >
        {/* <div>
            <img src={props.data.coverImg} alt="" />
        </div> */}
        <div className={style.bottomContainer}>
            <p className={style.title}>{props.data.title}</p>
            {/* <p className={style.summary}>
                这里应该有摘要的，因为设计的数据库表表结构的时候忘记了，后面也是懒得加了，感觉太麻烦了，就算了
            </p> */}
            <div>
                <p>
                    <span>
                        <CalendarOutlined style={{ fontSize: "20px" }} />
                        {/* <img src={require("./calendar.png")} alt="发表日期" /> */}
                        {props.data.time}
                    </span>
                    <span>
                        <EyeOutlined style={{ fontSize: "20px" }} />
                        {/* <img src={require("./views.png")} alt="词条浏览数" /> */}
                        {props.data.viewCount}
                    </span>
                    <span>
                        <CommentOutlined style={{ fontSize: "20px" }} />
                        {/* <img src={require("./comments.png")} alt="评论数" /> */}
                        {props.data.commentCount ? props.data.commentCount : 0}
                    </span>
                </p>
                <span className={style.lastSpan}>
                    浏览词条
                    <ArrowRightOutlined /> <span></span>
                </span>
            </div>
        </div>
    </div>
);
