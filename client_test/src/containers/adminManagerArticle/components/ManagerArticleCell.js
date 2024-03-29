import style from "../style.moudle.css";
import React from "react";
import { Button } from "antd";
import { EyeOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";

export const ManagerArticleCell = (props) => (
    <div className={style.cellContainer}>
        <div className={style.cellAboutArticle}>
            <p className={style.articleTitle}>{props.data.title}</p>
            <p className={style.articleInfo}>
                <span>作者:{props.data.author}</span>
                <span>阅读数:{props.data.viewCount}</span>
                <span>评论数:{props.data.commentCount}</span>
                <span>发表时间:{props.data.time}</span>
            </p>
        </div>
        <div className={style.cellState}>
            <span>{props.data.status === 1 ? "已发布" : "草稿"}</span>
        </div>
        <div className={style.cellOperation}>
            <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                    props.edit_article(props.data._id);
                    props.history.push("/admin/newArticle");
                }}
            >
                编辑
            </Button>
            <Button
                type="primary"
                icon={<DeleteOutlined />}
                onClick={() => props.delete(props.data._id)}
            >
                删除
            </Button>
            <Button
                type="primary"
                icon={<EyeOutlined />}
                onClick={() => {
                    props.history.push(`/detail/${props.data._id}`, {
                        id: props.data._id,
                    });
                    props.getArticleDetail(props.data._id);
                }}
            >
                查看
            </Button>
        </div>
    </div>
);
