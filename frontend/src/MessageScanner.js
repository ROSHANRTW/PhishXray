import React, { useState } from 'react';
import styles from './MessageScanner.module.css';

const MessageScanner = () => {
  const [scanMode, setScanMode] = useState('text'); // 'text' or 'screenshot'

  return (
    <div className={styles.scannerContainer}>
      <h2>Message/Media Scanner</h2>
      <p>Paste a message or upload screenshot to find hidden suspicious links</p>
      
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${scanMode === 'text' ? styles.active : ''}`}
          onClick={() => setScanMode('text')}
        >
          Paste Text
        </button>
        <button 
          className={`${styles.tab} ${scanMode === 'screenshot' ? styles.active : ''}`}
          onClick={() => setScanMode('screenshot')}
        >
          Upload Screenshot
        </button>
      </div>

      <div className={styles.scannerContent}>
        {scanMode === 'text' ? (
          <textarea placeholder="Paste your message here..."></textarea>
        ) : (
          <div className={styles.uploadArea}>
            <p>Upload Image screenshot of your WhatsApp chat, email, or SMS</p>
            <input type="file" accept="image/*" />
          </div>
        )}
      </div>

      <button className={styles.scanButton}>Scan Message</button>
    </div>
  );
};

export default MessageScanner;