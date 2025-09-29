export const ErrorState = ({ error, onRetry }) => (
  <motion.div className="p-4 min-h-screen bg-background text-primary flex items-center justify-center">
    <div className="text-center max-w-md">
      <div className="bg-red-600/20 border border-red-500 rounded-lg p-6">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-primary mb-2">Connection Error</h1>
        <p className="text-secondary text-sm mb-4">{error}</p>
        <button onClick={onRetry} className="bg-accent hover:bg-accent/80 text-background px-4 py-2 rounded-lg font-bold">
          Retry
        </button>
      </div>
    </div>
  </motion.div>
);
