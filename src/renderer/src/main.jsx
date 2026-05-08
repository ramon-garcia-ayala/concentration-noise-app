import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Widget from './components/Widget'
import './index.css'

const isWidget = window.location.hash === '#/widget'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isWidget ? <Widget /> : <App />}
  </React.StrictMode>
)
