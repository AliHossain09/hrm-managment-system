import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ReactApp from './ReactApp.jsx';
import '../css/app.css';

createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ReactApp />
        </BrowserRouter>
    </React.StrictMode>,
);

