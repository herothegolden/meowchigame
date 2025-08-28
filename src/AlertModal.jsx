// src/AlertModal.jsx
import React from 'react';

export default function AlertModal({ show, title, message, buttons, onClose }) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content alert-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {title && <h2 className="modal-title">{title}</h2>}
        </div>
        <div className="modal-body">
          <p className="modal-subtitle" style={{ margin: 0 }}>{message}</p>
        </div>
        <div className="modal-footer">
          {buttons.map((button, index) => (
            <button
              key={index}
              className={`btn ${button.style === 'primary' ? 'primary' : ''}`}
              onClick={() => {
                if (button.onClick) button.onClick();
                onClose();
              }}
            >
              {button.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
