// frontend/src/components/ui/tabs.jsx
import React, { useState } from "react";

// Container that manages which tab is active
export const Tabs = ({ value, onValueChange, children, className }) => {
  const [active, setActive] = useState(value);
  const changeTab = (val) => {
    setActive(val);
    onValueChange?.(val);
  };
  return (
    <div className={className}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { active, changeTab })
      )}
    </div>
  );
};

// Horizontal list of tab buttons
export const TabsList = ({ children, className, active, changeTab }) => (
  <div className={`flex border-b border-white/10 ${className || ""}`}>
    {React.Children.map(children, (child) =>
      React.cloneElement(child, { active, changeTab })
    )}
  </div>
);

// Each clickable tab button
export const TabsTrigger = ({ value, children, active, changeTab }) => {
  const isActive = active === value;
  return (
    <button
      onClick={() => changeTab(value)}
      className={`px-4 py-2 text-sm font-medium transition-colors duration-200
        ${isActive ? "text-white border-b-2 border-accent" : "text-gray-400 hover:text-white"}`}
    >
      {children}
    </button>
  );
};

// The panel that appears when a tab is active
export const TabsContent = ({ value, active, children }) =>
  active === value ? <div className="p-4">{children}</div> : null;
