// frontend/src/components/Sidebar.js

import React from 'react';
import './Sidebar.css';

const Sidebar = ({ setActiveComponent, activeComponent }) => {
  return (
    <div className="sidebar">
      <h2>Menu</h2>
      <ul>
        <li
          className={activeComponent === 'Chat' ? 'active' : ''}
          onClick={() => setActiveComponent('Chat')}
        >
          Chat
        </li>
        <li
          className={activeComponent === 'Intents' ? 'active' : ''}
          onClick={() => setActiveComponent('Intents')}
        >
          Intents
        </li>
        <li
          className={activeComponent === 'Entities' ? 'active' : ''}
          onClick={() => setActiveComponent('Entities')}
        >
          Entities
        </li>
        <li
          className={activeComponent === 'Slots' ? 'active' : ''}
          onClick={() => setActiveComponent('Slots')}
        >
          Slots
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
