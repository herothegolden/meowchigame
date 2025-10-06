// Path: src/components/ui/tabs/index.jsx
// v2 — Dependency-free internal Tabs implementation (no clsx or Radix)

import React, { createContext, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Simple local helper: merges truthy strings
function cx(...args) {
  return args.filter(Boolean).join(" ");
}

const TabsContext = createContext();

export const Tabs = ({
  value: controlledValue,
  onValueChange,
  defaultValue,
  children,
  className,
}) => {
  const isControlled = controlledValue !== undefined;
  const [internal, setInternal] = useState(defaultValue || "");
  const value = isControlled ? controlledValue : internal;

  const setValue = (v) => {
    if (!isControlled) setInternal(v);
    if (onValueChange) onValueChange(v);
  };

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cx("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className }) => (
  <div
    className={cx(
      "flex items-center justify-around bg-nav/20 backdrop-blur-lg text-secondary",
      className
    )}
  >
    {children}
  </div>
);

export const TabsTrigger = ({ value, children, className }) => {
  const { value: active, setValue } = useContext(TabsContext);
  const isActive = value === active;
  return (
    <button
      onClick={() => setValue(value)}
      className={cx(
        "flex-1 py-2 text-sm font-semibold transition-colors border-b-2",
        isActive
          ? "text-accent border-accent"
          : "text-secondary border-transparent hover:text-primary",
        className
      )}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children, className }) => {
  const { value: active } = useContext(TabsContext);
  const isVisible = value === active;
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key={value}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={cx("p-4", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Tabs;
