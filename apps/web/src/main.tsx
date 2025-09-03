import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TelegramProvider } from "./providers/TelegramProvider";
import { Layout } from "./ui/Layout";
import Home from "./routes/home";
import Rewards from "./routes/rewards";
import Tasks from "./routes/tasks";
import Profile from "./routes/profile";
import Play from "./routes/play";
import "./styles.css";

const App = () => (
  <TelegramProvider>
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/me" element={<Profile />} />
          <Route path="/play" element={<Play />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  </TelegramProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
