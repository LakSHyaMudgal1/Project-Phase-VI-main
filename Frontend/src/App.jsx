import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import appStore from "./utils/appStore";
import { GlobalSearchProvider } from "./context/SearchContext";
import GlobalSearchOverlay from "./Components/Search/GlobalSearchOverlay";
import SearchPreviewModal from "./Components/Search/SearchPreviewModal";
import Body from "./Components/Body";
import Home from "./Components/Home";
import Login from "./Components/Login";
import CreateRoom from "./Components/CreateRoom";
import RoomWrapper from "./Components/RoomWrapper";
import Invites from "./Components/Invites";
import Profile from "./Components/Profile";
import Analytics from "./Components/Analytics";
import Yesterday from "./Components/Yesterday";
import SearchPage from "./Components/Search/SearchPage";
import Timetable from "./Components/Timetable";
import AdminPanel from "./Components/AdminPanel";

function App() {
  return (
    // GlobalSearchProvider is the outermost wrapper so the keyboard listener
    // and search state are available everywhere, including the overlay portals.
    <GlobalSearchProvider>
      <Provider store={appStore}>
        <BrowserRouter basename="/">
          <Routes>
            <Route path="/" element={<Body />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="profile" element={<Profile />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="yesterday" element={<Yesterday />} />
              <Route path="create-room" element={<CreateRoom />} />
              <Route path="room/:roomId" element={<RoomWrapper />} />
              <Route path="invites" element={<Invites />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="timetable" element={<Timetable />} />
              <Route path="admin" element={<AdminPanel />} />
            </Route>
          </Routes>
        </BrowserRouter>

        {/*
          Overlay and preview modal are mounted OUTSIDE BrowserRouter but
          INSIDE GlobalSearchProvider so they have context access.
          They use React Portals (render into document.body) so their DOM
          position here doesn't matter — they float above everything.
        */}
        <GlobalSearchOverlay />
        <SearchPreviewModal />
      </Provider>
    </GlobalSearchProvider>
  );
}

export default App;
