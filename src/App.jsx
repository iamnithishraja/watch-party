import { Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import RoomPlaceholder from './pages/RoomPlaceholder.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/room/:roomId" element={<RoomPlaceholder />} />
    </Routes>
  );
}

export default App;
