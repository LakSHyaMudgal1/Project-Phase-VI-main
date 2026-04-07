import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import appStore from "./utils/appStore";
import Body from "./Components/Body";
import Home from "./Components/Home";
import Login from "./Components/Login";
import CreateRoom from "./Components/CreateRoom";
import RoomWrapper from "./Components/RoomWrapper";
import Invites from "./Components/Invites";
import Profile from "./Components/Profile";
import Analytics from "./Components/Analytics";
import Yesterday from "./Components/Yesterday";


function App() {
  return (
    <Provider store={appStore}>
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={<Body/>}>
        <Route index element={<Home/>}/>
        <Route path="login" element={<Login/>} />
        <Route path="profile" element={<Profile/>} />
        <Route path="analytics" element={<Analytics/>} />
        <Route path="yesterday" element={<Yesterday/>} />
        <Route path="create-room" element={<CreateRoom />} />
        <Route path="room/:roomId" element={<RoomWrapper />} />
        <Route path="invites" element={<Invites />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </Provider>
  )
}

export default App
