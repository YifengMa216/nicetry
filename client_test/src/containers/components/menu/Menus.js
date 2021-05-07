import React, { Component } from "react";
import { Menu, Input } from "antd";

import style from "./style.module.css";
const { Search } = Input;

export default class Menus extends Component {
    constructor(props) {
        super(props);
        this.state = {
            current: this.props.categories[0],
        };
    }

    onSearch = (value) => {
        if (value && value.trim()) {
            console.log("search: ", value);
            this.props.getArticleList("", 1, value);

            let toPath = "search_" + value;

            this.setState({
                current: "",
            });

            this.props.history.push(toPath);
        }
    };

    handleClick = (e) => {
        console.log("click ", e);
        if (e.key === "All") {
            this.props.getArticleList("");
        } else {
            this.props.getArticleList(e.key);
        }
        let toPath = e.key === "All" ? "/" : "/" + e.key;
        this.setState({
            current: e.key,
        });
        this.props.history.push(toPath);
    };

    render() {
        return (
            <div>
                <Menu
                    onClick={this.handleClick}
                    selectedKeys={[this.state.current]}
                    mode="horizontal"
                    className={style.MenuContainer}
                >
                    {this.props.categories.map((item, index) => (
                        <Menu.Item key={item}>{item}</Menu.Item>
                    ))}
                </Menu>

                <Search
                    placeholder="Search"
                    onSearch={this.onSearch}
                    enterButton
                />
            </div>
        );
    }

    componentDidMount() {
        this.setState({
            current:
                this.props.history.location.pathname.replace("/", "") || "All",
        });
    }
}
