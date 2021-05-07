import React, { Component } from "react";
import PureRenderMixin from "react-addons-pure-render-mixin";
import { bindActionCreators } from "redux";
import remark from "remark";
import { connect } from "react-redux";
import { actions } from "../../reducers/frontReducer";
import reactRenderer from "remark-react";
import style from "./style.module.css";
import {
    Comment,
    Tooltip,
    List,
    Typography,
    Avatar,
    Form,
    Button,
    Input,
} from "antd";
import moment from "moment";

import {
    UserOutlined,
    CommentOutlined,
    EyeOutlined,
    CalendarOutlined,
} from "@ant-design/icons";

const { Paragraph } = Typography;
const { get_article_detail, add_comment } = actions;
const { TextArea } = Input;

const Editor = ({ onChange, onSubmit, submitting, value }) => (
    <>
        <Form.Item>
            <TextArea rows={4} onChange={onChange} value={value} />
        </Form.Item>
        <Form.Item>
            <Button
                htmlType="submit"
                loading={submitting}
                onClick={onSubmit}
                type="primary"
            >
                Add Comment
            </Button>
        </Form.Item>
    </>
);
class Detail extends Component {
    constructor(props) {
        super(props);
        this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(
            this
        );
    }

    handleChange = (e) => {
        this.setState({
            value: e.target.value,
        });
    };

    handleSubmit = () => {
        if (!this.state.value) {
            return;
        }

        const value = this.state.value;

        // this.props.add_comment(this.props.location.state.id, "qweqew", "qwe");
        // this.setState({
        //     submitting: true,
        //     value: "",
        // });

        this.setState({
            submitting: false,
            value: "",
        });
        // this.forceUpdate();

        this.props.add_comment(this.props.location.state.id, value, "匿名提交");

        this.props.get_article_detail(this.props.location.state.id);
    };

    state = {
        submitting: false,
        value: "",
    };

    render() {
        const {
            articleContent,
            title,
            author,
            viewCount,
            // commentCount,
            comments,
            time,
        } = this.props;

        console.log("-------");
        // console.log("comments");
        // console.log(comments);
        // console.log(this.props);

        let commentsCount = 0;
        let newData = [];
        if (comments) {
            commentsCount = comments.length;

            for (let i = 0; i < comments.length; ++i) {
                newData.push({
                    actions: [],
                    // author: "Han Solo",
                    avatar: <Avatar size={48} icon={<UserOutlined />} />,
                    content: <p>{comments[i].content}</p>,
                    datetime: (
                        <Tooltip
                            title={moment()
                                .subtract(2, "days")
                                .format("YYYY-MM-DD HH:mm:ss")}
                        >
                            <span>
                                {moment().subtract(2, "days").fromNow()}
                            </span>
                        </Tooltip>
                    ),
                });
            }
        }

        return (
            <div className={style.container}>
                <h2>{title}</h2>
                <div className={style.articleInfo}>
                    <span>
                        <UserOutlined />
                        {/* <img
                            className={style.authorImg}
                            src={require("./author.png")}
                        />{" "} */}
                        {author}
                    </span>
                    <span>
                        <CalendarOutlined />
                        {/* <img src={require("./calendar.png")} />  */}
                        {time}
                    </span>
                    <span>
                        <CommentOutlined />
                        {/* <img src={require("./comments.png")} />  */}
                        {commentsCount}
                    </span>
                    <span>
                        <EyeOutlined />
                        {/* <img src={require("./views.png")} /> */}
                        {viewCount}
                    </span>
                </div>
                <Typography>
                    <Paragraph>
                        <p
                            dangerouslySetInnerHTML={{
                                __html: remark()
                                    .use(reactRenderer)
                                    .processSync(articleContent).contents,
                            }}
                        ></p>
                    </Paragraph>
                </Typography>
                {/* <div id="preview" className={style.content}>
                    {
                        remark().use(reactRenderer).processSync(articleContent)
                            .contents
                    }
                </div> */}
                {
                    <List
                        className="comment-list"
                        header={`${newData.length} replies`}
                        itemLayout="horizontal"
                        dataSource={newData}
                        renderItem={(item) => (
                            <li>
                                <Comment
                                    actions={item.actions}
                                    author={item.author}
                                    avatar={item.avatar}
                                    content={item.content}
                                    datetime={item.datetime}
                                />
                            </li>
                        )}
                    />
                }
                <Comment
                    avatar={<Avatar size={48} icon={<UserOutlined />} />}
                    content={
                        <Editor
                            onChange={this.handleChange}
                            onSubmit={this.handleSubmit}
                            submitting={this.submitting}
                            value={this.state.value}
                        />
                    }
                />
                ,
            </div>
        );
    }

    componentDidMount() {
        this.props.get_article_detail(this.props.location.state.id);
    }
}

function mapStateToProps(state) {
    const {
        content,
        title,
        author,
        viewCount,
        // commentCount,
        comments,
        time,
    } = state.front.articleDetail;
    return {
        articleContent: content,
        title,
        author,
        viewCount,
        // commentCount,
        comments,
        time,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        get_article_detail: bindActionCreators(get_article_detail, dispatch),
        add_comment: bindActionCreators(add_comment, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Detail);
