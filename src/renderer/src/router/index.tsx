import React, { useEffect } from "react";
import { lazy, Suspense } from "react";
import { Routes, Route, HashRouter } from "react-router-dom";

import { ROUTERS } from "./ROUTERS";
import { ConfigProvider, Spin, theme } from "antd";
import Nav from "@renderer/components/Nav";
import "./index.module.less";

const Home = lazy(() => import("@renderer/pages/Home"));
const Transcode = lazy(() => import("@renderer/pages/Transcode"));
const Extract = lazy(() => import("@renderer/pages/Extract"));
const TTS = lazy(() => import("@renderer/pages/TTS"));
const Setting = lazy(() => import("@renderer/pages/Setting"));
const ScreenRecord = lazy(() => import("@renderer/pages/ScreenRecord"));
const ScreenShot = lazy(() => import("@renderer/pages/ScreenShot"));

export default function BaseRouter() {
  const [isDark, setIsDark] = React.useState(false);

  useEffect(() => {
    initTheme();
    window.electron.ipcRenderer.on("THEME_CHANGE", initTheme);
    window.electron.ipcRenderer.on("MAIN_LOG", (e, data) => {
      console.log("main log", data);
    });
  }, []);

  // 初始化主题
  const initTheme = async () => {
    const themeRes = await window.api.getStore("theme");
    if (themeRes === "dark") {
      setIsDark(true);
    } else if (themeRes === "light") {
      setIsDark(false);
    } else {
      if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        // 检测到暗色主题
        setIsDark(true);
      } else {
        // 检测到亮色主题
        setIsDark(false);
      }
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <HashRouter>
        <div styleName={`app${isDark ? " is-dark" : " is-light"}`}>
          <Nav />
          <Suspense fallback={<Spin />}>
            <div styleName="container">
              <Routes>
                <Route path={ROUTERS.HOME} element={<Home />} />
                <Route path={ROUTERS.TRANSCODE} element={<Transcode />} />
                <Route path={ROUTERS.EXTRACT} element={<Extract />} />
                <Route path={ROUTERS.TTS} element={<TTS />} />
                <Route
                  path={ROUTERS.SCREEN_RECORD}
                  element={<ScreenRecord />}
                />
                <Route path={ROUTERS.SCREEN_SHOT} element={<ScreenShot />} />
                <Route path={ROUTERS.SETTING} element={<Setting />} />
              </Routes>
            </div>
          </Suspense>
        </div>
      </HashRouter>
    </ConfigProvider>
  );
}