// Path: frontend/src/pages/ProfilePage/tabs/TasksTab.jsx
// v3 — P1 perf polish:
// - Code-split the heavy TasksPage so it loads only when the Tasks tab is opened
// - Provide a minimal, non-blocking Suspense fallback
// - No framer-motion or extra logic to keep first-paint cost minimal

import React, { lazy, Suspense } from 'react';

// 🔻 Lazy-load to keep Profile's initial bundle small
const TasksPage = lazy(() => import('../../TasksPage'));

const TasksTab = () => {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-center text-secondary text-sm">
          Loading tasks…
        </div>
      }
    >
      <TasksPage />
    </Suspense>
  );
};

export default TasksTab;
``` :contentReference[oaicite:0]{index=0}
