export type RoomStatus = "lobby" | "active" | "ended";

export type Room = {
  id: string;
  code: string;
  name: string;
  password_hash: string;
  host_pin_hash: string;
  status: RoomStatus;
  created_at: string;
};

export type Dare = {
  id: string;
  room_id: string;
  text: string;
  points: number;
  created_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  name: string;
  is_host: boolean;
  current_dare_id: string | null;
  created_at: string;
};

export type Submission = {
  id: string;
  room_id: string;
  player_id: string;
  dare_id: string | null;
  dare_text: string;
  points: number;
  photo_path: string;
  status: "approved" | "rejected";
  created_at: string;
};

export type LeaderboardRow = {
  id: string;
  name: string;
  isHost: boolean;
  points: number;
  completed: number;
  rank: number;
};

export type FormState = { error?: string } | undefined;
