import React from "react";
import { chatLocale, chatT } from "./locale.js";

import { createRoot } from "react-dom/client";
import App from "./App";
import SopDesigner from "./SopDesigner";
import { isDesignerSurface } from "./sop-designer.js";
import "./styles.css";
import "./home.css";
import "./navigation.css";
import "../../web/app/hover-ink.css";
import "../../web/app/hover-ink.js";
import "./hui-tokens.css";
import "../../web/app/hui-controls.css";
import "../../web/app/hui-tooltip.js";
import "./navigation-motion.css";
import "./composer-context.css";
import "../../web/app/sliding-tabs.css";
class Boundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <div className="fatal-error">
        <h1>{chatT("工作台暂时无法打开", "Tạm thời không thể mở không gian làm việc")}</h1>
        <p>{this.state.error.message}</p>
        <button onClick={() => location.reload()}>{chatT("重新加载", "Tải lại")}</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
if (chatLocale() === "vi") {
  document.documentElement.lang = "vi-VN";
  document.title = "LoopForge · Không gian làm việc";
}
createRoot(document.getElementById("root")).render(
  <Boundary>
    {isDesignerSurface(location.search) ? <SopDesigner /> : <App />}
  </Boundary>,
);
