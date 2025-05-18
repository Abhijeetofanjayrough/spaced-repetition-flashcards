import React, { useState } from 'react';
import Modal from 'react-modal';
import './ReportCardModal.css'; // We'll create this CSS file next

interface ReportCardModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitReport: (reportText: string) => void;
  cardFront?: string;
}

const ReportCardModal: React.FC<ReportCardModalProps> = ({ 
  isOpen, 
  onRequestClose, 
  onSubmitReport,
  cardFront
}) => {
  const [reportText, setReportText] = useState('');

  const handleSubmit = () => {
    if (reportText.trim()) {
      onSubmitReport(reportText.trim());
      setReportText(''); // Clear after submit
      onRequestClose(); // Close modal
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Report Card Issue Modal"
      className="report-card-modal"
      overlayClassName="report-card-modal-overlay"
      appElement={document.getElementById('root') || undefined}
    >
      <h2>Report Issue with Card</h2>
      {cardFront && <p className="report-card-preview">Card: <strong>{cardFront.substring(0, 100)}{cardFront.length > 100 ? '...' : ''}</strong></p>}
      <textarea
        value={reportText}
        onChange={(e) => setReportText(e.target.value)}
        placeholder="Please describe the issue..."
        rows={5}
      />
      <div className="report-modal-actions">
        <button onClick={onRequestClose} className="btn-secondary">Cancel</button>
        <button onClick={handleSubmit} className="btn-primary" disabled={!reportText.trim()}>Submit Report</button>
      </div>
    </Modal>
  );
};

export default ReportCardModal; 