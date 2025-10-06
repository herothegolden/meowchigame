// Path: frontend/src/components/ui/tabs.jsx
// Minimal functional tab system compatible with your ProfilePage

import React, { useState } from "react";

export const Tabs = ({ value, onValueChange, children, className }) => {
  const [active, setActive] = useState(value);
  const handleChange = (val) => {
    setActive(val);
    onValueChange?.(val);
  };
  return (
    <div className={className}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { active, onChangeTab: handleChange })
      )}
    </div>
  );
};

export const TabsList = ({ children, className, onChangeTab, active }) => (
  <div className={`flex ${className}`}>{React.Children.map(children, (child) =>
    React.cloneElement(child, { onChangeTab, active })
  )}</div>
);

export const TabsTrigger = ({ value, children, active, onChangeTab }) => (
  <button
    onClick={() => onChangeTab?.(value)}
    className={`px-3 py-2 text-sm font-medium transition-colors ${
      active === value
        ? "text-white border-b-2 border-accent"
        : "text-gray-400 hover:text-white"
    }`}
  >
    {children}
  </button>
);

export const TabsContent = ({ value, active, children }) => {
  if (active !== value) return null;
  return <div className="p-4">{children}</div>;
};
