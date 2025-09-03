import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const nav = useNavigate();
  const { pathname } = useLocation();
  return (
    <div style={{ paddingBottom: 80 }}>
      {children}
      {/* Play Floating Button */}
      <button className="fab" onClick={() => nav("/play")}>PLAY</button>

      {/* Bottom Tab Bar */}
      <nav className="tabbar">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/rewards">Rewards</NavLink>
        <NavLink to="/tasks">Tasks</NavLink>
        <NavLink to="/me">Profile</NavLink>
      </nav>
    </div>
  );
};
