// frontend/src/components/Dashboard.js

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Chat from './Chat';
import IntentManager from './IntentManager';
import EntityManager from './EntityManager';
import SlotManager from './SlotManager';
import './Dashboard.css';

const Dashboard = () => {
  const [activeComponent, setActiveComponent] = useState('Chat');

  const renderContent = () => {
    switch (activeComponent) {
      case 'Chat':
        return <Chat />;
      case 'Intents':
        return <IntentManager />;
      case 'Entities':
        return <EntityManager />;
      case 'Slots':
        return <SlotManager />;
      default:
        return <Chat />;
    }
  };

  return (
    <div className="dashboard">
      <Sidebar setActiveComponent={setActiveComponent} activeComponent={activeComponent} />
      <div className="content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;
