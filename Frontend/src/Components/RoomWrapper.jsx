// RoomWrapper.jsx
import { useParams } from "react-router-dom";
import Room from "./Room";

const RoomWrapper = () => {
  const { roomId } = useParams();
  return <Room roomId={roomId} />;
};

export default RoomWrapper;