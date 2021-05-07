import React, { Component } from "react";
import { Menu } from "antd";
import {
    UsergroupAddOutlined,
    FileAddOutlined,
    TagsOutlined,
    EditOutlined,
} from "@ant-design/icons";

const menus = [
    { url: "/managerUser", name: "用户管理", icon: <UsergroupAddOutlined /> },
    { url: "/newArticle", name: "发布词条", icon: <FileAddOutlined /> },
    { url: "/managerTags", name: "标签管理", icon: <TagsOutlined /> },
    { url: "/managerArticle", name: "词条管理", icon: <EditOutlined /> },
];

export default class AdminMenu extends Component {
    render() {
        console.log(this.props.url);

        return (
            <div>
                <Menu
                    selectedKeys={[this.props.url]}
                    mode="inline"
                    theme="light"
                    onClick={({ key }) => {
                        this.props.changeUrl(key);
                        this.props.history.push(`/admin${key}`);
                    }}
                >
                    {menus.map((item, index) => (
                        <Menu.Item key={item.url}>
                            {item.icon}
                            <span>{item.name}</span>
                        </Menu.Item>
                    ))}
                </Menu>
            </div>
        );
    }
}
